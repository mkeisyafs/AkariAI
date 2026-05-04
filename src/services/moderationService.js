import { EmbedBuilder } from 'discord.js';
import { moderationLogRepository, userWarningRepository } from '../database/repositories/index.js';

export async function checkToxicity(message, config) {
  const content = message.content.toLowerCase();
  const bannedWords = config.moderationBannedWords || [];

  if (bannedWords.length === 0) return;

  let matched = false;
  let matchedWord = '';

  for (const word of bannedWords) {
    if (content.includes(word.toLowerCase())) {
      matched = true;
      matchedWord = word;
      break;
    }
  }

  if (!matched) return;

  try {
    await message.delete();

    const warningCount = await warnUser(
      message.guild.id,
      message.author.id,
      message.client.user.id,
      `Banned word detected: ${matchedWord}`
    );

    const punishment = getPunishment(config, warningCount);

    switch (punishment.action) {
      case 'warn':
        await message.channel.send(
          `⚠️ ${message.author}, your message was removed for violating server rules. (Warning ${warningCount})`
        );
        break;

      case 'mute':
        await message.member.timeout(punishment.duration * 60 * 1000, `Warning ${warningCount}: Banned word detected`);
        await message.channel.send(
          `🔇 ${message.author} has been muted for ${punishment.duration} minutes. (Warning ${warningCount})`
        );
        break;

      case 'kick':
        await message.channel.send(
          `👢 ${message.author} has been kicked. (Warning ${warningCount})`
        );
        await message.member.kick(`Warning ${warningCount}: Banned word detected`);
        break;

      case 'ban':
        await message.channel.send(
          `🔨 ${message.author} has been banned. (Warning ${warningCount})`
        );
        await message.member.ban({ reason: `Warning ${warningCount}: Banned word detected` });
        break;
    }

    await logModeration(
      message.guild.id,
      message.author.id,
      message.client.user.id,
      punishment.action,
      `Warning ${warningCount}: Banned word "${matchedWord}"`,
      config
    );
  } catch (error) {
    console.error('Error in toxicity check:', error);
  }
}

function getPunishment(config, warningCount) {
  const punishments = config.moderationWarnPunishments || [];

  const sorted = [...punishments]
    .filter(p => p.warns <= warningCount)
    .sort((a, b) => b.warns - a.warns);

  if (sorted.length > 0) {
    return sorted[0];
  }

  if (config.moderationAutoMute) {
    return { action: 'mute', duration: 5 };
  }
  if (config.moderationAutoWarn) {
    return { action: 'warn', duration: 0 };
  }

  return { action: 'warn', duration: 0 };
}

export async function warnUser(guildId, userId, moderatorId, reason) {
  await userWarningRepository.addWarning(guildId, userId, moderatorId, reason);
  const warningCount = await userWarningRepository.getWarningCount(guildId, userId);
  return warningCount;
}

export async function logModeration(guildId, userId, moderatorId, action, reason, config) {
  await moderationLogRepository.create({
    guildId,
    userId,
    moderatorId,
    action,
    reason,
  });

  if (config.moderationLogChannelId) {
    try {
      const { default: client } = await import('../index.js');
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(config.moderationLogChannelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(`Moderation Action: ${action.toUpperCase()}`)
        .addFields(
          { name: 'User', value: `<@${userId}>`, inline: true },
          { name: 'Moderator', value: `<@${moderatorId}>`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error logging moderation:', error);
    }
  }
}
