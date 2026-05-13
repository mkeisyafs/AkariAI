import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION = 0x01;
const KEY_HEX_LENGTH = 64;

const DENY_LIST = new Set([
  'change-this-key-please',
  '0'.repeat(KEY_HEX_LENGTH),
]);

const DISCORD_TOKEN_REGEX = /^[MN][A-Za-z0-9._-]{24,}/;

function getKey() {
  assertKeyValid();
  return Buffer.from(process.env.BOT_ENCRYPTION_KEY, 'hex');
}

export function assertKeyValid() {
  const raw = process.env.BOT_ENCRYPTION_KEY;

  if (!raw || raw.length === 0) {
    throw new Error('BOT_ENCRYPTION_KEY is missing or empty');
  }

  if (DENY_LIST.has(raw)) {
    throw new Error('BOT_ENCRYPTION_KEY matches deny-list (low entropy)');
  }

  if (raw.length !== KEY_HEX_LENGTH || !/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(
      `BOT_ENCRYPTION_KEY must be exactly ${KEY_HEX_LENGTH} hex characters (32 bytes)`
    );
  }

  if (/^(.)\1+$/.test(raw)) {
    throw new Error('BOT_ENCRYPTION_KEY has low entropy (all same character)');
  }
}

export function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new TypeError('encrypt() expects a string');
  }

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([
    Buffer.from([VERSION]),
    iv,
    ciphertext,
    authTag,
  ]);

  return packed.toString('base64');
}

export function decrypt(ciphertextB64) {
  if (typeof ciphertextB64 !== 'string') {
    throw new TypeError('decrypt() expects a base64 string');
  }

  const buf = Buffer.from(ciphertextB64, 'base64');

  if (buf.length < 1 + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Ciphertext too short');
  }

  const version = buf[0];
  if (version !== VERSION) {
    throw new Error(`Unsupported ciphertext version: 0x${version.toString(16)}`);
  }

  const iv = buf.subarray(1, 1 + IV_LENGTH);
  const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(1 + IV_LENGTH, buf.length - AUTH_TAG_LENGTH);

  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

export function safeLog(value) {
  if (typeof value !== 'string') {
    return value;
  }
  if (DISCORD_TOKEN_REGEX.test(value)) {
    return '<REDACTED>';
  }
  return value;
}
