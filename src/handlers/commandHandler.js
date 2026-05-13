import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Collection } from 'discord.js';
import { registerBotCommands } from '../services/botCommands.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client) {
  const commandsPath = join(__dirname, '../commands');
  const commandFolders = readdirSync(commandsPath);
  const collection = new Collection();

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

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

  // loadCommands runs before client.login(), so client.user.id is null here.
  // Register under a stable legacy key now, then re-register under the real
  // bot id on `ready` so per-bot lookups (getBotCommands) work post-login.
  registerBotCommands('_default_legacy', collection);
  client.once('ready', () => {
    if (client.user?.id) {
      registerBotCommands(client.user.id, collection);
    }
  });
}
