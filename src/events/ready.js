import { ActivityType } from 'discord.js';
import botRepository from '../database/repositories/botRepository.js';

export default {
  name: 'ready',
  once: true,
  async execute(client, botId) {
    console.log(`✅ Logged in as ${client.user.tag} (botId=${botId})`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);

    client.user.setPresence({
      activities: [{ name: 'with AI | /help', type: ActivityType.Playing }],
      status: 'online',
    });

    if (botId && botId !== '_default_legacy') {
      try {
        await botRepository.setBotDiscordUserId(botId, client.user.id);
      } catch (err) {
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            event: 'ready.persist_user_id_failed',
            botId,
            error: err && err.message ? err.message : String(err),
          })
        );
      }
    }
  },
};
