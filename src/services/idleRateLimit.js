const HOUR_MS = 60 * 60 * 1000;

const perConfigPosts = new Map();
const perGuildPosts = new Map();

function prune(arr) {
  const cutoff = Date.now() - HOUR_MS;
  while (arr.length > 0 && arr[0] < cutoff) arr.shift();
}

function getOrInit(map, key) {
  let arr = map.get(key);
  if (!arr) {
    arr = [];
    map.set(key, arr);
  }
  return arr;
}

export function countConfigPostsLastHour(configId) {
  const arr = perConfigPosts.get(configId);
  if (!arr) return 0;
  prune(arr);
  return arr.length;
}

export function countGuildPostsLastHour(guildId) {
  const arr = perGuildPosts.get(guildId);
  if (!arr) return 0;
  prune(arr);
  return arr.length;
}

export function recordPost(configId, guildId) {
  const t = Date.now();
  getOrInit(perConfigPosts, configId).push(t);
  getOrInit(perGuildPosts, guildId).push(t);
}

export function clearAll() {
  perConfigPosts.clear();
  perGuildPosts.clear();
}
