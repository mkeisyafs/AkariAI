import { EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../utils/configManager.js';

export default {
  name: 'guildMemberRemove',
  async execute(client, botId, member) {
    const config = await getGuildConfig(member.guild.id);

    if (config.goodbyeEnabled && config.goodbyeChannelId) {
      await sendGoodbyeMessage(member, config);
    }
  },
};

async function sendGoodbyeMessage(member, config) {
  try {
    const channel = member.guild.channels.cache.get(config.goodbyeChannelId);
    if (!channel) return;

    const message = config.goodbyeMessage
      .replace('{user}', member.user.username)
      .replace('{server}', member.guild.name)
      .replace('{memberCount}', member.guild.memberCount.toString());

    if (config.goodbyeUseEmbed) {
      const embed = new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle('Goodbye!')
        .setDescription(message)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(message);
    }
  } catch (error) {
    console.error('Error sending goodbye message:', error);
  }
}
