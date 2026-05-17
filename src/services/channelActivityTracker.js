const lastActivityAt = new Map();

function key(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

export function markActive(guildId, channelId) {
  if (!guildId || !channelId) return;
  lastActivityAt.set(key(guildId, channelId), Date.now());
}

export function getIdleMs(guildId, channelId) {
  const last = lastActivityAt.get(key(guildId, channelId));
  if (!last) return null;
  return Date.now() - last;
}

export function clearAll() {
  lastActivityAt.clear();
}
