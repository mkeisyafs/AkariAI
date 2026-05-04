import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📚 Bot Commands')
      .setDescription('Here are all available commands:')
      .addFields(
        {
          name: '⚙️ Configuration Commands',
          value: '`/config` - Configure AI settings\n`/moderation` - Configure moderation\n`/welcome` - Configure welcome messages\n`/verification` - Configure verification system',
          inline: false
        },
        {
          name: '🛡️ Moderation Commands',
          value: '`/warn` - Warn a user\n`/mute` - Timeout a user\n`/kick` - Kick a user\n`/ban` - Ban a user',
          inline: false
        },
        {
          name: '🤖 AI Features',
          value: 'The bot can chat naturally in channels. Mention the bot or let it respond based on configured chance.',
          inline: false
        },
        {
          name: '✅ Verification',
          value: 'New members can verify themselves using the verification button in the configured channel.',
          inline: false
        }
      )
      .setFooter({ text: 'Use /command to see detailed options for each command' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
