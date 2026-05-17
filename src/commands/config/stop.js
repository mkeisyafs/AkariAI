import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import {
  muteChannel,
  unmuteChannel,
  getMuteInfo,
} from '../../services/channelMutes.js';
import { logger } from '../../utils/logger.js';

const MAX_DURATION_MIN = 1440;

function formatDuration(ms) {
  if (!ms) return 'until manually resumed';
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop all bots from chatting with each other in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('chat')
        .setDescription('Stop bot-to-bot chatter in this channel')
        .addIntegerOption((o) =>
          o
            .setName('minutes')
            .setDescription('Auto-resume after N minutes (1-1440). Omit to stop indefinitely.')
            .setMinValue(1)
            .setMaxValue(MAX_DURATION_MIN)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('resume').setDescription('Resume bot-to-bot chatter in this channel')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Check whether this channel is currently muted')
    ),
  adminOnly: false,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'Run this in a server channel.', ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;

    if (sub === 'chat') {
      const minutes = interaction.options.getInteger('minutes');
      const durationMs = minutes ? minutes * 60_000 : null;
      muteChannel(guildId, channelId, durationMs);
      logger.info('chat.muted', { guildId, channelId, durationMs, by: interaction.user.id });

      const embed = new EmbedBuilder()
        .setTitle('Bot chatter stopped')
        .setDescription(
          `Bots will no longer reply to each other in this channel **${formatDuration(durationMs)}**.\n` +
            `Humans can still talk to them. Use \`/stop resume\` to lift this early.`
        )
        .setColor(0xed4245);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'resume') {
      const removed = unmuteChannel(guildId, channelId);
      logger.info('chat.unmuted', { guildId, channelId, hadMute: removed, by: interaction.user.id });
      const msg = removed
        ? 'Bot chatter resumed in this channel.'
        : 'This channel was not muted.';
      return interaction.reply({ content: msg, ephemeral: false });
    }

    const info = getMuteInfo(guildId, channelId);
    if (!info) {
      return interaction.reply({ content: 'This channel is not muted.', ephemeral: true });
    }
    const remainingMs = info.expiresAt ? info.expiresAt - Date.now() : null;
    return interaction.reply({
      content: info.expiresAt
        ? `Muted. Auto-resume in **${formatDuration(remainingMs)}**.`
        : 'Muted indefinitely. Use `/stop resume` to lift.',
      ephemeral: true,
    });
  },
};
