import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Collection } from 'discord.js';
import { registerBotCommands } from '../services/botCommands.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildCommandCollection() {
  const commandsPath = join(__dirname, '../commands');
  const commandFolders = readdirSync(commandsPath);
  const collection = new Collection();

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      const command = await import(`file://${filePath}`);

      if ('data' in command.default && 'execute' in command.default) {
        collection.set(command.default.data.name, command.default);
      } else {
        console.warn(`⚠️  Command at ${filePath} is missing required "data" or "execute" property`);
      }
    }
  }

  return collection;
}

export async function loadCommandsForDeploy(botId) {
  if (!botId) {
    throw new Error('loadCommandsForDeploy: botId is required');
  }
  const collection = await buildCommandCollection();
  registerBotCommands(botId, collection);
  return collection;
}

// Loads every command module under src/commands/**/*.js and registers the
// collection against the given botId in the per-bot command store.
//
// For the legacy sentinel `_default_legacy` we also attach a `ready` listener
// to mirror the Collection under `client.user.id` post-login, so legacy code
// paths that key off the real Discord user id keep resolving. Real multi-bot
// callers (T18+) pass the DB Bot.id and rely on injected botId in events.
export async function loadCommandsForBot(client, botId) {
  if (!client) {
    throw new Error('loadCommandsForBot: client is required');
  }
  if (!botId) {
    throw new Error('loadCommandsForBot: botId is required');
  }

  const collection = await buildCommandCollection();
  registerBotCommands(botId, collection);

  if (botId === '_default_legacy') {
    client.once('ready', () => {
      if (client.user?.id) {
        registerBotCommands(client.user.id, collection);
      }
    });
  }
}

// Legacy shim — keeps the pre-multi-bot `loadCommands(client)` entrypoint alive
// for src/index.js until T18 rewrites boot. Delegates to loadCommandsForBot
// with the sentinel botId matching eventHandler's legacy injection.
export async function loadCommands(client) {
  return loadCommandsForBot(client, '_default_legacy');
}
