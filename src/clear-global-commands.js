import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Clearing all global application (/) commands...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] },
    );

    console.log('✅ Successfully cleared all global commands.');
    console.log('ℹ️  Commands are now managed per-guild through the web dashboard.');
  } catch (error) {
    console.error('Error clearing commands:', error);
  }
})();
