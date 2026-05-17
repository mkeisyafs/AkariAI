import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import botManager from '../../services/botManager.js';
import botRepository from '../../database/repositories/botRepository.js';
import guildBotSettingsRepository from '../../database/repositories/guildBotSettingsRepository.js';
import { generateOpener } from '../../services/aiService.js';
import { issueForcedReplyTicket } from '../../services/forcedReplyTickets.js';
import { logger } from '../../utils/logger.js';

async function pickBotChoices(guildId) {
  const settings = await guildBotSettingsRepository.getForGuild(guildId);
  return settings
    .filter((s) => s.enabled && s.bot && s.bot.status === 'ENABLED')
    .map((s) => ({ id: s.bot.id, name: s.bot.name }));
}

export default {
  data: new SlashCommandBuilder()
    .setName('talk')
    .setDescription('Make two bots have a conversation')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName('bot-a')
        .setDescription('Bot that speaks first')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((o) =>
      o
        .setName('bot-b')
        .setDescription('Bot that responds')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((o) =>
      o.setName('topic').setDescription('What should Bot A talk about?').setRequired(true)
    ),
  adminOnly: false,
  async autocomplete(interaction) {
    if (!interaction.guild) return interaction.respond([]);
    try {
      const choices = await pickBotChoices(interaction.guild.id);
      const focused = interaction.options.getFocused(true);
      const filtered = choices
        .filter((c) =>
          (focused.value || '').length === 0
            ? true
            : c.name.toLowerCase().includes(String(focused.value).toLowerCase())
        )
        .slice(0, 25);
      return interaction.respond(filtered.map((c) => ({ name: c.name, value: c.id })));
    } catch {
      return interaction.respond([]);
    }
  },
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'Run this in a server.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });

    const botAId = interaction.options.getString('bot-a');
    const botBId = interaction.options.getString('bot-b');
    const topic = interaction.options.getString('topic');

    if (botAId === botBId) {
      return interaction.editReply('Bot A and Bot B must be different.');
    }

    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;

    const choices = await pickBotChoices(guildId);
    const choiceById = new Map(choices.map((c) => [c.id, c]));
    if (!choiceById.has(botAId) || !choiceById.has(botBId)) {
      return interaction.editReply(
        'Both bots must be enabled in this server. Use the autocomplete suggestions.'
      );
    }

    const clientA = botManager.getClient(botAId);
    const clientB = botManager.getClient(botBId);
    if (!clientA || !clientA.isReady?.() || !clientA.guilds?.cache?.get(guildId)) {
      return interaction.editReply(`Bot A is not currently online in this server.`);
    }
    if (!clientB || !clientB.isReady?.() || !clientB.guilds?.cache?.get(guildId)) {
      return interaction.editReply(`Bot B is not currently online in this server.`);
    }

    const channelA = clientA.channels.cache.get(channelId) || (await clientA.channels.fetch(channelId).catch(() => null));
    if (!channelA) {
      return interaction.editReply(
        'Bot A cannot see this channel. Check Bot A has View Channel + Send Messages here.'
      );
    }

    const [botARecord, effectiveA] = await Promise.all([
      botRepository.getBotById(botAId),
      guildBotSettingsRepository.resolveEffectiveConfig(guildId, botAId),
    ]);
    if (!effectiveA) {
      return interaction.editReply('Bot A has no settings row for this guild.');
    }
    if (!effectiveA.aiApiKey || !effectiveA.aiBaseUrl || !effectiveA.aiModel) {
      return interaction.editReply(
        'Bot A is missing AI provider settings (model, base URL, or API key).'
      );
    }

    const targetBotName = choiceById.get(botBId).name;

    const opener = await generateOpener(effectiveA, {
      botId: botAId,
      targetBotName,
      topic,
    });
    if (!opener) {
      return interaction.editReply(
        'Bot A could not generate an opener. Check the bot logs for the AI provider error.'
      );
    }

    const userMentionPart = `<@${(await clientB.user).id}>`;
    const finalText = opener.includes(userMentionPart) ? opener : `${userMentionPart} ${opener}`;

    let posted;
    try {
      posted = await channelA.send({
        content: finalText,
        allowedMentions: { users: [clientB.user.id] },
      });
    } catch (err) {
      logger.error('talk.post.failed', {
        botAId,
        guildId,
        channelId,
        error: err?.message || String(err),
      });
      return interaction.editReply(
        `Bot A could not post (${err?.message || 'unknown error'}). Check channel permissions.`
      );
    }

    issueForcedReplyTicket(guildId, channelId, botBId, botAId);

    logger.info('talk.started', {
      guildId,
      channelId,
      botAId,
      botBId,
      messageId: posted.id,
      botAName: botARecord?.name,
      botBName: targetBotName,
    });

    return interaction.editReply(
      `Done. ${botARecord?.name || 'Bot A'} just spoke to ${targetBotName}. They have ~60s to reply, then it's organic.`
    );
  },
};
