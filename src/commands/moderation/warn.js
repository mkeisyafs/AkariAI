import { SlashCommandBuilder } from 'discord.js';
import { warnUser, logModeration } from '../../services/moderationService.js';
import { getGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(false)
    ),
  adminOnly: true,
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply();

    try {
      const warningCount = await warnUser(
        interaction.guild.id,
        user.id,
        interaction.user.id,
        reason
      );

      const config = await getGuildConfig(interaction.guild.id);
      await logModeration(
        interaction.guild.id,
        user.id,
        interaction.user.id,
        'warn',
        reason,
        config
      );

      await interaction.editReply(
        `⚠️ ${user} has been warned. Total warnings: ${warningCount}\nReason: ${reason}`
      );

      try {
        await user.send(
          `You have been warned in **${interaction.guild.name}**\nReason: ${reason}\nTotal warnings: ${warningCount}`
        );
      } catch (error) {
        console.log('Could not DM user');
      }
    } catch (error) {
      console.error('Warn command error:', error);
      await interaction.editReply('❌ An error occurred while warning the user.');
    }
  },
};
