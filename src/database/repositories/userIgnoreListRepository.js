import prisma from '../prisma.js';

export class UserIgnoreListRepository {
  async findByGuildAndUser(guildId, userId) {
    return await prisma.userIgnoreList.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    });
  }

  async isUserIgnored(guildId, userId) {
    const record = await this.findByGuildAndUser(guildId, userId);
    return record?.ignored ?? false;
  }

  async toggleIgnore(guildId, userId) {
    const existing = await this.findByGuildAndUser(guildId, userId);
    
    if (existing) {
      return await prisma.userIgnoreList.update({
        where: {
          guildId_userId: {
            guildId,
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
          userId,
          ignored: true,
        },
      });
    }
  }

  async setIgnoreStatus(guildId, userId, ignored) {
    return await prisma.userIgnoreList.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      update: {
        ignored,
      },
      create: {
        guildId,
        userId,
        ignored,
      },
    });
  }

  async delete(guildId, userId) {
    return await prisma.userIgnoreList.delete({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    });
  }
}

export default new UserIgnoreListRepository();
