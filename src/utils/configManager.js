import { guildConfigRepository } from '../database/repositories/index.js';

export async function getGuildConfig(guildId) {
  let config = await guildConfigRepository.findByGuildId(guildId);

  if (!config) {
    config = await guildConfigRepository.create(guildId);
  }

  return config;
}

export async function updateGuildConfig(guildId, updates) {
  const config = await guildConfigRepository.upsert(guildId, updates);
  return config;
}
