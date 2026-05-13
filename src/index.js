import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from 'dotenv';
import { connectDatabase } from './database/connection.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { startWebServer } from './web/server.js';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction],
});

async function startBot() {
  try {
    await connectDatabase();
    console.log('✅ Database connected');

    await loadCommands(client);
    console.log('✅ Commands loaded');

    await loadEvents(client);
    console.log('✅ Events loaded');

    await client.login(process.env.DISCORD_TOKEN);
    console.log('✅ Discord bot logged in');

    startWebServer(client);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();

export default client;

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});
