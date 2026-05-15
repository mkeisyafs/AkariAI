import { REST, Routes } from 'discord.js';
import botRepository from '../database/repositories/botRepository.js';
import guildBotSettingsRepository from '../database/repositories/guildBotSettingsRepository.js';
import guildConfigRepository from '../database/repositories/guildConfigRepository.js';
import { getBotCommands } from './botCommands.js';
import { logger } from '../utils/logger.js';

const DEFAULT_CONCURRENCY = 3;

function logEvent(event, ctx = {}) {
  logger.info(event, ctx);
}

export async function deployBotCommandsToGuild(botId, guildId) {
  logEvent('slash.deploy.attempt', { botId, guildId });
  try {
    const bot = await botRepository.getBotById(botId);
    if (!bot) {
      logger.warn('slash.deploy.failed', { botId, guildId, error: 'bot not found' });
      return { botId, guildId, status: 'failed', error: 'bot not found' };
    }
    if (!bot.discordAppId) {
      logger.warn('slash.deploy.failed', { botId, guildId, error: 'bot missing discordAppId' });
      return { botId, guildId, status: 'failed', error: 'bot missing discordAppId' };
    }

    const guildConfig = await guildConfigRepository.findByGuildId(guildId);
    const disabledCommands = new Set(guildConfig?.disabledCommands || []);

    const collection = getBotCommands(botId);
    const commands = [...collection.values()]
      .filter((c) => c && c.data && typeof c.data.toJSON === 'function')
      .filter((c) => !disabledCommands.has(c.data.name))
      .map((c) => c.data.toJSON());

    const token = await botRepository.getDecryptedToken(botId);
    const rest = new REST({ version: '10' }).setToken(token);
    const data = await rest.put(
      Routes.applicationGuildCommands(bot.discordAppId, guildId),
      { body: commands }
    );

    const count = Array.isArray(data) ? data.length : commands.length;
    logEvent('slash.deploy.success', {
      botId,
      guildId,
      count,
      disabledCount: disabledCommands.size,
    });
    return { botId, guildId, status: 'deployed', count, disabledCount: disabledCommands.size };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    logger.error('slash.deploy.failed', { botId, guildId, error: message });
    return { botId, guildId, status: 'failed', error: message };
  }
}

async function withConcurrency(items, limit, fn) {
  const results = [];
  const pool = new Set();
  for (const item of items) {
    while (pool.size >= limit) {
      await Promise.race(pool);
    }
    const p = Promise.resolve()
      .then(() => fn(item))
      .finally(() => pool.delete(p));
    pool.add(p);
    results.push(p);
  }
  return Promise.all(results);
}

// Deploys every ENABLED bot's command set to every guild that has that bot
// enabled via GuildBotSettings. Never throws; returns a summary. Concurrency
// is capped (default 3) because Discord shares a ~50 req/s/IP rate limit
// across all outbound REST calls.
export async function deployAllBotsToTheirGuilds({ concurrency = DEFAULT_CONCURRENCY } = {}) {
  const bots = await botRepository.listBots({ includeDisabled: true });
  const enabled = bots.filter((b) => b.status === 'ENABLED');

  const pairs = [];
  for (const bot of enabled) {
    const guildIds = await guildBotSettingsRepository.getEnabledGuildIdsForBot(bot.id);
    for (const guildId of guildIds) {
      pairs.push({ botId: bot.id, guildId });
    }
  }

  const results = await withConcurrency(
    pairs,
    concurrency,
    ({ botId, guildId }) => deployBotCommandsToGuild(botId, guildId)
  );

  let deployed = 0;
  let failed = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.status === 'deployed') deployed++;
    else if (r.status === 'skipped') skipped++;
    else failed++;
  }

  logEvent('slash.deployAll.summary', {
    deployed,
    failed,
    skipped,
    total: pairs.length,
    enabledBots: enabled.length,
  });

  return {
    deployed,
    failed,
    skipped,
    total: pairs.length,
    results,
  };
}
