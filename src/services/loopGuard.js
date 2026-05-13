// LoopGuard — synchronous reservation gate to prevent bot-to-bot infinite loops.
//
// Per-channel state machine tracking:
//   - chainDepth: consecutive bot replies since the last human message
//   - botReplyTimestamps: rolling window of bot reply times (for circuit breaker)
//   - lastBotReplyAt: for channel cooldown
//   - breakerLockedUntil: ms epoch until which replies are refused (tripped breaker)
//   - reservedBy: uuid token of in-flight reservation, or null
//
// Reservation lifecycle:
//   tryReserveBotReply -> { ok: true, commit(), release() }  (caller must commit or release)
//   commit()  advances state as if a bot reply happened
//   release() frees the slot without advancing state
//
// All checks are synchronous. The module performs no I/O and adds no deps.

import { randomUUID } from 'node:crypto';

const channelStates = new Map();

function keyOf(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

function now() {
  return Date.now();
}

function getOrCreate(guildId, channelId) {
  const key = keyOf(guildId, channelId);
  let state = channelStates.get(key);
  if (!state) {
    state = {
      chainDepth: 0,
      lastBotReplyAt: 0,
      botReplyTimestamps: [],
      breakerLockedUntil: 0,
      reservedBy: null,
      updatedAt: now(),
    };
    channelStates.set(key, state);
  }
  return state;
}

function pruneOldTimestamps(state, windowMs) {
  if (!state.botReplyTimestamps.length) return;
  const cutoff = now() - windowMs;
  state.botReplyTimestamps = state.botReplyTimestamps.filter((t) => t >= cutoff);
}

let cleanupHandle = setInterval(() => {
  const t = now();
  for (const [k, s] of channelStates) {
    if (t - s.updatedAt > 600_000) {
      channelStates.delete(k);
    }
  }
}, 60_000);
if (cleanupHandle && typeof cleanupHandle.unref === 'function') {
  cleanupHandle.unref();
}

function registerHumanMessage(guildId, channelId) {
  const state = getOrCreate(guildId, channelId);
  state.chainDepth = 0;
  state.updatedAt = now();
}

function registerBotReply(guildId, channelId) {
  const state = getOrCreate(guildId, channelId);
  const t = now();
  state.chainDepth += 1;
  state.botReplyTimestamps.push(t);
  state.lastBotReplyAt = t;
  state.updatedAt = t;
}

function tryReserveBotReply(guildId, channelId, config, options = {}) {
  const isHumanInitiated = options.isHumanInitiated === true;
  const state = getOrCreate(guildId, channelId);

  // Concurrency guard — enforced even on the human-initiated path.
  if (state.reservedBy !== null) {
    return { ok: false, reason: 'RESERVED' };
  }

  if (!isHumanInitiated) {
    const t = now();

    if (state.breakerLockedUntil > t) {
      return { ok: false, reason: 'CIRCUIT_BREAKER' };
    }

    if (state.chainDepth >= config.maxChainDepth) {
      return { ok: false, reason: 'CHAIN_DEPTH' };
    }

    if (t - state.lastBotReplyAt < config.channelCooldownMs) {
      return { ok: false, reason: 'COOLDOWN' };
    }

    pruneOldTimestamps(state, config.circuitBreakerWindowMs);
    if (state.botReplyTimestamps.length >= config.circuitBreakerCount) {
      state.breakerLockedUntil = t + config.circuitBreakerPauseMs;
      state.updatedAt = t;
      return { ok: false, reason: 'CIRCUIT_BREAKER_TRIPPED' };
    }
  }

  const uuid = randomUUID();
  state.reservedBy = uuid;
  state.updatedAt = now();

  return {
    ok: true,
    reservationId: uuid,
    commit() {
      if (state.reservedBy === uuid) {
        const t = now();
        state.chainDepth += 1;
        state.botReplyTimestamps.push(t);
        state.lastBotReplyAt = t;
        state.updatedAt = t;
        state.reservedBy = null;
      }
    },
    release() {
      if (state.reservedBy === uuid) {
        state.reservedBy = null;
        state.updatedAt = now();
      }
    },
  };
}

function getChannelState(guildId, channelId) {
  const state = channelStates.get(keyOf(guildId, channelId));
  if (!state) return null;
  return {
    chainDepth: state.chainDepth,
    lastBotReplyAt: state.lastBotReplyAt,
    botReplyTimestamps: state.botReplyTimestamps.slice(),
    breakerLockedUntil: state.breakerLockedUntil,
    reservedBy: state.reservedBy,
    updatedAt: state.updatedAt,
  };
}

function __stopCleanup() {
  if (cleanupHandle) {
    clearInterval(cleanupHandle);
    cleanupHandle = null;
  }
}

function __resetForTest() {
  channelStates.clear();
}

export default {
  registerHumanMessage,
  registerBotReply,
  tryReserveBotReply,
  getChannelState,
  __stopCleanup,
  __resetForTest,
};
