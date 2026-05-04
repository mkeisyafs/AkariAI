import { getGuildConfig } from '../utils/configManager.js';

export default {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    const guild = reaction.message.guild;
    if (!guild) return;

    const config = await getGuildConfig(guild.id);

    if (!config.verificationEnabled || config.verificationMethod !== 'reaction') {
      return;
    }

    if (!config.verificationRoleId || !config.verificationChannelId) {
      return;
    }

    if (reaction.message.channel.id !== config.verificationChannelId) {
      return;
    }

    const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
    const configEmoji = config.verificationEmoji;

    if (emojiIdentifier !== configEmoji && reaction.emoji.name !== configEmoji) {
      return;
    }

    try {
      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.get(config.verificationRoleId);

      if (!role) {
        console.error('Verification role not found');
        return;
      }

      if (member.roles.cache.has(role.id)) {
        return;
      }

      await member.roles.add(role);

      try {
        await user.send(`✅ You have been verified in **${guild.name}**! Welcome to the server.`);
      } catch (error) {
        console.log('Could not DM user about verification');
      }
    } catch (error) {
      console.error('Error handling verification reaction:', error);
    }
  },
};
