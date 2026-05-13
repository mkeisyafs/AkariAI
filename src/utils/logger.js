// Minimal structured logger — stdlib only, no deps (T29).
//
// Emits one JSON line per call (default) or pretty single-line output when
// LOG_PRETTY=1. All string values run through `safeLog()` so Discord-shaped
// tokens are redacted defensively; blacklisted keys are replaced wholesale.
//
// Public API:
//   logger.info (event, ctx?)   — ctx is an optional plain object
//   logger.warn (event, ctx?)
//   logger.error(event, ctx?)
//   logger.debug(event, ctx?)
//
// Never throws: if JSON stringification fails (e.g. circular refs), falls back
// to a short plain-text line. Consumers should not need try/catch around logs.

import { safeLog } from './encryption.js';

const PRETTY = process.env.LOG_PRETTY === '1';

// Keys whose values are always replaced with "<REDACTED>" regardless of shape.
// Mirrors the naming used across repositories/routes; safeLog() handles shape-
// based redaction for stray strings.
const REDACT_KEYS = new Set([
  'token',
  'newToken',
  'apiKey',
  'newApiKey',
  'authorization',
  'cookie',
  'password',
  'aiApiKey',
  'encryptedToken',
  'encryptedApiKey',
]);

const MAX_DEPTH = 6;

function scrub(value, depth = 0) {
  if (depth > MAX_DEPTH) return '[depth]';
  if (value == null) return value;
  if (typeof value === 'string') return safeLog(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return typeof value === 'bigint' ? value.toString() : value;
  }
  if (value instanceof Error) {
    return {
      error: safeLog(value.message || String(value)),
      code: value.code || null,
    };
  }
  if (Array.isArray(value)) {
    return value.map((v) => scrub(v, depth + 1));
  }
  if (typeof value !== 'object') return String(value);

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (REDACT_KEYS.has(k)) {
      out[k] = v == null ? v : '<REDACTED>';
    } else {
      out[k] = scrub(v, depth + 1);
    }
  }
  return out;
}

function emit(level, event, ctx) {
  const safeCtx = ctx && typeof ctx === 'object' ? scrub(ctx) : {};
  const entry = { ts: new Date().toISOString(), level, event, ...safeCtx };

  try {
    if (PRETTY) {
      // Keep ctx inline as compact JSON for readability; still scrubbed.
      const tail = Object.keys(safeCtx).length > 0 ? ` ${JSON.stringify(safeCtx)}` : '';
      console.log(`[${entry.ts}] ${level.toUpperCase()} ${event}${tail}`);
    } else {
      console.log(JSON.stringify(entry));
    }
  } catch {
    // Last-resort: never let logging crash the caller.
    console.log(`[${entry.ts}] ${level.toUpperCase()} ${event} <unserializable>`);
  }
}

export const logger = {
  info: (event, ctx) => emit('info', event, ctx),
  warn: (event, ctx) => emit('warn', event, ctx),
  error: (event, ctx) => emit('error', event, ctx),
  debug: (event, ctx) => emit('debug', event, ctx),
};

export default logger;
