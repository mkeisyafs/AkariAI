// Multi-bot boot sequence (T18).
//
// Ordering contract (strict): dotenv → encryption-key check → global-admins
// parse → DB connect → backfill → connect all enabled bots → wire
// events/commands per bot → fire-and-forget slash deploy → web server start.
//
// Failure contract:
//   - Missing/invalid BOT_ENCRYPTION_KEY  → exit 1 immediately (pre-I/O).
//   - DB connect failure                  → exit 1.
//   - Backfill failure                    → exit 1 (inconsistent state otherwise).
//   - Individual bot connect failure      → logged, process stays alive.
//   - Slash command deploy failure        → logged, does NOT block boot.
//
// IMPORTANT: most dependencies are imported dynamically AFTER the key check.
// Static-importing them would pull in `./database/prisma.js`, which throws at
// load time when DATABASE_URL is unset — that would mask the real
// BOT_ENCRYPTION_KEY error and violate the "encryption check before any other
// I/O" contract.

import { config } from 'dotenv';
config();

import { assertKeyValid } from './utils/encryption.js';
import { logger } from './utils/logger.js';

export const globalAdmins = new Set();

const SNOWFLAKE_RE = /^[0-9]{15,20}$/;

function parseGlobalAdminUserIds() {
  const raw = process.env.GLOBAL_ADMIN_USER_IDS || '';
  const entries = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const valid = entries.filter((id) => SNOWFLAKE_RE.test(id));
  const ignored = entries.filter((id) => !SNOWFLAKE_RE.test(id));
  if (ignored.length > 0) {
    logger.warn('globalAdmins.invalidEntries', { ignored });
  }
  return new Set(valid);
}

const shutdownState = { botManager: null, shuttingDown: false };

async function startBot() {
  try {
    assertKeyValid();
  } catch (err) {
    console.error(`Boot failed: ${err.message}`);
    process.exit(1);
  }

  for (const id of parseGlobalAdminUserIds()) globalAdmins.add(id);
  logger.info('globalAdmins.loaded', { count: globalAdmins.size });

  const { connectDatabase } = await import('./database/connection.js');
  const { default: botManager } = await import('./services/botManager.js');
  const { deployAllBotsToTheirGuilds } = await import('./services/slashCommandDeployer.js');
  const { registerEventsForClient } = await import('./handlers/eventHandler.js');
  const { loadCommandsForBot } = await import('./handlers/commandHandler.js');
  const { startWebServer } = await import('./web/server.js');
  const { run: runBackfill } = await import('../scripts/backfill-multi-bot.js');

  shutdownState.botManager = botManager;

  await connectDatabase();
  logger.info('db.connected');

  try {
    const result = await runBackfill();
    logger.info('backfill.done', result || {});
  } catch (err) {
    logger.error('backfill.failed', { error: err && err.message ? err.message : String(err) });
    process.exit(1);
  }

  const connectSummary = await botManager.connectAllEnabled();
  logger.info('bots.connected', connectSummary);

  if (connectSummary.attempted === 0) {
    logger.info('bots.empty', { hint: 'No bots configured — add via admin UI' });
  }

  const handles = botManager.getAllHandles();
  for (const h of handles) {
    if (h.status !== 'READY' && h.status !== 'CONNECTING') continue;
    const client = botManager.getClient(h.botId);
    if (!client) continue;
    try {
      await loadCommandsForBot(client, h.botId);
      registerEventsForClient(client, h.botId);
      logger.info('bot.wired', { botId: h.botId });
    } catch (err) {
      logger.error('bot.wireup.failed', {
        botId: h.botId,
        error: err && err.message ? err.message : String(err),
      });
    }
  }

  Promise.resolve()
    .then(() => deployAllBotsToTheirGuilds())
    .then((summary) => logger.info('slash.deployed', summary || {}))
    .catch((err) =>
      logger.error('slash.deploy.failed', {
        error: err && err.message ? err.message : String(err),
      })
    );

  startWebServer(botManager);
  logger.info('web.started');
}

async function shutdown(signal) {
  if (shutdownState.shuttingDown) return;
  shutdownState.shuttingDown = true;
  logger.info('shutdown.start', { signal });

  const bm = shutdownState.botManager;
  if (bm) {
    const handles = bm.getAllHandles();
    await Promise.allSettled(handles.map((h) => bm.disconnectBot(h.botId)));
    logger.info('shutdown.botsDisconnected', { count: handles.length });
  }

  try {
    const { default: prisma } = await import('./database/prisma.js');
    await prisma.$disconnect();
    logger.info('shutdown.dbDisconnected');
  } catch (err) {
    logger.error('shutdown.dbDisconnect.failed', {
      error: err && err.message ? err.message : String(err),
    });
  }

  process.exit(0);
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch(() => process.exit(1));
});
process.on('SIGINT', () => {
  shutdown('SIGINT').catch(() => process.exit(1));
});

process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', {
    error: err && err.message ? err.message : String(err),
  });
});

startBot().catch((err) => {
  console.error(`Fatal boot error: ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
