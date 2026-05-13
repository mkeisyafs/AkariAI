import { getGuildConfig } from '../utils/configManager.js';
import guildBotSettingsRepository from '../database/repositories/guildBotSettingsRepository.js';
import botRepository from '../database/repositories/botRepository.js';
import { generateAIResponseWithKnowledge } from '../services/aiService.js';
import { checkToxicity } from '../services/moderationService.js';
import userIgnoreListRepository from '../database/repositories/userIgnoreListRepository.js';
import { getCooldown, setCooldown } from '../services/botCooldowns.js';

export default {
  name: 'messageCreate',
  async execute(client, botId, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;

    const guildConfig = await getGuildConfig(guildId);
    if (guildConfig.moderationEnabled) {
      await checkToxicity(message, guildConfig);
    }

    const effective = await guildBotSettingsRepository.resolveEffectiveConfig(guildId, botId);
    if (!effective) return;
    if (!effective.enabled) return;

    const isIgnored = await userIgnoreListRepository.isUserIgnored(guildId, message.author.id);
    if (isIgnored) return;

    const isMentioned = message.mentions.has(client.user);
    const isReply = Boolean(message.reference) && message.type === 19;

    if (effective.replyOnlyMode) {
      if (!isMentioned && !isReply) return;
    } else {
      const shouldRespond = isMentioned || Math.random() * 100 < effective.responseChance;
      if (!shouldRespond) return;
    }

    if (
      Array.isArray(effective.allowedChannels) &&
      effective.allowedChannels.length > 0 &&
      !effective.allowedChannels.includes(message.channel.id)
    ) {
      return;
    }

    const lastResponse = getCooldown(botId, guildId, message.channel.id);
    if (lastResponse && Date.now() - lastResponse < effective.cooldownMs) {
      return;
    }

    const aiApiKey = await botRepository.getDecryptedApiKey(botId);

    const aiContext = {
      guildId,
      aiPersonality: effective.aiPersonality,
      aiBaseUrl: effective.aiBaseUrl,
      aiModel: effective.aiModel,
      aiApiKey,
      aiMaxTokens: effective.aiMaxTokens,
      aiContextMessages: effective.aiContextMessages,
    };

    try {
      await message.channel.sendTyping();

      const response = await generateAIResponseWithKnowledge(
        message.content,
        aiContext,
        {
          botId,
          client,
          channelId: message.channel.id,
          userId: message.author.id,
          username: message.author.username,
          senderIsOurBot: false,
          senderBotName: null,
        }
      );

      if (response) {
        await message.reply(response);
        setCooldown(botId, guildId, message.channel.id, Date.now());
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
    }
  },
};
