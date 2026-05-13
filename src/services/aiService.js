import axios from 'axios';
import NodeCache from 'node-cache';
import { knowledgeService } from './knowledgeService.js';
import conversationHistoryRepository from '../database/repositories/conversationHistoryRepository.js';

const cache = new NodeCache({ stdTTL: 300 });

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

    const aiResponse = response.data.choices[0].message.content;

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
    console.error('AI API Error:', error.response?.data || error.message);
    return null;
  }
}

export async function generateAIResponseWithKnowledge(userMessage, config, context) {
  const allKnowledge = await knowledgeService.getAllKnowledge(config.guildId, context.botId);
  const knowledgeContext = knowledgeService.buildKnowledgeContext(allKnowledge);

  return generateAIResponse(userMessage, config, { ...context, knowledgeContext });
}

export async function clearChannelContext(botId, channelId) {
  return await conversationHistoryRepository.clearChannelHistory(botId, channelId);
}
