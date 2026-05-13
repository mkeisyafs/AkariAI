import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../../services/moderationService.js';
import { getGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  adminOnly: true,
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) {
      return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot kick yourself.', ephemeral: true });
    }

    if (!member.kickable) {
      return interaction.reply({ content: '❌ I cannot kick this user.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      await member.kick(reason);

      const config = await getGuildConfig(interaction.guild.id);
      await logModeration(
        interaction.client,
        interaction.guild.id,
        user.id,
        interaction.user.id,
        'kick',
        reason,
        config
      );

      await interaction.editReply(
        `👢 ${user.tag} has been kicked.\nReason: ${reason}`
      );
    } catch (error) {
      console.error('Kick command error:', error);
      await interaction.editReply('❌ An error occurred while kicking the user.');
    }
  },
};
