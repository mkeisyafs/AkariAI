import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { clearChannelContext } from '../../services/aiService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear-context')
    .setDescription('Clear conversation history for this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      await clearChannelContext(interaction.channel.id);

      await interaction.editReply({
        content: '✅ Conversation history cleared for this channel. The bot will start fresh.',
      });
    } catch (error) {
      console.error('Error clearing context:', error);
      await interaction.editReply({
        content: '❌ Failed to clear conversation history.',
      });
    }
  },
};
