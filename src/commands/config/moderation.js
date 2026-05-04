import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Configure moderation settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable auto-moderation')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable auto-moderation')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('log-channel')
        .setDescription('Set moderation log channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for moderation logs')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('auto-actions')
        .setDescription('Configure automatic moderation actions')
        .addBooleanOption(option =>
          option.setName('warn')
            .setDescription('Auto-warn for toxic messages')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('mute')
            .setDescription('Auto-mute for toxic messages')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('kick')
            .setDescription('Auto-kick for toxic messages')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('ban')
            .setDescription('Auto-ban for toxic messages')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current moderation settings')
    ),
  adminOnly: true,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      return await viewModerationConfig(interaction);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'toggle':
          await updateGuildConfig(interaction.guild.id, {
            moderation: { enabled: interaction.options.getBoolean('enabled') }
          });
          await interaction.editReply('✅ Auto-moderation settings updated!');
          break;

        case 'log-channel':
          const channel = interaction.options.getChannel('channel');
          await updateGuildConfig(interaction.guild.id, {
            moderation: { logChannelId: channel.id }
          });
          await interaction.editReply(`✅ Moderation log channel set to ${channel}!`);
          break;

        case 'auto-actions':
          const actions = {};
          const warn = interaction.options.getBoolean('warn');
          const mute = interaction.options.getBoolean('mute');
          const kick = interaction.options.getBoolean('kick');
          const ban = interaction.options.getBoolean('ban');

          if (warn !== null) actions.warn = warn;
          if (mute !== null) actions.mute = mute;
          if (kick !== null) actions.kick = kick;
          if (ban !== null) actions.ban = ban;

          await updateGuildConfig(interaction.guild.id, {
            moderation: { autoModActions: actions }
          });
          await interaction.editReply('✅ Auto-moderation actions updated!');
          break;
      }
    } catch (error) {
      console.error('Moderation config error:', error);
      await interaction.editReply('❌ An error occurred while updating moderation settings.');
    }
  },
};

async function viewModerationConfig(interaction) {
  const config = await getGuildConfig(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('🛡️ Moderation Configuration')
    .addFields(
      { name: 'Status', value: config.moderation.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Log Channel', value: config.moderation.logChannelId ? `<#${config.moderation.logChannelId}>` : 'Not set', inline: true },
      { name: 'Auto-Warn', value: config.moderation.autoModActions.warn ? '✅' : '❌', inline: true },
      { name: 'Auto-Mute', value: config.moderation.autoModActions.mute ? '✅' : '❌', inline: true },
      { name: 'Auto-Kick', value: config.moderation.autoModActions.kick ? '✅' : '❌', inline: true },
      { name: 'Auto-Ban', value: config.moderation.autoModActions.ban ? '✅' : '❌', inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
