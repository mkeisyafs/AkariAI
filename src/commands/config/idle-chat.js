import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import idleChatterRepository from '../../database/repositories/idleChatterRepository.js';
import guildBotSettingsRepository from '../../database/repositories/guildBotSettingsRepository.js';
import { logger } from '../../utils/logger.js';

async function pickEnabledBots(guildId) {
  const settings = await guildBotSettingsRepository.getForGuild(guildId);
  return settings
    .filter((s) => s.enabled && s.bot && s.bot.status === 'ENABLED')
    .map((s) => ({ id: s.bot.id, name: s.bot.name }));
}

export default {
  data: new SlashCommandBuilder()
    .setName('idle-chat')
    .setDescription('Configure spontaneous idle messages for bots in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Make a bot post in this channel after the channel has been quiet')
        .addStringOption((o) =>
          o.setName('bot').setDescription('Which bot').setRequired(true).setAutocomplete(true)
        )
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel to monitor (default: this channel)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addIntegerOption((o) =>
          o
            .setName('idle-minutes')
            .setDescription('Minutes of silence required before bot speaks (5-1440, default 30)')
            .setMinValue(5)
            .setMaxValue(1440)
        )
        .addIntegerOption((o) =>
          o
            .setName('max-per-hour')
            .setDescription('Hard cap on idle posts per hour (1-10, default 2)')
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addStringOption((o) =>
          o
            .setName('topic-hint')
            .setDescription('Optional theme/mood hint for the messages (max 500 chars)')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Stop a bot from posting idle messages in a channel')
        .addStringOption((o) =>
          o.setName('bot').setDescription('Which bot').setRequired(true).setAutocomplete(true)
        )
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel (default: this channel)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all idle chatter configs in this guild')
    ),
  adminOnly: false,
  async autocomplete(interaction) {
    if (!interaction.guild) return interaction.respond([]);
    if (interaction.options.getFocused(true).name !== 'bot') return interaction.respond([]);
    try {
      const focused = interaction.options.getFocused(true);
      const bots = await pickEnabledBots(interaction.guild.id);
      const filtered = bots
        .filter((b) =>
          (focused.value || '').length === 0
            ? true
            : b.name.toLowerCase().includes(String(focused.value).toLowerCase())
        )
        .slice(0, 25);
      return interaction.respond(filtered.map((b) => ({ name: b.name, value: b.id })));
    } catch {
      return interaction.respond([]);
    }
  },
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'Run this in a server.', ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'list') {
      const configs = await idleChatterRepository.listForGuild(guildId);
      if (configs.length === 0) {
        return interaction.reply({
          content: 'No idle chatter configured in this guild yet. Run `/idle-chat enable` to set one up.',
          ephemeral: true,
        });
      }
      const bots = await pickEnabledBots(guildId);
      const nameById = new Map(bots.map((b) => [b.id, b.name]));
      const lines = configs.map((c) => {
        const botName = nameById.get(c.botId) || `(unknown bot ${c.botId})`;
        const status = c.enabled ? '🟢' : '⚫';
        const hint = c.topicHint ? ` · hint: "${c.topicHint.slice(0, 60)}${c.topicHint.length > 60 ? '…' : ''}"` : '';
        return `${status} **${botName}** in <#${c.channelId}> · idle ${c.idleMinutes}m · max ${c.maxPerHour}/hr${hint}`;
      });
      const embed = new EmbedBuilder()
        .setTitle('Idle chatter configs')
        .setDescription(lines.join('\n'))
        .setColor(0x5865f2);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const botId = interaction.options.getString('bot');
    const channelOption = interaction.options.getChannel('channel');
    const channelId = channelOption?.id || interaction.channel.id;

    const bots = await pickEnabledBots(guildId);
    if (!bots.some((b) => b.id === botId)) {
      return interaction.reply({
        content: 'That bot is not enabled in this server. Use the autocomplete suggestions.',
        ephemeral: true,
      });
    }

    if (sub === 'enable') {
      const idleMinutes = interaction.options.getInteger('idle-minutes') ?? 30;
      const maxPerHour = interaction.options.getInteger('max-per-hour') ?? 2;
      const topicHint = (interaction.options.getString('topic-hint') ?? '').trim();

      try {
        await idleChatterRepository.upsert({
          guildId,
          botId,
          channelId,
          enabled: true,
          idleMinutes,
          maxPerHour,
          topicHint,
        });
      } catch (err) {
        return interaction.reply({
          content: `Could not save: ${err.message || 'unknown error'}`,
          ephemeral: true,
        });
      }

      logger.info('idle.config.enabled', { guildId, botId, channelId, idleMinutes, maxPerHour });
      return interaction.reply({
        content: `Idle chatter enabled. The bot will post in <#${channelId}> after **${idleMinutes}m** of silence, up to **${maxPerHour}/hour**.`,
        ephemeral: true,
      });
    }

    if (sub === 'disable') {
      const removed = await idleChatterRepository.delete(guildId, botId, channelId);
      logger.info('idle.config.disabled', { guildId, botId, channelId, hadConfig: !!removed });
      return interaction.reply({
        content: removed
          ? `Idle chatter disabled for that bot in <#${channelId}>.`
          : 'No idle chatter config existed for that bot/channel.',
        ephemeral: true,
      });
    }

    return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  },
};
