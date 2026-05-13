const store = new Map();

function keyOf(botId, guildId, channelId) {
  if (!botId || !guildId || !channelId) {
    throw new Error('botCooldowns: botId, guildId, and channelId are all required');
  }
  return `${botId}:${guildId}:${channelId}`;
}

export function getCooldown(botId, guildId, channelId) {
  const value = store.get(keyOf(botId, guildId, channelId));
  return value === undefined ? null : value;
}

export function setCooldown(botId, guildId, channelId, timestamp) {
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    throw new Error('setCooldown: timestamp must be a number');
  }
  store.set(keyOf(botId, guildId, channelId), timestamp);
}

export function clearCooldown(botId, guildId, channelId) {
  return store.delete(keyOf(botId, guildId, channelId));
}
