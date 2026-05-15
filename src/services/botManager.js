import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import botRepository from '../database/repositories/botRepository.js';
import { logger } from '../utils/logger.js';

// BotManager — runtime registry for multiple discord.js Client instances.
//
// Contracts (all enforced below; callers rely on these):
//   - Lifecycle methods NEVER throw on recoverable failures (bad token, DB miss,
//     login rejection). They mutate status and return.
//   - No auto-retry on TOKEN_INVALID: a bad token stays failed until an admin
//     rotates it.
//   - knownBotUserIds is a consistent snapshot — userId is only present while
//     the corresponding handle is in READY status.
//   - getAllHandles() is the admin-safe surface: no Client refs, no tokens.

const INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildMessageReactions,
];

const PARTIALS = [
  Partials.GuildMember,
  Partials.Message,
  Partials.Channel,
  Partials.Reaction,
];

// Matches login/shard-error messages that indicate a permanently-invalid
// credential (vs. a transient network / rate-limit failure).
const TOKEN_INVALID_RE = /disallowed intents|invalid token|authentication failed|tokeninvalid/i;

/** @type {Map<string, ClientHandle>} */
const handles = new Map();

/** @type {Set<string>} — rebuilt on every READY/non-READY transition. */
let knownBotUserIds = new Set();

// Wireup hook — invoked once per fresh Client right after a successful
// `client.login()`, before ClientReady fires. Set by the boot module so
// botManager stays free of any handler/event imports (avoids a circular
// dep: botManager → eventHandler → … → botManager). Required because
// admin-created and restarted bots take paths that don't go through
// index.js's startup wireup loop — without this, those clients connect
// to Discord with zero `messageCreate` listeners and look "online but
// silent".
/** @type {null | ((client: import('discord.js').Client, botId: string) => Promise<void> | void)} */
let wireupFn = null;

function setWireup(fn) {
  wireupFn = typeof fn === 'function' ? fn : null;
}

// Per-bot boot lock. Serializes connect/disconnect/restart for a given botId
// across the window where `handles` has no entry (so handle.mutex can't help).
// Distinct from handle.mutex, which guards intra-handle work like ready-handler
// bookkeeping once the handle exists.
/** @type {Map<string, Promise<void>>} */
const bootLocks = new Map();

function logEvent(event, ctx = {}) {
  logger.info(event, ctx);
}

function logError(botId, err, event = 'bot.error') {
  logger.error(event, {
    botId,
    error: err && err.message ? err.message : String(err),
    code: err && err.code ? err.code : null,
  });
}

function rebuildKnownBotUserIds() {
  const next = new Set();
  for (const h of handles.values()) {
    if (h.status === 'READY' && h.discordBotUserId) {
      next.add(h.discordBotUserId);
    }
  }
  knownBotUserIds = next;
}

async function withBootLock(botId, fn) {
  const prev = bootLocks.get(botId) || Promise.resolve();
  let release;
  const next = new Promise((r) => {
    release = r;
  });
  const chained = prev.then(() => next);
  bootLocks.set(botId, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (bootLocks.get(botId) === chained) {
      bootLocks.delete(botId);
    }
  }
}

async function withHandleMutex(handle, fn) {
  const prev = handle.mutex || Promise.resolve();
  let release;
  handle.mutex = new Promise((r) => {
    release = r;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

function newHandle(botId) {
  return {
    client: null,
    botId,
    discordBotUserId: null,
    status: 'CONNECTING',
    lastError: null,
    mutex: Promise.resolve(),
  };
}

function setStatus(handle, nextStatus) {
  const prev = handle.status;
  handle.status = nextStatus;
  if (prev !== nextStatus) {
    logEvent('bot.status.change', { botId: handle.botId, from: prev, to: nextStatus });
  }
}

async function destroyClientQuietly(client) {
  if (!client) return;
  try {
    client.removeAllListeners();
  } catch {
    /* ignore */
  }
  try {
    await client.destroy();
  } catch {
    /* ignore */
  }
}

// Private — never exported. Marks TOKEN_INVALID, persists, tears down, no retry.
async function handleTokenInvalid(botId, err) {
  const handle = handles.get(botId);
  if (!handle) return;

  setStatus(handle, 'TOKEN_INVALID');
  handle.lastError = err || new Error('token invalidated');

  try {
    await botRepository.markBotStatus(botId, 'TOKEN_INVALID');
  } catch (dbErr) {
    logError(botId, dbErr, 'bot.token.invalid.persist_failed');
  }

  const client = handle.client;
  handle.client = null;
  handle.discordBotUserId = null;

  await destroyClientQuietly(client);
  rebuildKnownBotUserIds();
  logEvent('bot.token.invalid', {
    botId,
    error: handle.lastError.message || String(handle.lastError),
  });
}

function attachLifecycleListeners(handle, client, botId) {
  client.once(Events.ClientReady, async (readyClient) => {
    await withHandleMutex(handle, async () => {
      handle.discordBotUserId = readyClient.user.id;
      setStatus(handle, 'READY');
      rebuildKnownBotUserIds();
      try {
        await botRepository.setBotDiscordUserId(botId, readyClient.user.id);
      } catch (err) {
        logError(botId, err, 'bot.ready.persist_user_id_failed');
      }
      logEvent('bot.ready', { botId, userId: readyClient.user.id });
      logEvent('bot.connect.success', { botId, userId: readyClient.user.id });
    });
  });

  client.on(Events.Invalidated, () => {
    // Fire-and-forget: discord.js event emitter must not block on DB work.
    handleTokenInvalid(botId, new Error('token invalidated')).catch((e) =>
      logError(botId, e, 'bot.invalidated.handler_failed')
    );
  });

  client.on(Events.Error, (err) => {
    logError(botId, err, 'bot.client.error');
  });

  client.on(Events.ShardError, (err) => {
    const msg = (err && err.message) || '';
    if (TOKEN_INVALID_RE.test(msg)) {
      handleTokenInvalid(botId, err).catch((e) =>
        logError(botId, e, 'bot.sharderror.handler_failed')
      );
    } else {
      logError(botId, err, 'bot.shard.error');
    }
  });
}

// Body of connectBot, factored so restartBot can invoke the same logic without
// re-acquiring the boot lock (which it already holds — re-acquiring would
// self-deadlock).
async function connectInsideLock(botId) {
  if (handles.has(botId)) {
    await internalDisconnect(botId);
  }

  const handle = newHandle(botId);
  handles.set(botId, handle);

  let token;
  try {
    token = await botRepository.getDecryptedToken(botId);
  } catch (err) {
    setStatus(handle, 'UNHEALTHY');
    handle.lastError = err;
    logError(botId, err, 'bot.connect.token_lookup_failed');
    logError(botId, err, 'bot.connect.failed');
    return;
  }

  const client = new Client({ intents: INTENTS, partials: PARTIALS });
  handle.client = client;
  attachLifecycleListeners(handle, client, botId);

  try {
    await client.login(token);
    logEvent('bot.login', { botId });
    if (wireupFn) {
      try {
        await wireupFn(client, botId);
      } catch (wireErr) {
        logError(botId, wireErr, 'bot.wireup.failed');
      }
    }
  } catch (err) {
    const msg = (err && err.message) || '';
    if (TOKEN_INVALID_RE.test(msg)) {
      await handleTokenInvalid(botId, err);
      logError(botId, err, 'bot.connect.failed');
      return;
    }
    setStatus(handle, 'UNHEALTHY');
    handle.lastError = err;
    logError(botId, err, 'bot.login.failed');
    logError(botId, err, 'bot.connect.failed');
    await destroyClientQuietly(client);
    handle.client = null;
  }
}

async function internalDisconnect(botId) {
  const handle = handles.get(botId);
  if (!handle) return;

  const client = handle.client;
  handle.client = null;
  handle.discordBotUserId = null;
  setStatus(handle, 'DISCONNECTED');

  await destroyClientQuietly(client);
  handles.delete(botId);
  rebuildKnownBotUserIds();
  logEvent('bot.disconnect', { botId });
}

async function connectBot(botId) {
  return withBootLock(botId, () => connectInsideLock(botId));
}

async function disconnectBot(botId) {
  return withBootLock(botId, () => internalDisconnect(botId));
}

async function restartBot(botId) {
  return withBootLock(botId, async () => {
    logEvent('bot.restart', { botId });
    await internalDisconnect(botId);
    await connectInsideLock(botId);
  });
}

async function connectAllEnabled() {
  let bots;
  try {
    bots = await botRepository.listBots({ includeDisabled: false });
  } catch (err) {
    logError(null, err, 'bot.connectAll.list_failed');
    return { connected: 0, failed: 0, attempted: 0 };
  }

  const enabled = bots.filter((b) => b.status === 'ENABLED');
  const results = await Promise.allSettled(enabled.map((b) => connectBot(b.id)));

  let connected = 0;
  let failed = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const id = enabled[i].id;
    if (r.status === 'fulfilled') {
      // connectBot resolves on success OR on swallowed failure (TOKEN_INVALID,
      // UNHEALTHY). Re-check handle status to classify.
      const h = handles.get(id);
      if (h && (h.status === 'READY' || h.status === 'CONNECTING')) {
        connected++;
      } else {
        failed++;
      }
    } else {
      failed++;
      logError(id, r.reason, 'bot.connectAll.unexpected_reject');
    }
  }

  logEvent('bot.connectAll.summary', { connected, failed, attempted: enabled.length });
  return { connected, failed, attempted: enabled.length };
}

function getClient(botId) {
  const handle = handles.get(botId);
  if (!handle || !handle.client) return null;
  if (handle.status === 'TOKEN_INVALID' || handle.status === 'DISCONNECTED') {
    return null;
  }
  return handle.client;
}

function getStatus(botId) {
  const handle = handles.get(botId);
  return handle ? handle.status : null;
}

function getAllBotUserIds() {
  return new Set(knownBotUserIds);
}

function isOurBot(userId) {
  if (!userId) return false;
  return knownBotUserIds.has(userId);
}

function getBotIdByUserId(userId) {
  if (!userId) return null;
  for (const h of handles.values()) {
    if (h.discordBotUserId === userId) return h.botId;
  }
  return null;
}

function getAllHandles() {
  const out = [];
  for (const h of handles.values()) {
    out.push({
      botId: h.botId,
      status: h.status,
      discordBotUserId: h.discordBotUserId,
      lastError: h.lastError && h.lastError.message ? h.lastError.message : null,
    });
  }
  return out;
}

export default {
  connectBot,
  disconnectBot,
  restartBot,
  connectAllEnabled,
  getClient,
  getStatus,
  getAllBotUserIds,
  isOurBot,
  getBotIdByUserId,
  getAllHandles,
  setWireup,
};
