import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../../services/moderationService.js';
import { getGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to mute')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  adminOnly: true,
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) {
      return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot mute yourself.', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: '❌ You cannot mute this user.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      await member.timeout(duration * 60 * 1000, reason);

      const config = await getGuildConfig(interaction.guild.id);
      await logModeration(
        interaction.client,
        interaction.guild.id,
        user.id,
        interaction.user.id,
        'mute',
        reason,
        config
      );

      await interaction.editReply(
        `🔇 ${user} has been muted for ${duration} minutes.\nReason: ${reason}`
      );

      try {
        await user.send(
          `You have been muted in **${interaction.guild.name}** for ${duration} minutes.\nReason: ${reason}`
        );
      } catch (error) {
        console.log('Could not DM user');
      }
    } catch (error) {
      console.error('Mute command error:', error);
      await interaction.editReply('❌ An error occurred while muting the user.');
    }
  },
};
