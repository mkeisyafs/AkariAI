import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Configure verification system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup verification system')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to give after verification')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for verification')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable verification')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable verification')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View verification settings')
    ),
  adminOnly: true,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      return await viewVerificationConfig(interaction);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'setup':
          const role = interaction.options.getRole('role');
          const channel = interaction.options.getChannel('channel');

          await updateGuildConfig(interaction.guild.id, {
            verification: {
              enabled: true,
              roleId: role.id,
              channelId: channel.id,
            }
          });

          await interaction.editReply(
            `✅ Verification system configured!\nRole: ${role}\nChannel: ${channel}`
          );
          break;

        case 'toggle':
          await updateGuildConfig(interaction.guild.id, {
            verification: { enabled: interaction.options.getBoolean('enabled') }
          });
          await interaction.editReply('✅ Verification system updated!');
          break;
      }
    } catch (error) {
      console.error('Verification config error:', error);
      await interaction.editReply('❌ An error occurred while updating verification settings.');
    }
  },
};

async function viewVerificationConfig(interaction) {
  const config = await getGuildConfig(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Verification Configuration')
    .addFields(
      { name: 'Status', value: config.verification.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Role', value: config.verification.roleId ? `<@&${config.verification.roleId}>` : 'Not set', inline: true },
      { name: 'Channel', value: config.verification.channelId ? `<#${config.verification.channelId}>` : 'Not set', inline: true },
      { name: 'Method', value: config.verification.method, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
