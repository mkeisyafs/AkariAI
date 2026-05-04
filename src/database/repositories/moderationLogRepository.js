import prisma from '../prisma.js';

export class ModerationLogRepository {
  async create(data) {
    return await prisma.moderationLog.create({
      data,
    });
  }

  async findByGuildId(guildId, options = {}) {
    const { limit = 50, skip = 0, orderBy = { timestamp: 'desc' } } = options;

    return await prisma.moderationLog.findMany({
      where: { guildId },
      take: limit,
      skip,
      orderBy,
    });
  }

  async findByUserId(guildId, userId, options = {}) {
    const { limit = 50, skip = 0, orderBy = { timestamp: 'desc' } } = options;

    return await prisma.moderationLog.findMany({
      where: {
        guildId,
        userId,
      },
      take: limit,
      skip,
      orderBy,
    });
  }

  async findByAction(guildId, action, options = {}) {
    const { limit = 50, skip = 0, orderBy = { timestamp: 'desc' } } = options;

    return await prisma.moderationLog.findMany({
      where: {
        guildId,
        action,
      },
      take: limit,
      skip,
      orderBy,
    });
  }

  async countByGuildId(guildId) {
    return await prisma.moderationLog.count({
      where: { guildId },
    });
  }

  async countByUserId(guildId, userId) {
    return await prisma.moderationLog.count({
      where: {
        guildId,
        userId,
      },
    });
  }

  async deleteByGuildId(guildId) {
    return await prisma.moderationLog.deleteMany({
      where: { guildId },
    });
  }
}

export default new ModerationLogRepository();
