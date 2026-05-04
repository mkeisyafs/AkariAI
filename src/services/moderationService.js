import { EmbedBuilder } from 'discord.js';
import { moderationLogRepository, userWarningRepository } from '../database/repositories/index.js';

const toxicKeywords = [
  'badword1', 'badword2', 'offensive',
];

export async function checkToxicity(message, config) {
  const content = message.content.toLowerCase();
  let isToxic = false;

  for (const keyword of toxicKeywords) {
    if (content.includes(keyword)) {
      isToxic = true;
      break;
    }
  }

  if (!isToxic) return;

  try {
    await message.delete();

    if (config.moderationAutoWarn) {
      await warnUser(message.guild.id, message.author.id, message.client.user.id, 'Toxic message detected');
      await message.channel.send(`⚠️ ${message.author}, your message was removed for violating server rules.`);
    }

    if (config.moderationAutoMute) {
      await message.member.timeout(5 * 60 * 1000, 'Toxic message detected');
    }

    await logModeration(message.guild.id, message.author.id, message.client.user.id, 'warn', 'Toxic message detected', config);
  } catch (error) {
    console.error('Error in toxicity check:', error);
  }
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
      const channel = await getChannelById(guildId, config.moderationLogChannelId);

      if (channel) {
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
      }
    } catch (error) {
      console.error('Error logging moderation:', error);
    }
  }
}

async function getChannelById(guildId, channelId) {
  return null;
}
