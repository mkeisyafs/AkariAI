import { Collection } from 'discord.js';

const store = new Map();

export function registerBotCommands(botId, commandsCollection) {
  if (!botId) {
    throw new Error('registerBotCommands: botId is required');
  }
  if (!(commandsCollection instanceof Collection)) {
    throw new Error('registerBotCommands: commandsCollection must be a discord.js Collection');
  }
  store.set(botId, commandsCollection);
}

export function getBotCommands(botId) {
  if (!botId) {
    throw new Error('getBotCommands: botId is required');
  }
  const existing = store.get(botId);
  if (existing) {
    return existing;
  }
  const empty = new Collection();
  store.set(botId, empty);
  return empty;
}

export function unregisterBotCommands(botId) {
  if (!botId) {
    throw new Error('unregisterBotCommands: botId is required');
  }
  return store.delete(botId);
}
