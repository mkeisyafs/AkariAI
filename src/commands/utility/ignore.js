import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import userIgnoreListRepository from '../../database/repositories/userIgnoreListRepository.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ignore')
    .setDescription('Toggle whether the bot responds to your messages'),
  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      const result = await userIgnoreListRepository.toggleIgnore(guildId, userId);

      const embed = new EmbedBuilder()
        .setColor(result.ignored ? '#ff6b6b' : '#51cf66')
        .setTitle(result.ignored ? '🔇 Bot Ignored' : '🔊 Bot Unignored')
        .setDescription(
          result.ignored
            ? 'The bot will no longer respond to your messages.'
            : 'The bot will now respond to your messages again.'
        )
        .setFooter({ text: `Use /ignore again to ${result.ignored ? 'unignore' : 'ignore'} the bot` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error toggling ignore status:', error);
      await interaction.reply({
        content: '❌ An error occurred while updating your ignore status.',
        ephemeral: true,
      });
    }
  },
};
