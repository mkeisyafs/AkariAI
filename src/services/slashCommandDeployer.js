import { REST, Routes } from 'discord.js';
import botRepository from '../database/repositories/botRepository.js';
import guildBotSettingsRepository from '../database/repositories/guildBotSettingsRepository.js';
import { getBotCommands } from './botCommands.js';

const DEFAULT_CONCURRENCY = 3;

function logEvent(event, ctx = {}) {
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...ctx }));
  } catch {
    console.log(`[slashCommandDeployer] ${event}`);
  }
}

// Bulk-overwrite a bot's slash commands for a single guild via REST.
// Returns a plain result object — never throws, so callers can aggregate
// across many (botId, guildId) pairs without abort-on-first-failure.
export async function deployBotCommandsToGuild(botId, guildId) {
  try {
    const bot = await botRepository.getBotById(botId);
    if (!bot) {
      return { botId, guildId, status: 'failed', error: 'bot not found' };
    }
    if (!bot.discordAppId) {
      return { botId, guildId, status: 'failed', error: 'bot missing discordAppId' };
    }

    const collection = getBotCommands(botId);
    const commands = [...collection.values()]
      .filter((c) => c && c.data && typeof c.data.toJSON === 'function')
      .map((c) => c.data.toJSON());

    if (commands.length === 0) {
      return { botId, guildId, status: 'skipped', count: 0, reason: 'no commands loaded' };
    }

    const token = await botRepository.getDecryptedToken(botId);

    const rest = new REST({ version: '10' }).setToken(token);
    const data = await rest.put(
      Routes.applicationGuildCommands(bot.discordAppId, guildId),
      { body: commands }
    );

    const count = Array.isArray(data) ? data.length : commands.length;
    logEvent('slash.deploy.ok', { botId, guildId, count });
    return { botId, guildId, status: 'deployed', count };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    logEvent('slash.deploy.failed', { botId, guildId, error: message });
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
