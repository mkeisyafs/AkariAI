import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function getAllCommands() {
  const commands = [];
  const commandsPath = join(__dirname, '../commands');
  const commandFolders = readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      const command = await import(`file://${filePath}`);
      if ('data' in command.default && 'execute' in command.default) {
        commands.push({
          name: command.default.data.name,
          data: command.default.data.toJSON(),
        });
      }
    }
  }

  return commands;
}

export async function syncGuildCommands(guildId, enabledCommandNames) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const allCommands = await getAllCommands();
  
  const commandsToRegister = allCommands
    .filter(cmd => enabledCommandNames.includes(cmd.name))
    .map(cmd => cmd.data);

  try {
    console.log(`Syncing ${commandsToRegister.length} commands for guild ${guildId}`);
    
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body: commandsToRegister },
    );

    console.log(`✅ Successfully synced ${data.length} commands for guild ${guildId}`);
    return { success: true, count: data.length };
  } catch (error) {
    console.error(`Error syncing commands for guild ${guildId}:`, error);
    throw error;
  }
}

export async function clearGuildCommands(guildId) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body: [] },
    );
    console.log(`✅ Cleared all commands for guild ${guildId}`);
    return { success: true };
  } catch (error) {
    console.error(`Error clearing commands for guild ${guildId}:`, error);
    throw error;
  }
}
