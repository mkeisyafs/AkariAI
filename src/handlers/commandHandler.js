import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client) {
  const commandsPath = join(__dirname, '../commands');
  const commandFolders = readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      const command = await import(`file://${filePath}`);

      if ('data' in command.default && 'execute' in command.default) {
        client.commands.set(command.default.data.name, command.default);
      } else {
        console.warn(`⚠️  Command at ${filePath} is missing required "data" or "execute" property`);
      }
    }
  }
}
