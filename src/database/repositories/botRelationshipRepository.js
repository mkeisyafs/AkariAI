import prisma from '../prisma.js';

const MAX_RELATIONSHIP_LENGTH = 2000;

function normalize(text) {
  if (text === null || text === undefined) return null;
  if (typeof text !== 'string') {
    throw new Error('relationship must be a string');
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_RELATIONSHIP_LENGTH) {
    throw new Error(`relationship is too long (max ${MAX_RELATIONSHIP_LENGTH} chars)`);
  }
  return trimmed;
}

export class BotRelationshipRepository {
  async listForGuild(guildId) {
    return prisma.botRelationship.findMany({
      where: { guildId },
      orderBy: [{ fromBotId: 'asc' }, { toBotId: 'asc' }],
    });
  }

  async listFromBot(guildId, fromBotId) {
    return prisma.botRelationship.findMany({
      where: { guildId, fromBotId },
      orderBy: { toBotId: 'asc' },
    });
  }

  async getOne(guildId, fromBotId, toBotId) {
    return prisma.botRelationship.findUnique({
      where: { guildId_fromBotId_toBotId: { guildId, fromBotId, toBotId } },
    });
  }

  async upsert(guildId, fromBotId, toBotId, relationship) {
    if (fromBotId === toBotId) {
      throw new Error('fromBotId and toBotId must differ');
    }
    const text = normalize(relationship);
    if (text === null) {
      try {
        await prisma.botRelationship.delete({
          where: { guildId_fromBotId_toBotId: { guildId, fromBotId, toBotId } },
        });
      } catch (err) {
        if (err && err.code !== 'P2025') throw err;
      }
      return null;
    }
    return prisma.botRelationship.upsert({
      where: { guildId_fromBotId_toBotId: { guildId, fromBotId, toBotId } },
      create: { guildId, fromBotId, toBotId, relationship: text },
      update: { relationship: text },
    });
  }

  async delete(guildId, fromBotId, toBotId) {
    try {
      return await prisma.botRelationship.delete({
        where: { guildId_fromBotId_toBotId: { guildId, fromBotId, toBotId } },
      });
    } catch (err) {
      if (err && err.code === 'P2025') return null;
      throw err;
    }
  }
}

export default new BotRelationshipRepository();
