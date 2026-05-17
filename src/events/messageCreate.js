import { getGuildConfig } from '../utils/configManager.js';
import guildBotSettingsRepository from '../database/repositories/guildBotSettingsRepository.js';
import botRepository from '../database/repositories/botRepository.js';
import botPairChanceRepository from '../database/repositories/botPairChanceRepository.js';
import conversationHistoryRepository from '../database/repositories/conversationHistoryRepository.js';
import userIgnoreListRepository from '../database/repositories/userIgnoreListRepository.js';
import { generateAIResponseWithKnowledge } from '../services/aiService.js';
import { checkToxicity } from '../services/moderationService.js';
import { getCooldown, setCooldown } from '../services/botCooldowns.js';
import botManager from '../services/botManager.js';
import loopGuard from '../services/loopGuard.js';
import { consumeForcedReplyTicket } from '../services/forcedReplyTickets.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'messageCreate',
  async execute(client, botId, message) {
    if (!message.guild) return;
    if (message.system) return;
    if (client.user && message.author.id === client.user.id) return;

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    const effective = await guildBotSettingsRepository.resolveEffectiveConfig(guildId, botId);
    if (!effective || !effective.enabled) return;

    const senderId = message.author.id;
    const isHuman = !message.author.bot;
    let isOurBot = false;
    let senderBotId = null;
    let senderBot = null;

    if (!isHuman) {
      if (botManager.isOurBot(senderId)) {
        senderBotId = botManager.getBotIdByUserId(senderId);
        if (senderBotId && senderBotId !== botId) {
          isOurBot = true;
          try {
            senderBot = await botRepository.getBotById(senderBotId);
          } catch {
            senderBot = null;
          }
        }
      }
      if (!isOurBot) return;
    }

    if (isOurBot && senderBot && message.content) {
      try {
        await conversationHistoryRepository.addCrossBotMessage(
          botId,
          guildId,
          channelId,
          senderId,
          senderBot.name,
          message.content
        );
      } catch {
        /* non-fatal */
      }
    }

    const senderType = isHuman
      ? 'human'
      : isOurBot
      ? 'our-bot'
      : message.author.bot
      ? 'external-bot'
      : 'self';
    logger.info('msg.sender.classified', { botId, guildId, channelId, senderType });

    if (isHuman) {
      loopGuard.registerHumanMessage(guildId, channelId);
    }

    if (isHuman) {
      try {
        // Moderation config lives on legacy GuildConfig (guild-scoped, not per-bot).
        const guildConfig = await getGuildConfig(guildId);
        if (guildConfig && guildConfig.moderationEnabled) {
          await checkToxicity(message, guildConfig);
        }
      } catch (err) {
        logger.error('msg.moderation.failed', {
          botId,
          guildId,
          channelId,
          error: err && err.message ? err.message : String(err),
        });
      }
    }

    if (isHuman) {
      const isIgnored = await userIgnoreListRepository.isUserIgnored(guildId, botId, senderId);
      if (isIgnored) return;
    }

    let shouldReply = false;
    let skipGating = false;
    let bypassChainAndCooldown = false;

    if (isHuman) {
      const isMentioned = message.mentions.has(client.user);
      const isReply = Boolean(message.reference) && message.type === 19;

      const mentionedAnotherOfOurBots = message.mentions.users.some(
        (u) => u.id !== client.user.id && botManager.isOurBot(u.id)
      );
      if (mentionedAnotherOfOurBots && !isMentioned) {
        return;
      }

      if (effective.replyOnlyMode) {
        shouldReply = isMentioned || isReply;
      } else {
        const chance = typeof effective.responseChance === 'number' ? effective.responseChance : 100;
        shouldReply = isMentioned || Math.random() * 100 < chance;
      }
      if (!shouldReply) return;

      const allowed = Array.isArray(effective.allowedChannels) ? effective.allowedChannels : [];
      if (allowed.length > 0 && !allowed.includes(channelId)) return;

      const cooldownMs = typeof effective.cooldownMs === 'number' ? effective.cooldownMs : 3000;
      const last = getCooldown(botId, guildId, channelId);
      if (last && Date.now() - last < cooldownMs) return;

      skipGating = true;
    } else if (isOurBot) {
      const weAreMentioned = message.mentions.has(client.user);

      const forcedReplyConsumed = consumeForcedReplyTicket(
        guildId,
        channelId,
        botId,
        senderBotId
      );

      if (forcedReplyConsumed) {
        shouldReply = true;
        bypassChainAndCooldown = true;
        logger.info('msg.forced.reply', { botId, guildId, channelId, senderBotId });
      } else if (weAreMentioned && effective.mentionBypassMatrix) {
        shouldReply = true;
        bypassChainAndCooldown = true;
        logger.info('msg.mention.bypass', { botId, guildId, channelId, senderBotId });
      } else {
        if (!effective.botToBotEnabled) return;
        const chance = await botPairChanceRepository.getPairChance(guildId, senderBotId, botId);
        if (!chance || chance <= 0) {
          logger.debug('msg.pair.roll', {
            botId,
            senderBotId,
            guildId,
            channelId,
            chance: chance || 0,
            decision: 'skip',
          });
          return;
        }
        const roll = Math.random() * 100;
        shouldReply = roll < chance;
        logger.debug('msg.pair.roll', {
          botId,
          senderBotId,
          guildId,
          channelId,
          chance,
          roll,
          decision: shouldReply ? 'reply' : 'skip',
        });
        if (!shouldReply) return;
      }
    } else {
      return;
    }

    const guardCfg = {
      maxChainDepth: effective.maxChainDepth ?? 10,
      channelCooldownMs: effective.channelCooldownMs ?? 1500,
      circuitBreakerCount: effective.circuitBreakerCount ?? 10,
      circuitBreakerWindowMs: effective.circuitBreakerWindowMs ?? 60000,
      circuitBreakerPauseMs: effective.circuitBreakerPauseMs ?? 300000,
    };
    const reservation = loopGuard.tryReserveBotReply(
      guildId,
      channelId,
      guardCfg,
      { isHumanInitiated: skipGating, bypassChainAndCooldown, listenerBotId: botId }
    );
    if (!reservation.ok) {
      logger.info('msg.refused', {
        botId,
        guildId,
        channelId,
        reason: reservation.reason,
        isCrossBot: isOurBot,
      });
      return;
    }

    const aiConfig = {
      guildId,
      aiPersonality: effective.aiPersonality,
      aiBaseUrl: effective.aiBaseUrl,
      aiModel: effective.aiModel,
      aiApiKey: effective.aiApiKey,
      aiMaxTokens: effective.aiMaxTokens,
      aiContextMessages: effective.aiContextMessages,
    };

    const aiContext = {
      botId,
      client,
      channelId,
      userId: senderId,
      username: message.author.username,
      senderIsOurBot: isOurBot,
      senderBotName: senderBot?.name ?? null,
    };

    try {
      await message.channel.sendTyping();
    } catch {
      /* non-fatal */
    }

    let response;
    try {
      response = await generateAIResponseWithKnowledge(message.content, aiConfig, aiContext);
    } catch (err) {
      logger.error('msg.ai.generate_failed', {
        botId,
        guildId,
        channelId,
        error: err && err.message ? err.message : String(err),
      });
      reservation.release();
      return;
    }

    if (!response) {
      reservation.release();
      return;
    }

    try {
      await message.reply(response);
      if (isHuman) {
        setCooldown(botId, guildId, channelId, Date.now());
      }
      reservation.commit();
      logger.info('msg.reply.sent', {
        botId,
        guildId,
        channelId,
        isCrossBot: isOurBot,
      });
    } catch (err) {
      logger.error('msg.reply.failed', {
        botId,
        guildId,
        channelId,
        error: err && err.message ? err.message : String(err),
      });
      reservation.release();
    }
  },
};
