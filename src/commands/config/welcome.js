import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup welcome messages')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for welcome messages')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Welcome message (use {user}, {server}, {memberCount})')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option.setName('use-embed')
            .setDescription('Use embed for welcome message')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable welcome messages')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable welcome messages')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View welcome settings')
    ),
  adminOnly: true,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      return await viewWelcomeConfig(interaction);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'setup':
          const channel = interaction.options.getChannel('channel');
          const message = interaction.options.getString('message');
          const useEmbed = interaction.options.getBoolean('use-embed') ?? true;

          await updateGuildConfig(interaction.guild.id, {
            welcome: {
              enabled: true,
              channelId: channel.id,
              message: message,
              useEmbed: useEmbed,
            }
          });

          await interaction.editReply(
            `✅ Welcome system configured!\nChannel: ${channel}\nMessage: ${message}`
          );
          break;

        case 'toggle':
          await updateGuildConfig(interaction.guild.id, {
            welcome: { enabled: interaction.options.getBoolean('enabled') }
          });
          await interaction.editReply('✅ Welcome system updated!');
          break;
      }
    } catch (error) {
      console.error('Welcome config error:', error);
      await interaction.editReply('❌ An error occurred while updating welcome settings.');
    }
  },
};

async function viewWelcomeConfig(interaction) {
  const config = await getGuildConfig(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('👋 Welcome Configuration')
    .addFields(
      { name: 'Status', value: config.welcome.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Channel', value: config.welcome.channelId ? `<#${config.welcome.channelId}>` : 'Not set', inline: true },
      { name: 'Use Embed', value: config.welcome.useEmbed ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Message', value: config.welcome.message, inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
