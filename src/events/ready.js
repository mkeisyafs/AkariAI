import { ActivityType } from 'discord.js';

export default {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);

    client.user.setPresence({
      activities: [{ name: 'with AI | /help', type: ActivityType.Playing }],
      status: 'online',
    });
  },
};
