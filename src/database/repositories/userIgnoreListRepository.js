import prisma from '../prisma.js';

export class UserIgnoreListRepository {
  async findByGuildAndUser(guildId, botId, userId) {
    return await prisma.userIgnoreList.findUnique({
      where: {
        guildId_botId_userId: {
          guildId,
          botId,
          userId,
        },
      },
    });
  }

  async isUserIgnored(guildId, botId, userId) {
    const record = await this.findByGuildAndUser(guildId, botId, userId);
    return record?.ignored ?? false;
  }

  async toggleIgnore(guildId, botId, userId) {
    const existing = await this.findByGuildAndUser(guildId, botId, userId);

    if (existing) {
      return await prisma.userIgnoreList.update({
        where: {
          guildId_botId_userId: {
            guildId,
            botId,
            userId,
          },
        },
        data: {
          ignored: !existing.ignored,
        },
      });
    } else {
      return await prisma.userIgnoreList.create({
        data: {
          guildId,
          botId,
          userId,
          ignored: true,
        },
      });
    }
  }

  async setIgnoreStatus(guildId, botId, userId, ignored) {
    return await prisma.userIgnoreList.upsert({
      where: {
        guildId_botId_userId: {
          guildId,
          botId,
          userId,
        },
      },
      update: {
        ignored,
      },
      create: {
        guildId,
        botId,
        userId,
        ignored,
      },
    });
  }

  async delete(guildId, botId, userId) {
    return await prisma.userIgnoreList.delete({
      where: {
        guildId_botId_userId: {
          guildId,
          botId,
          userId,
        },
      },
    });
  }
}

export default new UserIgnoreListRepository();
