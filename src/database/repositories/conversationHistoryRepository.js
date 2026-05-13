import prisma from '../prisma.js';

export class ConversationHistoryRepository {
  async addMessage(botId, guildId, channelId, userId, username, role, content) {
    return await prisma.conversationHistory.create({
      data: {
        botId,
        guildId,
        channelId,
        userId,
        username,
        role,
        content,
      },
    });
  }

  async addCrossBotMessage(botId, guildId, channelId, senderBotUserId, senderBotName, content) {
    return await prisma.conversationHistory.create({
      data: {
        botId,
        guildId,
        channelId,
        userId: senderBotUserId,
        username: senderBotName,
        role: 'user',
        content: `[${senderBotName}]: ${content}`,
      },
    });
  }

  async getRecentMessages(botId, channelId, limit) {
    return await prisma.conversationHistory.findMany({
      where: { botId, channelId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async clearChannelHistory(botId, channelId) {
    return await prisma.conversationHistory.deleteMany({
      where: { botId, channelId },
    });
  }

  async clearOldMessages(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await prisma.conversationHistory.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });
  }
}

export default new ConversationHistoryRepository();
