import idleChatterRepository, { HARD_GUILD_CAP_PER_HOUR } from '../database/repositories/idleChatterRepository.js';
import guildBotSettingsRepository from '../database/repositories/guildBotSettingsRepository.js';
import botManager from './botManager.js';
import { getIdleMs, markActive } from './channelActivityTracker.js';
import { isChannelMuted } from './channelMutes.js';
import { countConfigPostsLastHour, countGuildPostsLastHour, recordPost } from './idleRateLimit.js';
import { generateIdleMessage } from './aiService.js';
import { logger } from '../utils/logger.js';

const TICK_INTERVAL_MS = 60_000;
const PER_TICK_GUILD_CAP = 1;

let tickHandle = null;

async function tryFireConfig(config) {
  const { id, guildId, botId, channelId, idleMinutes, maxPerHour, topicHint } = config;

  if (!config.enabled) return false;

  if (isChannelMuted(guildId, channelId)) {
    return false;
  }

  if (countConfigPostsLastHour(id) >= maxPerHour) {
    return false;
  }
  if (countGuildPostsLastHour(guildId) >= HARD_GUILD_CAP_PER_HOUR) {
    return false;
  }

  const idleMs = getIdleMs(guildId, channelId);
  if (idleMs === null) {
    return false;
  }
  const requiredMs = idleMinutes * 60_000;
  if (idleMs < requiredMs) {
    return false;
  }

  const client = botManager.getClient(botId);
  if (!client || !client.isReady?.()) {
    return false;
  }
  const guild = client.guilds?.cache?.get(guildId);
  if (!guild) {
    return false;
  }
  const channel = guild.channels?.cache?.get(channelId)
    || (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel || !channel.isTextBased?.()) {
    return false;
  }

  const effective = await guildBotSettingsRepository.resolveEffectiveConfig(guildId, botId);
  if (!effective || !effective.enabled || effective.botStatus !== 'ENABLED') {
    return false;
  }
  if (!effective.aiApiKey || !effective.aiBaseUrl || !effective.aiModel) {
    return false;
  }

  const text = await generateIdleMessage(effective, { botId, topicHint });
  if (!text) {
    return false;
  }

  let posted;
  try {
    posted = await channel.send({ content: text });
  } catch (err) {
    logger.error('idle.post.failed', {
      botId,
      guildId,
      channelId,
      error: err?.message || String(err),
    });
    return false;
  }

  recordPost(id, guildId);
  markActive(guildId, channelId);

  logger.info('idle.posted', {
    botId,
    guildId,
    channelId,
    messageId: posted.id,
    idleMinutes,
    actualIdleMin: Math.round(idleMs / 60_000),
  });
  return true;
}

async function tick() {
  let configs;
  try {
    configs = await idleChatterRepository.listAllEnabled();
  } catch (err) {
    logger.error('idle.tick.list_failed', { error: err?.message || String(err) });
    return;
  }
  if (!configs || configs.length === 0) return;

  for (let i = configs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [configs[i], configs[j]] = [configs[j], configs[i]];
  }

  const guildPostsThisTick = new Map();

  for (const config of configs) {
    const used = guildPostsThisTick.get(config.guildId) || 0;
    if (used >= PER_TICK_GUILD_CAP) continue;

    try {
      const fired = await tryFireConfig(config);
      if (fired) {
        guildPostsThisTick.set(config.guildId, used + 1);
      }
    } catch (err) {
      logger.error('idle.tick.config_failed', {
        configId: config.id,
        botId: config.botId,
        guildId: config.guildId,
        channelId: config.channelId,
        error: err?.message || String(err),
      });
    }
  }
}

export function startIdleChatterScheduler() {
  if (tickHandle) return;
  tickHandle = setInterval(() => {
    tick().catch((err) =>
      logger.error('idle.tick.unhandled', { error: err?.message || String(err) })
    );
  }, TICK_INTERVAL_MS);
  if (typeof tickHandle.unref === 'function') tickHandle.unref();
  logger.info('idle.scheduler.started', { intervalMs: TICK_INTERVAL_MS });
}

export function stopIdleChatterScheduler() {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}
