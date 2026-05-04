import axios from 'axios';
import NodeCache from 'node-cache';
import { knowledgeService } from './knowledgeService.js';
import conversationHistoryRepository from '../database/repositories/conversationHistoryRepository.js';

const cache = new NodeCache({ stdTTL: 300 });

export async function generateAIResponse(userMessage, config, channelId, userId, username, knowledgeContext = null) {
  try {
    let systemContent = config.aiPersonality;

    if (knowledgeContext) {
      systemContent += '\n\n' + knowledgeContext;
    }

    const contextLimit = config.aiContextMessages || 10;
    const recentMessages = await conversationHistoryRepository.getRecentMessages(channelId, contextLimit);

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

    messages.push({
      role: 'user',
      content: `${username}: ${userMessage}`,
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

    await conversationHistoryRepository.addMessage(
      config.guildId,
      channelId,
      userId,
      username,
      'user',
      userMessage
    );

    await conversationHistoryRepository.addMessage(
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

export async function generateAIResponseWithKnowledge(userMessage, config, channelId, userId, username) {
  const allKnowledge = await knowledgeService.getAllKnowledge(config.guildId);
  const knowledgeContext = knowledgeService.buildKnowledgeContext(allKnowledge);

  return generateAIResponse(userMessage, config, channelId, userId, username, knowledgeContext);
}

export async function clearChannelContext(channelId) {
  return await conversationHistoryRepository.clearChannelHistory(channelId);
}
