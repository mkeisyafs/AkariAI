import { Router } from 'express';
import { REST, Routes, EmbedBuilder } from 'discord.js';
import reactionRoleRepository from '../../database/repositories/reactionRoleRepository.js';
import botRepository from '../../database/repositories/botRepository.js';
import guildBotSettingsRepository from '../../database/repositories/guildBotSettingsRepository.js';
import { requireGuildAdmin } from '../middleware/guildAdmin.js';
import { logger } from '../../utils/logger.js';

const router = Router({ mergeParams: true });
router.use(requireGuildAdmin);

const SNOWFLAKE_RE = /^[0-9]{15,20}$/;
const CUSTOM_EMOJI_RE = /^<a?:(\w+):(\d+)>$/;
const COLOR = 0x5865f2;

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function parseEmoji(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(CUSTOM_EMOJI_RE);
  if (m) {
    return {
      storage: m[2],
      reactPath: encodeURIComponent(`${m[1]}:${m[2]}`),
      display: trimmed,
    };
  }
  return {
    storage: trimmed,
    reactPath: encodeURIComponent(trimmed),
    display: trimmed,
  };
}

async function getEnabledBotsForGuild(guildId) {
  const settings = await guildBotSettingsRepository.getForGuild(guildId);
  return settings
    .filter((s) => s.enabled && s.bot && s.bot.status === 'ENABLED')
    .map((s) => s.bot);
}

async function ensureBotEnabledInGuild(botId, guildId) {
  const setting = await guildBotSettingsRepository.getOne(guildId, botId);
  if (!setting || !setting.enabled) {
    return { ok: false, reason: 'Bot is not enabled in this guild' };
  }
  if (!setting.bot || setting.bot.status !== 'ENABLED') {
    return { ok: false, reason: 'Bot is disabled globally' };
  }
  return { ok: true };
}

async function restForBot(botId) {
  const bot = await botRepository.getBotById(botId);
  if (!bot) return { error: 'Bot not found' };
  if (!bot.discordAppId) return { error: 'Bot missing discordAppId' };
  const token = await botRepository.getDecryptedToken(botId);
  return { rest: new REST({ version: '10' }).setToken(token), bot };
}

async function loadMessageInGuild(botId, guildId, messageRowId) {
  const messages = await reactionRoleRepository.listMessagesForGuild(botId, guildId);
  return messages.find((m) => m.id === messageRowId) || null;
}

router.get('/bots', async (req, res) => {
  try {
    const { guildId } = req.params;
    const bots = (await getEnabledBotsForGuild(guildId)).map((b) => ({
      id: b.id,
      name: b.name,
      discordAppId: b.discordAppId,
      discordBotUserId: b.discordBotUserId,
    }));
    return res.json({ bots });
  } catch (err) {
    logger.error('reactionRoles.bots.failed', { error: err?.message || String(err) });
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { guildId } = req.params;
    const botId = typeof req.query.botId === 'string' ? req.query.botId : '';
    if (!botId) return badRequest(res, 'botId query param is required');

    const messages = await reactionRoleRepository.listMessagesForGuild(botId, guildId);
    return res.json({ messages });
  } catch (err) {
    logger.error('reactionRoles.list.failed', { error: err?.message || String(err) });
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { botId, channelId, title, description } = req.body || {};
    if (!botId || typeof botId !== 'string') return badRequest(res, 'botId is required');
    if (!channelId || !SNOWFLAKE_RE.test(channelId)) {
      return badRequest(res, 'channelId must be a Discord snowflake');
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return badRequest(res, 'title is required');
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return badRequest(res, 'description is required');
    }

    const enabled = await ensureBotEnabledInGuild(botId, guildId);
    if (!enabled.ok) return res.status(409).json({ error: enabled.reason });

    const ctx = await restForBot(botId);
    if (ctx.error) return res.status(404).json({ error: ctx.error });

    let posted;
    try {
      const embed = new EmbedBuilder()
        .setTitle(title.trim())
        .setDescription(description.trim())
        .setColor(COLOR);
      posted = await ctx.rest.post(Routes.channelMessages(channelId), {
        body: { embeds: [embed.toJSON()] },
      });
    } catch (err) {
      const status = err?.status || err?.httpStatus;
      if (status === 403) {
        return res.status(403).json({
          error: 'Bot lacks Send Messages permission in that channel',
        });
      }
      if (status === 404) {
        return res.status(404).json({ error: 'Channel not found or bot not in guild' });
      }
      logger.error('reactionRoles.create.discord_post_failed', {
        botId,
        guildId,
        channelId,
        error: err?.message || String(err),
      });
      return res.status(502).json({ error: 'Discord rejected the message post' });
    }

    const stored = await reactionRoleRepository.createMessage({
      botId,
      guildId,
      channelId,
      messageId: posted.id,
      title: title.trim(),
      description: description.trim(),
    });

    return res.status(201).json(stored);
  } catch (err) {
    logger.error('reactionRoles.create.failed', { error: err?.message || String(err) });
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const botId = typeof req.query.botId === 'string' ? req.query.botId : '';
    if (!botId) return badRequest(res, 'botId query param is required');

    const target = await loadMessageInGuild(botId, guildId, id);
    if (!target) {
      return res.status(404).json({ error: 'Reaction-role message not found in this guild' });
    }

    const ctx = await restForBot(target.botId);
    if (!ctx.error) {
      try {
        await ctx.rest.delete(Routes.channelMessage(target.channelId, target.messageId));
      } catch {
        void 0;
      }
    }

    await reactionRoleRepository.deleteMessage(id);
    return res.json({ ok: true });
  } catch (err) {
    logger.error('reactionRoles.delete.failed', { error: err?.message || String(err) });
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/bindings', async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const { emoji, roleId, botId } = req.body || {};
    if (!botId || typeof botId !== 'string') return badRequest(res, 'botId is required');
    if (!emoji || typeof emoji !== 'string') return badRequest(res, 'emoji is required');
    if (!roleId || !SNOWFLAKE_RE.test(roleId)) {
      return badRequest(res, 'roleId must be a Discord snowflake');
    }

    const target = await loadMessageInGuild(botId, guildId, id);
    if (!target) {
      return res.status(404).json({ error: 'Reaction-role message not found in this guild' });
    }

    const parsed = parseEmoji(emoji);
    if (!parsed) return badRequest(res, 'invalid emoji');

    const ctx = await restForBot(target.botId);
    if (ctx.error) return res.status(404).json({ error: ctx.error });

    try {
      await ctx.rest.put(
        Routes.channelMessageOwnReaction(target.channelId, target.messageId, parsed.reactPath)
      );
    } catch (err) {
      const status = err?.status || err?.httpStatus;
      if (status === 403) {
        return res.status(403).json({ error: 'Bot lacks Add Reactions permission' });
      }
      if (status === 400) {
        return res.status(400).json({
          error:
            'Discord rejected that emoji. For custom emoji, the bot must share a server with it.',
        });
      }
      logger.error('reactionRoles.binding.discord_react_failed', {
        botId: target.botId,
        guildId,
        error: err?.message || String(err),
      });
      return res.status(502).json({ error: 'Failed to add reaction on Discord' });
    }

    const binding = await reactionRoleRepository.addBinding(target.id, parsed.storage, roleId);
    return res.status(201).json(binding);
  } catch (err) {
    logger.error('reactionRoles.binding.failed', { error: err?.message || String(err) });
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id/bindings/:emoji', async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const emoji = decodeURIComponent(req.params.emoji);
    const botId = typeof req.query.botId === 'string' ? req.query.botId : '';
    if (!botId) return badRequest(res, 'botId query param is required');

    const parsed = parseEmoji(emoji);
    if (!parsed) return badRequest(res, 'invalid emoji');

    const target = await loadMessageInGuild(botId, guildId, id);
    if (!target) {
      return res.status(404).json({ error: 'Reaction-role message not found in this guild' });
    }

    const removed = await reactionRoleRepository.removeBinding(target.id, parsed.storage);

    const ctx = await restForBot(target.botId);
    if (!ctx.error) {
      try {
        await ctx.rest.delete(
          Routes.channelMessageOwnReaction(target.channelId, target.messageId, parsed.reactPath)
        );
      } catch {
        void 0;
      }
    }

    return res.json({ ok: true, removed: !!removed });
  } catch (err) {
    logger.error('reactionRoles.binding.delete.failed', { error: err?.message || String(err) });
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
