import prisma from '../prisma.js';

const botPublicSelect = {
  id: true,
  name: true,
  discordAppId: true,
  discordBotUserId: true,
  aiBaseUrl: true,
  aiModel: true,
  aiPersonality: true,
  aiMaxTokens: true,
  aiContextMessages: true,
  status: true,
};

const DEFAULT_RESPONSE_CHANCE = 100;
const DEFAULT_COOLDOWN_MS = 3000;
const DEFAULT_REPLY_ONLY_MODE = false;

export default {
  async getForGuild(guildId) {
    const rows = await prisma.guildBotSettings.findMany({
      where: { guildId },
      include: { bot: { select: botPublicSelect } },
    });
    return rows.sort((a, b) => a.bot.name.localeCompare(b.bot.name));
  },

  async getOne(guildId, botId) {
    return prisma.guildBotSettings.findUnique({
      where: { guildId_botId: { guildId, botId } },
      include: { bot: { select: botPublicSelect } },
    });
  },

  async upsert(guildId, botId, patch = {}) {
    return prisma.guildBotSettings.upsert({
      where: { guildId_botId: { guildId, botId } },
      create: { guildId, botId, ...patch },
      update: patch,
    });
  },

  async listGuildsForBot(botId) {
    return prisma.guildBotSettings.findMany({ where: { botId } });
  },

  async getEnabledGuildIdsForBot(botId) {
    const rows = await prisma.guildBotSettings.findMany({
      where: { botId, enabled: true },
      select: { guildId: true },
      distinct: ['guildId'],
    });
    return rows.map((r) => r.guildId);
  },

  async resolveEffectiveConfig(guildId, botId) {
    const row = await prisma.guildBotSettings.findUnique({
      where: { guildId_botId: { guildId, botId } },
      include: { bot: { select: botPublicSelect } },
    });
    if (!row) return null;

    const { bot } = row;

    return {
      botId: bot.id,
      guildId: row.guildId,
      botName: bot.name,
      botStatus: bot.status,
      discordAppId: bot.discordAppId,
      discordBotUserId: bot.discordBotUserId,

      aiBaseUrl: bot.aiBaseUrl,
      aiModel: bot.aiModel,
      aiPersonality: row.personalityOverride ?? bot.aiPersonality,
      aiMaxTokens: bot.aiMaxTokens,
      aiContextMessages: bot.aiContextMessages,

      enabled: row.enabled,
      responseChance: row.responseChance ?? DEFAULT_RESPONSE_CHANCE,
      cooldownMs: row.cooldownMs ?? DEFAULT_COOLDOWN_MS,
      replyOnlyMode: row.replyOnlyMode ?? DEFAULT_REPLY_ONLY_MODE,
      allowedChannels: row.allowedChannels,

      botToBotEnabled: row.botToBotEnabled,
      maxChainDepth: row.maxChainDepth,
      channelCooldownMs: row.channelCooldownMs,
      circuitBreakerCount: row.circuitBreakerCount,
      circuitBreakerWindowMs: row.circuitBreakerWindowMs,
      circuitBreakerPauseMs: row.circuitBreakerPauseMs,
      mentionBypassMatrix: row.mentionBypassMatrix,
    };
  },
};
