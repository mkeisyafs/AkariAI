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
        .setName('add-word')
        .setDescription('Add a banned word')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('Word to ban')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-word')
        .setDescription('Remove a banned word')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('Word to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-punishment')
        .setDescription('Set punishment for X warnings')
        .addIntegerOption(option =>
          option.setName('warns')
            .setDescription('Number of warnings to trigger this punishment')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Punishment action')
            .setRequired(true)
            .addChoices(
              { name: 'Warn', value: 'warn' },
              { name: 'Mute', value: 'mute' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' },
            )
        )
        .addIntegerOption(option =>
          option.setName('duration')
            .setDescription('Mute duration in minutes (only for mute)')
            .setRequired(false)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-punishment')
        .setDescription('Remove punishment rule for X warnings')
        .addIntegerOption(option =>
          option.setName('warns')
            .setDescription('Warning count to remove rule for')
            .setRequired(true)
            .setMinValue(1)
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
      const config = await getGuildConfig(interaction.guild.id);

      switch (subcommand) {
        case 'toggle':
          await updateGuildConfig(interaction.guild.id, {
            moderationEnabled: interaction.options.getBoolean('enabled'),
          });
          await interaction.editReply('✅ Auto-moderation settings updated!');
          break;

        case 'log-channel':
          const channel = interaction.options.getChannel('channel');
          await updateGuildConfig(interaction.guild.id, {
            moderationLogChannelId: channel.id,
          });
          await interaction.editReply(`✅ Moderation log channel set to ${channel}!`);
          break;

        case 'add-word': {
          const word = interaction.options.getString('word').toLowerCase();
          const words = config.moderationBannedWords || [];
          if (words.includes(word)) {
            await interaction.editReply(`⚠️ "${word}" is already in the banned words list.`);
            return;
          }
          words.push(word);
          await updateGuildConfig(interaction.guild.id, {
            moderationBannedWords: words,
          });
          await interaction.editReply(`✅ Added "${word}" to banned words list.`);
          break;
        }

        case 'remove-word': {
          const word = interaction.options.getString('word').toLowerCase();
          const words = config.moderationBannedWords || [];
          const index = words.indexOf(word);
          if (index === -1) {
            await interaction.editReply(`⚠️ "${word}" is not in the banned words list.`);
            return;
          }
          words.splice(index, 1);
          await updateGuildConfig(interaction.guild.id, {
            moderationBannedWords: words,
          });
          await interaction.editReply(`✅ Removed "${word}" from banned words list.`);
          break;
        }

        case 'set-punishment': {
          const warns = interaction.options.getInteger('warns');
          const action = interaction.options.getString('action');
          const duration = interaction.options.getInteger('duration') || 5;

          const punishments = config.moderationWarnPunishments || [];
          const existing = punishments.findIndex(p => p.warns === warns);

          const rule = { warns, action, duration };

          if (existing !== -1) {
            punishments[existing] = rule;
          } else {
            punishments.push(rule);
          }

          punishments.sort((a, b) => a.warns - b.warns);

          await updateGuildConfig(interaction.guild.id, {
            moderationWarnPunishments: punishments,
          });

          let msg = `✅ Set punishment for ${warns} warning(s): **${action}**`;
          if (action === 'mute') msg += ` (${duration} minutes)`;
          await interaction.editReply(msg);
          break;
        }

        case 'remove-punishment': {
          const warns = interaction.options.getInteger('warns');
          const punishments = config.moderationWarnPunishments || [];
          const index = punishments.findIndex(p => p.warns === warns);

          if (index === -1) {
            await interaction.editReply(`⚠️ No punishment rule found for ${warns} warning(s).`);
            return;
          }

          punishments.splice(index, 1);
          await updateGuildConfig(interaction.guild.id, {
            moderationWarnPunishments: punishments,
          });
          await interaction.editReply(`✅ Removed punishment rule for ${warns} warning(s).`);
          break;
        }
      }
    } catch (error) {
      console.error('Moderation config error:', error);
      await interaction.editReply('❌ An error occurred while updating moderation settings.');
    }
  },
};

async function viewModerationConfig(interaction) {
  const config = await getGuildConfig(interaction.guild.id);

  const bannedWords = config.moderationBannedWords || [];
  const punishments = config.moderationWarnPunishments || [];

  const punishmentList = punishments.length > 0
    ? punishments.map(p => {
        let text = `${p.warns}x warn → **${p.action}**`;
        if (p.action === 'mute') text += ` (${p.duration}min)`;
        return text;
      }).join('\n')
    : 'No rules configured';

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('🛡️ Moderation Configuration')
    .addFields(
      { name: 'Status', value: config.moderationEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Log Channel', value: config.moderationLogChannelId ? `<#${config.moderationLogChannelId}>` : 'Not set', inline: true },
      { name: 'Auto-Warn', value: config.moderationAutoWarn ? '✅' : '❌', inline: true },
      { name: 'Auto-Mute', value: config.moderationAutoMute ? '✅' : '❌', inline: true },
      { name: 'Banned Words', value: bannedWords.length > 0 ? `||${bannedWords.join(', ')}||` : 'None', inline: false },
      { name: 'Punishment Escalation', value: punishmentList, inline: false },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
