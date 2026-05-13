import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

// One-off migration utility: purges legacy global slash commands from the
// primary bot's Discord application. After the multi-bot migration, all
// commands are deployed per-guild via src/services/slashCommandDeployer.js,
// and legacy global registrations would otherwise double up in guilds.
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
