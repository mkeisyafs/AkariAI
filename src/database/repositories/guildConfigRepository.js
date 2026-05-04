import prisma from '../prisma.js';

export class GuildConfigRepository {
  async findByGuildId(guildId) {
    return await prisma.guildConfig.findUnique({
      where: { guildId },
    });
  }

  async create(guildId, data = {}) {
    return await prisma.guildConfig.create({
      data: {
        guildId,
        ...data,
      },
    });
  }

  async upsert(guildId, data) {
    return await prisma.guildConfig.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        ...data,
      },
    });
  }

  async update(guildId, data) {
    return await prisma.guildConfig.update({
      where: { guildId },
      data,
    });
  }

  async delete(guildId) {
    return await prisma.guildConfig.delete({
      where: { guildId },
    });
  }

  async findAll() {
    return await prisma.guildConfig.findMany();
  }
}

export default new GuildConfigRepository();
