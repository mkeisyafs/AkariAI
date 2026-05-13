import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../../services/moderationService.js';
import { getGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('delete-days')
        .setDescription('Days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  adminOnly: true,
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete-days') || 0;

    if (user.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      await interaction.guild.members.ban(user, {
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        reason: reason,
      });

      const config = await getGuildConfig(interaction.guild.id);
      await logModeration(
        interaction.client,
        interaction.guild.id,
        user.id,
        interaction.user.id,
        'ban',
        reason,
        config
      );

      await interaction.editReply(
        `🔨 ${user.tag} has been banned.\nReason: ${reason}`
      );
    } catch (error) {
      console.error('Ban command error:', error);
      await interaction.editReply('❌ An error occurred while banning the user.');
    }
  },
};
