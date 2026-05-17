import axios from 'axios';
import NodeCache from 'node-cache';
import { knowledgeService } from './knowledgeService.js';
import conversationHistoryRepository from '../database/repositories/conversationHistoryRepository.js';
import botRelationshipRepository from '../database/repositories/botRelationshipRepository.js';
import botRepository from '../database/repositories/botRepository.js';

const cache = new NodeCache({ stdTTL: 300 });

async function buildRelationshipContext(guildId, botId) {
  if (!guildId || !botId) return null;
  const rels = await botRelationshipRepository.listFromBot(guildId, botId);
  if (rels.length === 0) return null;

  const targetIds = [...new Set(rels.map((r) => r.toBotId))];
  const targetBots = await Promise.all(targetIds.map((id) => botRepository.getBotById(id)));
  const nameById = new Map();
  targetBots.forEach((b) => {
    if (b) nameById.set(b.id, b.name);
  });

  const lines = rels
    .map((r) => {
      const name = nameById.get(r.toBotId);
      if (!name) return null;
      return `- ${name}: ${r.relationship}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return null;
  return `Other bots in this server, and how you relate to them:\n${lines.join('\n')}`;
}

export async function generateAIResponse(userMessage, config, context) {
  const {
    botId = null,
    client = null,
    channelId,
    userId,
    username,
    knowledgeContext = null,
    senderIsOurBot = false,
    senderBotName = null,
  } = context || {};

  try {
    let systemContent = config.aiPersonality;

    const relationshipContext = await buildRelationshipContext(config.guildId, botId);
    if (relationshipContext) {
      systemContent += '\n\n' + relationshipContext;
    }

    if (knowledgeContext) {
      systemContent += '\n\n' + knowledgeContext;
    }

    const contextLimit = config.aiContextMessages || 10;
    const recentMessages = await conversationHistoryRepository.getRecentMessages(botId, channelId, contextLimit);

    const messages = [
      {
        role: 'system',
        content: systemContent,
      }
    ];

    recentMessages.reverse().forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.role === 'user' ? `${msg.username}: ${msg.content}` : msg.content,
      });
    });

    const currentUserContent = senderIsOurBot && senderBotName
      ? `[${senderBotName}]: ${userMessage}`
      : `${username}: ${userMessage}`;

    messages.push({
      role: 'user',
      content: currentUserContent,
    });

    if (!config.aiApiKey || typeof config.aiApiKey !== 'string' || !config.aiApiKey.trim()) {
      console.error(`AI API Error: bot has no API key configured (botId=${botId}). Use the admin UI "Rotate API Key" button to set one, or set DEFAULT_AI_API_KEY in .env before re-running migrate:multi-bot on a fresh DB.`);
      return null;
    }
    if (!config.aiBaseUrl || !config.aiModel) {
      console.error(`AI API Error: bot is missing aiBaseUrl or aiModel (botId=${botId}). Edit the bot in the admin UI.`);
      return null;
    }

    const response = await axios.post(
      `${config.aiBaseUrl}/chat/completions`,
      {
        model: config.aiModel,
        messages: messages,
        max_tokens: config.aiMaxTokens || 1000,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.aiApiKey}`,
        },
        timeout: 30000,
      }
    );

    const choice = response.data?.choices?.[0];
    const aiResponse = choice?.message?.content;
    if (typeof aiResponse !== 'string' || aiResponse.length === 0) {
      const preview = JSON.stringify(response.data).slice(0, 500);
      console.error(
        `AI API Error: provider returned no choices[0].message.content (botId=${botId}, baseUrl=${config.aiBaseUrl}, model=${config.aiModel}). Body preview: ${preview}`
      );
      return null;
    }

    if (senderIsOurBot && senderBotName) {
      await conversationHistoryRepository.addCrossBotMessage(
        botId,
        config.guildId,
        channelId,
        userId,
        senderBotName,
        userMessage
      );
    } else {
      await conversationHistoryRepository.addMessage(
        botId,
        config.guildId,
        channelId,
        userId,
        username,
        'user',
        userMessage
      );
    }

    await conversationHistoryRepository.addMessage(
      botId,
      config.guildId,
      channelId,
      'bot',
      'Assistant',
      'assistant',
      aiResponse
    );

    return aiResponse;
  } catch (error) {
    const status = error.response?.status;
    const body = error.response?.data;
    const detail = body
      ? JSON.stringify(body).slice(0, 500)
      : error.message || String(error);
    console.error(
      `AI API Error: ${status ? `HTTP ${status} ` : ''}botId=${botId} baseUrl=${config?.aiBaseUrl} model=${config?.aiModel} — ${detail}`
    );
    return null;
  }
}

export async function generateAIResponseWithKnowledge(userMessage, config, context) {
  const allKnowledge = await knowledgeService.getAllKnowledge(config.guildId, context.botId);
  const knowledgeContext = knowledgeService.buildKnowledgeContext(allKnowledge);

  return generateAIResponse(userMessage, config, { ...context, knowledgeContext });
}

export async function generateOpener(config, { botId, targetBotName, topic }) {
  if (!targetBotName) throw new Error('generateOpener: targetBotName is required');
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    throw new Error('generateOpener: topic is required');
  }

  try {
    let systemContent = config.aiPersonality;

    const relationshipContext = await buildRelationshipContext(config.guildId, botId);
    if (relationshipContext) systemContent += '\n\n' + relationshipContext;

    const allKnowledge = await knowledgeService.getAllKnowledge(config.guildId, botId);
    const knowledgeContext = knowledgeService.buildKnowledgeContext(allKnowledge);
    if (knowledgeContext) systemContent += '\n\n' + knowledgeContext;

    systemContent +=
      `\n\nYou are about to speak to ${targetBotName} in a public channel. ` +
      `Open the conversation in 1-2 short sentences. Stay in character. ` +
      `Address ${targetBotName} naturally; you may use their name. ` +
      `Do not narrate stage directions or explain yourself. Topic: ${topic.trim()}`;

    if (!config.aiApiKey || !config.aiBaseUrl || !config.aiModel) {
      console.error(
        `generateOpener: bot is missing aiApiKey/aiBaseUrl/aiModel (botId=${botId}).`
      );
      return null;
    }

    const response = await axios.post(
      `${config.aiBaseUrl}/chat/completions`,
      {
        model: config.aiModel,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: `Open the conversation about: ${topic.trim()}` },
        ],
        max_tokens: Math.min(config.aiMaxTokens || 1000, 400),
        temperature: 0.9,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.aiApiKey}`,
        },
        timeout: 30000,
      }
    );

    const text = response.data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text.trim().length === 0) {
      console.error(
        `generateOpener: provider returned no content (botId=${botId}). Body: ${JSON.stringify(response.data).slice(0, 500)}`
      );
      return null;
    }
    return text.trim();
  } catch (error) {
    const status = error.response?.status;
    const body = error.response?.data;
    const detail = body
      ? JSON.stringify(body).slice(0, 500)
      : error.message || String(error);
    console.error(
      `generateOpener AI API Error: ${status ? `HTTP ${status} ` : ''}botId=${botId} — ${detail}`
    );
    return null;
  }
}

export async function clearChannelContext(botId, channelId) {
  return await conversationHistoryRepository.clearChannelHistory(botId, channelId);
}
