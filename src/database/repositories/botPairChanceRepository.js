import prisma from '../prisma.js';

export default {
  async getMatrix(guildId) {
    const rows = await prisma.botPairChance.findMany({ where: { guildId } });
    const matrix = {};
    for (const row of rows) {
      if (!matrix[row.speakerBotId]) matrix[row.speakerBotId] = {};
      matrix[row.speakerBotId][row.targetBotId] = row.chance;
    }
    return matrix;
  },

  async setPair(guildId, speakerBotId, targetBotId, chance) {
    if (!guildId || typeof guildId !== 'string') {
      throw new Error('setPair: guildId is required (non-empty string)');
    }
    if (!speakerBotId || typeof speakerBotId !== 'string') {
      throw new Error('setPair: speakerBotId is required (non-empty string)');
    }
    if (!targetBotId || typeof targetBotId !== 'string') {
      throw new Error('setPair: targetBotId is required (non-empty string)');
    }
    if (speakerBotId === targetBotId) {
      throw new Error(
        `setPair: speakerBotId and targetBotId must differ (got "${speakerBotId}" for both) — self-pair is not allowed`
      );
    }
    if (!Number.isInteger(chance) || chance < 0 || chance > 100) {
      throw new Error(
        `setPair: chance must be an integer 0-100 (got ${chance})`
      );
    }

    return prisma.botPairChance.upsert({
      where: {
        guildId_speakerBotId_targetBotId: { guildId, speakerBotId, targetBotId },
      },
      create: { guildId, speakerBotId, targetBotId, chance },
      update: { chance },
    });
  },

  async getPairChance(guildId, speakerBotId, targetBotId) {
    if (speakerBotId === targetBotId) return 0;
    const row = await prisma.botPairChance.findUnique({
      where: {
        guildId_speakerBotId_targetBotId: { guildId, speakerBotId, targetBotId },
      },
      select: { chance: true },
    });
    return row?.chance ?? 0;
  },

  async deleteAllForBot(botId) {
    return prisma.botPairChance.deleteMany({
      where: {
        OR: [{ speakerBotId: botId }, { targetBotId: botId }],
      },
    });
  },

  async deleteAllForGuild(guildId) {
    return prisma.botPairChance.deleteMany({ where: { guildId } });
  },
};
