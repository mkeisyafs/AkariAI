import { Router } from 'express';
import { REST } from 'discord.js';
import botRepository from '../../../database/repositories/botRepository.js';
import botPairChanceRepository from '../../../database/repositories/botPairChanceRepository.js';
import botManager from '../../../services/botManager.js';
import prisma from '../../../database/prisma.js';
import { safeLog } from '../../../utils/encryption.js';
import { logger } from '../../../utils/logger.js';
import { requireGlobalAdmin } from '../../middleware/globalAdmin.js';

const router = Router();
router.use(requireGlobalAdmin);

const SNOWFLAKE_RE = /^[0-9]{15,20}$/;
const MIN_TOKEN_LEN = 50;
const FORBIDDEN_UPDATE_KEYS = ['token', 'aiApiKey', 'encryptedToken', 'encryptedApiKey'];
const UPDATE_WHITELIST = new Set([
  'name',
  'aiBaseUrl',
  'aiModel',
  'aiPersonality',
  'aiMaxTokens',
  'aiContextMessages',
]);

function logServerError(route, err, extra = {}) {
  const scrubbed = {};
  for (const [k, v] of Object.entries(extra)) {
    scrubbed[k] = typeof v === 'string' ? safeLog(v) : v;
  }
  logger.error('admin.bots.error', {
    route,
    error: err && err.message ? safeLog(err.message) : 'unknown',
    ...scrubbed,
  });
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function validateTokenShape(token) {
  if (!token || typeof token !== 'string') return 'token is required (string)';
  if (token.length < MIN_TOKEN_LEN) return `token too short (min ${MIN_TOKEN_LEN} chars)`;
  return null;
}

async function validateTokenAgainstDiscord(token) {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    const me = await rest.get('/users/@me');
    return { ok: true, user: me };
  } catch (err) {
    const status = err?.status || err?.httpStatus || null;
    const rejected = status === 401 || status === 403 || /401|unauthor/i.test(err?.message || '');
    if (rejected) {
      return { ok: false, reason: 'Discord rejected token' };
    }
    return { ok: false, reason: 'Failed to reach Discord to validate token', transient: true };
  }
}

router.get('/', async (req, res) => {
  try {
    const bots = await botRepository.listBots({ includeDisabled: true });
    return res.status(200).json(bots);
  } catch (err) {
    logServerError('GET /', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name,
      discordAppId,
      token,
      aiBaseUrl,
      aiModel,
      aiApiKey,
      aiPersonality,
      aiMaxTokens,
      aiContextMessages,
    } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return badRequest(res, 'name is required (non-empty string)');
    }
    if (!discordAppId || typeof discordAppId !== 'string' || !SNOWFLAKE_RE.test(discordAppId)) {
      return badRequest(res, 'discordAppId must be a Discord snowflake (15-20 digits)');
    }
    const tokenErr = validateTokenShape(token);
    if (tokenErr) return badRequest(res, tokenErr);

    const validation = await validateTokenAgainstDiscord(token);
    if (!validation.ok) {
      return res.status(validation.transient ? 503 : 400).json({ error: validation.reason });
    }
    if (validation.user?.bot !== true) {
      return badRequest(res, 'Token belongs to a user, not a bot');
    }

    const createArgs = { name: name.trim(), discordAppId, token };
    if (typeof aiBaseUrl === 'string') createArgs.aiBaseUrl = aiBaseUrl;
    if (typeof aiModel === 'string') createArgs.aiModel = aiModel;
    if (typeof aiApiKey === 'string' && aiApiKey.length > 0) createArgs.aiApiKey = aiApiKey;
    if (typeof aiPersonality === 'string') createArgs.aiPersonality = aiPersonality;
    if (Number.isInteger(aiMaxTokens)) createArgs.aiMaxTokens = aiMaxTokens;
    if (Number.isInteger(aiContextMessages)) createArgs.aiContextMessages = aiContextMessages;

    const bot = await botRepository.createBot(createArgs);

    logger.info('admin.bot.created', {
      botId: bot.id,
      name: bot.name,
      discordAppId: bot.discordAppId,
    });

    Promise.resolve()
      .then(() => botManager.connectBot(bot.id))
      .catch((err) => logServerError('POST / (connectBot)', err, { botId: bot.id }));

    return res.status(201).json(bot);
  } catch (err) {
    logServerError('POST /', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await botRepository.getBotById(id);
    if (!existing) return res.status(404).json({ error: 'Bot not found' });

    const body = req.body || {};
    for (const key of FORBIDDEN_UPDATE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        return badRequest(res, 'use /token or /api-key endpoints for secret rotation');
      }
    }

    const patch = {};
    for (const [k, v] of Object.entries(body)) {
      if (UPDATE_WHITELIST.has(k)) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return badRequest(res, 'no updatable fields provided');
    }
    if (patch.name !== undefined && (typeof patch.name !== 'string' || !patch.name.trim())) {
      return badRequest(res, 'name must be a non-empty string');
    }
    if (patch.aiMaxTokens !== undefined && !Number.isInteger(patch.aiMaxTokens)) {
      return badRequest(res, 'aiMaxTokens must be an integer');
    }
    if (patch.aiContextMessages !== undefined && !Number.isInteger(patch.aiContextMessages)) {
      return badRequest(res, 'aiContextMessages must be an integer');
    }

    const updated = await botRepository.updateBot(id, patch);
    logger.info('admin.bot.updated', {
      botId: id,
      fields: Object.keys(patch),
    });
    return res.status(200).json(updated);
  } catch (err) {
    logServerError('PUT /:id', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id/token', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await botRepository.getBotById(id);
    if (!existing) return res.status(404).json({ error: 'Bot not found' });

    const { newToken } = req.body || {};
    const tokenErr = validateTokenShape(newToken);
    if (tokenErr) return badRequest(res, tokenErr);

    const validation = await validateTokenAgainstDiscord(newToken);
    if (!validation.ok) {
      return res.status(validation.transient ? 503 : 400).json({ error: validation.reason });
    }
    if (validation.user?.bot !== true) {
      return badRequest(res, 'Token belongs to a user, not a bot');
    }

    await botRepository.updateBot(id, { token: newToken });
    await botManager.restartBot(id);

    logger.info('admin.bot.token.rotated', { botId: id });

    return res.status(200).json({ ok: true, status: botManager.getStatus(id) });
  } catch (err) {
    logServerError('PUT /:id/token', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id/api-key', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await botRepository.getBotById(id);
    if (!existing) return res.status(404).json({ error: 'Bot not found' });

    const { newApiKey } = req.body || {};
    if (newApiKey !== null && (typeof newApiKey !== 'string' || newApiKey.length === 0)) {
      return badRequest(res, 'newApiKey must be a non-empty string or null');
    }

    await botRepository.updateBot(id, { aiApiKey: newApiKey });
    logger.info('admin.bot.api_key.rotated', { botId: id, cleared: newApiKey === null });
    return res.status(204).send();
  } catch (err) {
    logServerError('PUT /:id/api-key', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await botRepository.getBotById(id);
    if (!existing) return res.status(404).json({ error: 'Bot not found' });

    try {
      await botManager.disconnectBot(id);
    } catch (err) {
      logServerError('DELETE /:id (disconnect)', err, { botId: id });
    }

    await prisma.$transaction([
      prisma.knowledge.updateMany({ where: { botId: id }, data: { botId: null } }),
      prisma.userIgnoreList.updateMany({ where: { botId: id }, data: { botId: null } }),
      prisma.userWarning.updateMany({ where: { botId: id }, data: { botId: null } }),
      prisma.moderationLog.updateMany({ where: { botId: id }, data: { botId: null } }),
      prisma.botPairChance.deleteMany({
        where: { OR: [{ speakerBotId: id }, { targetBotId: id }] },
      }),
      prisma.bot.delete({ where: { id } }),
    ]);

    logger.info('admin.bot.deleted', { botId: id });

    return res.status(204).send();
  } catch (err) {
    logServerError('DELETE /:id', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/restart', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await botRepository.getBotById(id);
    if (!existing) return res.status(404).json({ error: 'Bot not found' });

    await botManager.restartBot(id);
    logger.info('admin.bot.restarted', { botId: id });
    return res.status(200).json({ ok: true, status: botManager.getStatus(id) });
  } catch (err) {
    logServerError('POST /:id/restart', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
