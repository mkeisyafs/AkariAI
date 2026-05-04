import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure bot settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ai-url')
        .setDescription('Set AI API base URL')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('The base URL for the AI API')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ai-model')
        .setDescription('Set AI model')
        .addStringOption(option =>
          option.setName('model')
            .setDescription('The AI model to use')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ai-key')
        .setDescription('Set AI API key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('Your AI API key')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('personality')
        .setDescription('Set bot personality')
        .addStringOption(option =>
          option.setName('prompt')
            .setDescription('The personality prompt for the bot')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('response-chance')
        .setDescription('Set response chance percentage')
        .addIntegerOption(option =>
          option.setName('percentage')
            .setDescription('Chance (0-100) the bot will respond')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cooldown')
        .setDescription('Set response cooldown in seconds')
        .addIntegerOption(option =>
          option.setName('seconds')
            .setDescription('Cooldown between responses')
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-channel')
        .setDescription('Add allowed channel for AI responses')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to allow')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-channel')
        .setDescription('Remove allowed channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to remove')
            .setRequired(true)
        )
    ),
  adminOnly: true,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      return await viewConfig(interaction);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'ai-url':
          await updateGuildConfig(interaction.guild.id, {
            aiBaseUrl: interaction.options.getString('url')
          });
          await interaction.editReply('✅ AI base URL updated successfully!');
          break;

        case 'ai-model':
          await updateGuildConfig(interaction.guild.id, {
            aiModel: interaction.options.getString('model')
          });
          await interaction.editReply('✅ AI model updated successfully!');
          break;

        case 'ai-key':
          await updateGuildConfig(interaction.guild.id, {
            aiApiKey: interaction.options.getString('key')
          });
          await interaction.editReply('✅ AI API key updated successfully! (Keep this message private)');
          break;

        case 'personality':
          await updateGuildConfig(interaction.guild.id, {
            aiPersonality: interaction.options.getString('prompt')
          });
          await interaction.editReply('✅ Bot personality updated successfully!');
          break;

        case 'response-chance':
          await updateGuildConfig(interaction.guild.id, {
            aiResponseChance: interaction.options.getInteger('percentage')
          });
          await interaction.editReply('✅ Response chance updated successfully!');
          break;

        case 'cooldown':
          await updateGuildConfig(interaction.guild.id, {
            aiCooldown: interaction.options.getInteger('seconds') * 1000
          });
          await interaction.editReply('✅ Cooldown updated successfully!');
          break;

        case 'add-channel':
          const channelToAdd = interaction.options.getChannel('channel');
          const configAdd = await getGuildConfig(interaction.guild.id);
          if (!configAdd.aiAllowedChannels.includes(channelToAdd.id)) {
            await updateGuildConfig(interaction.guild.id, {
              aiAllowedChannels: [...configAdd.aiAllowedChannels, channelToAdd.id]
            });
            await interaction.editReply(`✅ Added ${channelToAdd} to allowed channels!`);
          } else {
            await interaction.editReply('❌ Channel is already in the allowed list!');
          }
          break;

        case 'remove-channel':
          const channelToRemove = interaction.options.getChannel('channel');
          const configRemove = await getGuildConfig(interaction.guild.id);
          const filteredChannels = configRemove.aiAllowedChannels.filter(id => id !== channelToRemove.id);
          if (filteredChannels.length < configRemove.aiAllowedChannels.length) {
            await updateGuildConfig(interaction.guild.id, {
              aiAllowedChannels: filteredChannels
            });
            await interaction.editReply(`✅ Removed ${channelToRemove} from allowed channels!`);
          } else {
            await interaction.editReply('❌ Channel is not in the allowed list!');
          }
          break;
      }
    } catch (error) {
      console.error('Config command error:', error);
      await interaction.editReply('❌ An error occurred while updating configuration.');
    }
  },
};

async function viewConfig(interaction) {
  const config = await getGuildConfig(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('⚙️ Server Configuration')
    .addFields(
      { name: '🤖 AI Base URL', value: config.aiBaseUrl || 'Not set', inline: false },
      { name: '🧠 AI Model', value: config.aiModel || 'Not set', inline: false },
      { name: '🔑 API Key', value: config.aiApiKey ? '••••••••' : 'Not set', inline: false },
      { name: '🎭 Personality', value: config.aiPersonality.substring(0, 100) + '...', inline: false },
      { name: '🎲 Response Chance', value: `${config.aiResponseChance}%`, inline: true },
      { name: '⏱️ Cooldown', value: `${config.aiCooldown / 1000}s`, inline: true },
      { name: '📢 Allowed Channels', value: config.aiAllowedChannels.length > 0 ? config.aiAllowedChannels.map(id => `<#${id}>`).join(', ') : 'All channels', inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
