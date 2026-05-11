import { getGuildConfig } from '../utils/configManager.js';
import { generateAIResponseWithKnowledge } from '../services/aiService.js';
import { checkToxicity } from '../services/moderationService.js';
import userIgnoreListRepository from '../database/repositories/userIgnoreListRepository.js';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const config = await getGuildConfig(message.guild.id);

    if (config.moderationEnabled) {
      await checkToxicity(message, config);
    }

    if (!config.aiEnabled) {
      return;
    }

    const isIgnored = await userIgnoreListRepository.isUserIgnored(
      message.guild.id,
      message.author.id
    );

    if (isIgnored) {
      return;
    }

    const isMentioned = message.mentions.has(message.client.user);
    const isReply = message.reference && message.type === 19;

    if (config.aiReplyOnlyMode) {
      if (!isMentioned && !isReply) {
        return;
      }
    } else {
      const shouldRespond = isMentioned || Math.random() * 100 < config.aiResponseChance;
      if (!shouldRespond) return;
    }

    if (config.aiAllowedChannels.length > 0 &&
        !config.aiAllowedChannels.includes(message.channel.id)) {
      return;
    }

    const cooldownKey = `${message.guild.id}-${message.channel.id}`;
    const lastResponse = message.client.cooldowns.get(cooldownKey);

    if (lastResponse && Date.now() - lastResponse < config.aiCooldown) {
      return;
    }

    try {
      await message.channel.sendTyping();

      const response = await generateAIResponseWithKnowledge(
        message.content,
        config,
        message.channel.id,
        message.author.id,
        message.author.username
      );

      if (response) {
        await message.reply(response);
        message.client.cooldowns.set(cooldownKey, Date.now());
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
    }
  },
};
