const mutes = new Map();

function key(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

export function muteChannel(guildId, channelId, durationMs = null) {
  if (!guildId || !channelId) {
    throw new Error('muteChannel: guildId and channelId are required');
  }
  const k = key(guildId, channelId);
  const expiresAt = durationMs && durationMs > 0 ? Date.now() + durationMs : null;
  mutes.set(k, { mutedAt: Date.now(), expiresAt });
}

export function unmuteChannel(guildId, channelId) {
  return mutes.delete(key(guildId, channelId));
}

export function isChannelMuted(guildId, channelId) {
  const k = key(guildId, channelId);
  const entry = mutes.get(k);
  if (!entry) return false;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    mutes.delete(k);
    return false;
  }
  return true;
}

export function getMuteInfo(guildId, channelId) {
  const k = key(guildId, channelId);
  const entry = mutes.get(k);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    mutes.delete(k);
    return null;
  }
  return { mutedAt: entry.mutedAt, expiresAt: entry.expiresAt };
}
