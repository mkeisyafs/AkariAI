import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configure goodbye system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup goodbye messages')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for goodbye messages')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Goodbye message (use {user}, {server}, {memberCount})')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option.setName('use-embed')
            .setDescription('Use embed for goodbye message')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable goodbye messages')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable goodbye messages')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View goodbye settings')
    ),
  adminOnly: true,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      return await viewGoodbyeConfig(interaction);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'setup':
          const channel = interaction.options.getChannel('channel');
          const message = interaction.options.getString('message');
          const useEmbed = interaction.options.getBoolean('use-embed') ?? true;

          await updateGuildConfig(interaction.guild.id, {
            goodbyeEnabled: true,
            goodbyeChannelId: channel.id,
            goodbyeMessage: message,
            goodbyeUseEmbed: useEmbed,
          });

          await interaction.editReply(
            `✅ Goodbye system configured!\nChannel: ${channel}\nMessage: ${message}`
          );
          break;

        case 'toggle':
          await updateGuildConfig(interaction.guild.id, {
            goodbyeEnabled: interaction.options.getBoolean('enabled'),
          });
          await interaction.editReply('✅ Goodbye system updated!');
          break;
      }
    } catch (error) {
      console.error('Goodbye config error:', error);
      await interaction.editReply('❌ An error occurred while updating goodbye settings.');
    }
  },
};

async function viewGoodbyeConfig(interaction) {
  const config = await getGuildConfig(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor('#ff4444')
    .setTitle('👋 Goodbye Configuration')
    .addFields(
      { name: 'Status', value: config.goodbyeEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Channel', value: config.goodbyeChannelId ? `<#${config.goodbyeChannelId}>` : 'Not set', inline: true },
      { name: 'Use Embed', value: config.goodbyeUseEmbed ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Message', value: config.goodbyeMessage || 'Not set', inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
