import { Router } from 'express';
import botRepository from '../../database/repositories/botRepository.js';
import guildBotSettingsRepository from '../../database/repositories/guildBotSettingsRepository.js';
import botManager from '../../services/botManager.js';
import { deployBotCommandsToGuild } from '../../services/slashCommandDeployer.js';
import { requireGuildAdmin } from '../middleware/guildAdmin.js';

const router = Router({ mergeParams: true });

router.use(requireGuildAdmin);

// Whitelist guards blind upsert of arbitrary fields (including FK/system columns
// and per-guild override values callers shouldn't be able to set). Any key not
// in this set is silently dropped from the patch before it reaches Prisma.
const UPDATE_WHITELIST = new Set([
  'enabled',
  'personalityOverride',
  'responseChance',
  'cooldownMs',
  'replyOnlyMode',
  'allowedChannels',
  'botToBotEnabled',
  'maxChainDepth',
  'channelCooldownMs',
  'circuitBreakerCount',
  'circuitBreakerWindowMs',
  'circuitBreakerPauseMs',
  'mentionBypassMatrix',
]);

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function validateIntRange(value, { min, max, nullable = false }) {
  if (value === null || value === undefined) return nullable ? { ok: true, value: null } : { ok: false };
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return { ok: false };
  return { ok: true, value: n };
}

function validatePatch(raw) {
  const patch = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (!UPDATE_WHITELIST.has(k)) continue;
    patch[k] = v;
  }

  if ('enabled' in patch && typeof patch.enabled !== 'boolean') {
    return { error: 'enabled must be boolean' };
  }
  if ('replyOnlyMode' in patch && patch.replyOnlyMode !== null && typeof patch.replyOnlyMode !== 'boolean') {
    return { error: 'replyOnlyMode must be boolean or null' };
  }
  if ('botToBotEnabled' in patch && typeof patch.botToBotEnabled !== 'boolean') {
    return { error: 'botToBotEnabled must be boolean' };
  }
  if ('mentionBypassMatrix' in patch && typeof patch.mentionBypassMatrix !== 'boolean') {
    return { error: 'mentionBypassMatrix must be boolean' };
  }
  if ('personalityOverride' in patch && patch.personalityOverride !== null && typeof patch.personalityOverride !== 'string') {
    return { error: 'personalityOverride must be string or null' };
  }
  if ('allowedChannels' in patch) {
    if (!Array.isArray(patch.allowedChannels)) return { error: 'allowedChannels must be array of strings' };
    if (!patch.allowedChannels.every((s) => typeof s === 'string')) {
      return { error: 'allowedChannels must be array of strings' };
    }
  }

  const ranges = [
    ['responseChance', { min: 0, max: 100, nullable: true }],
    ['cooldownMs', { min: 0, max: 3_600_000, nullable: true }],
    ['maxChainDepth', { min: 1, max: 100, nullable: false }],
    ['channelCooldownMs', { min: 0, max: 3_600_000, nullable: false }],
    ['circuitBreakerCount', { min: 1, max: 10_000, nullable: false }],
    ['circuitBreakerWindowMs', { min: 1_000, max: 86_400_000, nullable: false }],
    ['circuitBreakerPauseMs', { min: 0, max: 86_400_000, nullable: false }],
  ];
  for (const [key, spec] of ranges) {
    if (!(key in patch)) continue;
    const r = validateIntRange(patch[key], spec);
    if (!r.ok) {
      return { error: `${key} must be integer ${spec.min}-${spec.max}${spec.nullable ? ' or null' : ''}` };
    }
    patch[key] = r.value;
  }

  return { patch };
}

router.get('/', async (req, res) => {
  try {
    const { guildId } = req.params;
    const [allBots, settings] = await Promise.all([
      botRepository.listBots({ includeDisabled: true }),
      guildBotSettingsRepository.getForGuild(guildId),
    ]);
    const settingsByBotId = new Map(settings.map((s) => [s.botId, s]));

    const out = allBots.map((bot) => {
      const client = botManager.getClient(bot.id);
      const presentInGuild = !!client?.guilds?.cache?.get(guildId);
      return {
        bot: {
          id: bot.id,
          name: bot.name,
          discordAppId: bot.discordAppId,
          discordBotUserId: bot.discordBotUserId,
          status: bot.status,
        },
        settings: settingsByBotId.get(bot.id) || null,
        presentInGuild,
      };
    });
    return res.json(out);
  } catch (err) {
    console.error('GET guild bots failed:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:botId', async (req, res) => {
  try {
    const { guildId, botId } = req.params;

    const bot = await botRepository.getBotById(botId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const { patch, error } = validatePatch(req.body);
    if (error) return badRequest(res, error);

    // Bot must be invited to the guild before it can be enabled there —
    // otherwise enable is a silent no-op (no client to deliver messages).
    if (patch.enabled === true) {
      const client = botManager.getClient(botId);
      const guild = client?.guilds?.cache?.get(guildId);
      if (!guild) {
        return res.status(409).json({
          error: 'Bot is not invited to this guild',
          hint: 'Use the Invite link to add the bot first.',
        });
      }
    }

    const updated = await guildBotSettingsRepository.upsert(guildId, botId, patch);
    return res.json(updated);
  } catch (err) {
    console.error('PUT guild bot failed:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:botId/deploy-commands', async (req, res) => {
  try {
    const { guildId, botId } = req.params;
    const bot = await botRepository.getBotById(botId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const result = await deployBotCommandsToGuild(botId, guildId);
    if (result.status === 'failed') {
      return res.status(502).json({ error: 'Deploy failed', detail: result.error });
    }
    return res.json(result);
  } catch (err) {
    console.error('Deploy commands failed:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
