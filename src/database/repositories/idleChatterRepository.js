import prisma from '../prisma.js';

const HARD_GUILD_HOURLY_CAP = 20;

export class IdleChatterRepository {
  async listForGuild(guildId) {
    return prisma.idleChatterConfig.findMany({
      where: { guildId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listAllEnabled() {
    return prisma.idleChatterConfig.findMany({
      where: { enabled: true },
    });
  }

  async getOne(guildId, botId, channelId) {
    return prisma.idleChatterConfig.findUnique({
      where: { guildId_botId_channelId: { guildId, botId, channelId } },
    });
  }

  async upsert({
    guildId,
    botId,
    channelId,
    enabled = true,
    idleMinutes = 30,
    maxPerHour = 2,
    topicHint = '',
  }) {
    if (!guildId || !botId || !channelId) {
      throw new Error('upsert: guildId, botId, channelId are required');
    }
    if (!Number.isInteger(idleMinutes) || idleMinutes < 5 || idleMinutes > 1440) {
      throw new Error('idleMinutes must be an integer between 5 and 1440');
    }
    if (!Number.isInteger(maxPerHour) || maxPerHour < 1 || maxPerHour > 10) {
      throw new Error('maxPerHour must be an integer between 1 and 10');
    }
    if (typeof topicHint !== 'string') {
      throw new Error('topicHint must be a string');
    }
    if (topicHint.length > 500) {
      throw new Error('topicHint is too long (max 500 chars)');
    }

    return prisma.idleChatterConfig.upsert({
      where: { guildId_botId_channelId: { guildId, botId, channelId } },
      create: { guildId, botId, channelId, enabled, idleMinutes, maxPerHour, topicHint },
      update: { enabled, idleMinutes, maxPerHour, topicHint },
    });
  }

  async delete(guildId, botId, channelId) {
    try {
      return await prisma.idleChatterConfig.delete({
        where: { guildId_botId_channelId: { guildId, botId, channelId } },
      });
    } catch (err) {
      if (err && err.code === 'P2025') return null;
      throw err;
    }
  }
}

export const HARD_GUILD_CAP_PER_HOUR = HARD_GUILD_HOURLY_CAP;
export default new IdleChatterRepository();
