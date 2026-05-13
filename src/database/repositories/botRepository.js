import prisma from '../prisma.js';
import { encrypt, decrypt } from '../../utils/encryption.js';

// SECURITY: encryptedToken / encryptedApiKey must NEVER leak through list/get/create/update.
// publicSelect below is the enforcement boundary — do not bypass with raw findMany/findUnique.
// Plaintext is materialized only by getDecryptedToken / getDecryptedApiKey, per-call, no caching.

const VALID_STATUSES = new Set(['DISABLED', 'ENABLED', 'TOKEN_INVALID', 'UNHEALTHY']);

const publicSelect = {
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
  isMigrated: true,
  createdAt: true,
  updatedAt: true,
};

// Full whitelist including secrets — used ONLY inside the repo, never returned
// through a method whose contract is "no secrets".
const secretsSelect = {
  ...publicSelect,
  encryptedToken: true,
  encryptedApiKey: true,
};

export default {
  async listBots({ includeDisabled = false } = {}) {
    return prisma.bot.findMany({
      where: includeDisabled ? undefined : { status: { not: 'DISABLED' } },
      select: publicSelect,
      orderBy: { name: 'asc' },
    });
  },

  async getBotById(id, { includeSecrets = false } = {}) {
    return prisma.bot.findUnique({
      where: { id },
      select: includeSecrets ? secretsSelect : publicSelect,
    });
  },

  async getBotByAppId(discordAppId) {
    return prisma.bot.findUnique({
      where: { discordAppId },
      select: publicSelect,
    });
  },

  async createBot({
    name,
    discordAppId,
    token,
    aiBaseUrl = '',
    aiModel = '',
    aiApiKey = null,
    aiPersonality = 'You are a helpful and friendly Discord bot assistant.',
    aiMaxTokens = 1000,
    aiContextMessages = 10,
    status = 'DISABLED',
  } = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('createBot: name is required (non-empty string)');
    }
    if (!discordAppId || typeof discordAppId !== 'string') {
      throw new Error('createBot: discordAppId is required (non-empty string)');
    }
    if (!token || typeof token !== 'string') {
      throw new Error('createBot: token is required (non-empty string)');
    }
    if (!VALID_STATUSES.has(status)) {
      throw new Error(
        `createBot: invalid status "${status}" (allowed: ${[...VALID_STATUSES].join(', ')})`
      );
    }

    const encryptedToken = encrypt(token);
    const encryptedApiKey = aiApiKey ? encrypt(aiApiKey) : null;

    return prisma.bot.create({
      data: {
        name,
        discordAppId,
        encryptedToken,
        encryptedApiKey,
        aiBaseUrl,
        aiModel,
        aiPersonality,
        aiMaxTokens,
        aiContextMessages,
        status,
      },
      select: publicSelect,
    });
  },

  async updateBot(id, patch = {}) {
    const data = { ...patch };

    if (Object.prototype.hasOwnProperty.call(data, 'token')) {
      const token = data.token;
      delete data.token;
      if (token !== null && token !== undefined && token !== '') {
        if (typeof token !== 'string') {
          throw new Error('updateBot: token must be a string when provided');
        }
        data.encryptedToken = encrypt(token);
      }
    }

    if (Object.prototype.hasOwnProperty.call(data, 'aiApiKey')) {
      const aiApiKey = data.aiApiKey;
      delete data.aiApiKey;
      if (aiApiKey === null || aiApiKey === '') {
        data.encryptedApiKey = null;
      } else if (aiApiKey !== undefined) {
        if (typeof aiApiKey !== 'string') {
          throw new Error('updateBot: aiApiKey must be a string or null when provided');
        }
        data.encryptedApiKey = encrypt(aiApiKey);
      }
    }

    if (Object.prototype.hasOwnProperty.call(data, 'status')) {
      if (!VALID_STATUSES.has(data.status)) {
        throw new Error(
          `updateBot: invalid status "${data.status}" (allowed: ${[...VALID_STATUSES].join(', ')})`
        );
      }
    }

    return prisma.bot.update({
      where: { id },
      data,
      select: publicSelect,
    });
  },

  async deleteBot(id) {
    await prisma.bot.delete({ where: { id } });
  },

  async getDecryptedToken(id) {
    const row = await prisma.bot.findUnique({
      where: { id },
      select: { encryptedToken: true },
    });
    if (!row) {
      throw new Error(`getDecryptedToken: bot not found (id=${id})`);
    }
    return decrypt(row.encryptedToken);
  },

  async getDecryptedApiKey(id) {
    const row = await prisma.bot.findUnique({
      where: { id },
      select: { encryptedApiKey: true },
    });
    if (!row) {
      throw new Error(`getDecryptedApiKey: bot not found (id=${id})`);
    }
    if (!row.encryptedApiKey) return null;
    return decrypt(row.encryptedApiKey);
  },

  async markBotStatus(id, status) {
    if (!VALID_STATUSES.has(status)) {
      throw new Error(
        `markBotStatus: invalid status "${status}" (allowed: ${[...VALID_STATUSES].join(', ')})`
      );
    }
    return prisma.bot.update({
      where: { id },
      data: { status },
      select: publicSelect,
    });
  },

  async setBotDiscordUserId(id, discordBotUserId) {
    if (!discordBotUserId || typeof discordBotUserId !== 'string') {
      throw new Error('setBotDiscordUserId: discordBotUserId is required (non-empty string)');
    }
    return prisma.bot.update({
      where: { id },
      data: { discordBotUserId },
      select: publicSelect,
    });
  },
};
