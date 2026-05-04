import prisma from '../prisma.js';

export class UserWarningRepository {
  async findByGuildAndUser(guildId, userId) {
    return await prisma.userWarning.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      include: {
        warnings: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });
  }

  async addWarning(guildId, userId, moderatorId, reason) {
    const userWarning = await prisma.userWarning.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      update: {},
      create: {
        guildId,
        userId,
      },
    });

    return await prisma.warning.create({
      data: {
        userWarningId: userWarning.id,
        moderatorId,
        reason,
      },
    });
  }

  async getWarningCount(guildId, userId) {
    const userWarning = await this.findByGuildAndUser(guildId, userId);
    return userWarning?.warnings.length || 0;
  }

  async clearWarnings(guildId, userId) {
    const userWarning = await prisma.userWarning.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    });

    if (!userWarning) {
      return null;
    }

    await prisma.warning.deleteMany({
      where: {
        userWarningId: userWarning.id,
      },
    });

    return userWarning;
  }

  async removeWarning(warningId) {
    return await prisma.warning.delete({
      where: {
        id: warningId,
      },
    });
  }

  async getAllWarningsForGuild(guildId) {
    return await prisma.userWarning.findMany({
      where: { guildId },
      include: {
        warnings: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });
  }
}

export default new UserWarningRepository();
