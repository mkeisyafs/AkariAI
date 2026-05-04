import prisma from '../prisma.js';

export class ConversationHistoryRepository {
  async addMessage(guildId, channelId, userId, username, role, content) {
    return await prisma.conversationHistory.create({
      data: {
        guildId,
        channelId,
        userId,
        username,
        role,
        content,
      },
    });
  }

  async getRecentMessages(channelId, limit = 10) {
    return await prisma.conversationHistory.findMany({
      where: { channelId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async clearChannelHistory(channelId) {
    return await prisma.conversationHistory.deleteMany({
      where: { channelId },
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
