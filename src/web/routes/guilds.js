import { Router } from 'express';
import { requireAuth, requireGuildAccess, requireWhitelist } from '../middleware/auth.js';
import { checkGuildWhitelist } from '../middleware/guildWhitelist.js';
import guildConfigRepository from '../../database/repositories/guildConfigRepository.js';
import axios from 'axios';

const router = Router();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchGuildsWithRetry(accessToken, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.filter(guild => {
        const permissions = BigInt(guild.permissions);
        const ADMINISTRATOR = BigInt(0x8);
        return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
      });
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retry_after || 1;
        const waitTime = (retryAfter * 1000) + (attempt * 500);

        if (attempt < maxRetries - 1) {
          await sleep(waitTime);
          continue;
        }
      }
      throw error;
    }
  }
  return [];
}

async function fetchGuildMember(guildId, userId, botToken) {
  try {
    const response = await axios.get(
      `https://discord.com/api/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching member for guild ${guildId}:`, error.message);
    return null;
  }
}

router.get('/', requireAuth, requireWhitelist, async (req, res) => {
  try {
    if (!req.user.guilds || req.user.guilds.length === 0) {
      const guilds = await fetchGuildsWithRetry(req.user.accessToken);
      req.user.guilds = guilds;
    }

    const botToken = process.env.DISCORD_TOKEN;
    const guildsWithAccess = [];

    for (const guild of req.user.guilds) {
      const member = await fetchGuildMember(guild.id, req.user.id, botToken);

      const guildWithRoles = {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
        roles: member?.roles || [],
      };

      const whitelistCheck = await checkGuildWhitelist(
        guild.id,
        req.user,
        [guildWithRoles]
      );

      if (whitelistCheck.allowed) {
        guildsWithAccess.push({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
        });
      }
    }

    res.json(guildsWithAccess);
  } catch (error) {
    console.error('Error fetching guilds:', error.response?.status, error.response?.data || error.message);
    res.status(503).json({
      error: 'Unable to fetch guilds from Discord',
      message: 'Please try again in a moment'
    });
  }
});

router.get('/:guildId', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = req.user.guilds.find(g => g.id === guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const botToken = process.env.DISCORD_TOKEN;
    const member = await fetchGuildMember(guildId, req.user.id, botToken);

    const guildWithRoles = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.owner,
      roles: member?.roles || [],
    };

    const whitelistCheck = await checkGuildWhitelist(
      guildId,
      req.user,
      [guildWithRoles]
    );

    if (!whitelistCheck.allowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: whitelistCheck.reason
      });
    }

    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.owner,
    });
  } catch (error) {
    console.error('Error fetching guild:', error);
    res.status(500).json({ error: 'Failed to fetch guild' });
  }
});

router.get('/:guildId/config', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;

    const botToken = process.env.DISCORD_TOKEN;
    const member = await fetchGuildMember(guildId, req.user.id, botToken);
    const guild = req.user.guilds.find(g => g.id === guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const guildWithRoles = {
      ...guild,
      roles: member?.roles || [],
    };

    const whitelistCheck = await checkGuildWhitelist(
      guildId,
      req.user,
      [guildWithRoles]
    );

    if (!whitelistCheck.allowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: whitelistCheck.reason
      });
    }

    let config = await guildConfigRepository.findByGuildId(guildId);

    if (!config) {
      config = await guildConfigRepository.create(guildId);
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching guild config:', error);
    res.status(500).json({ error: 'Failed to fetch guild configuration' });
  }
});

router.patch('/:guildId/config', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;

    const botToken = process.env.DISCORD_TOKEN;
    const member = await fetchGuildMember(guildId, req.user.id, botToken);
    const guild = req.user.guilds.find(g => g.id === guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const guildWithRoles = {
      ...guild,
      roles: member?.roles || [],
    };

    const whitelistCheck = await checkGuildWhitelist(
      guildId,
      req.user,
      [guildWithRoles]
    );

    if (!whitelistCheck.allowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: whitelistCheck.reason
      });
    }

    const allowedFields = [
      'aiEnabled',
      'aiBaseUrl',
      'aiModel',
      'aiApiKey',
      'aiPersonality',
      'aiResponseChance',
      'aiCooldown',
      'aiAllowedChannels',
      'aiMaxTokens',
      'aiContextMessages',
      'aiReplyOnlyMode',
      'moderationEnabled',
      'moderationToxicityThreshold',
      'moderationAutoWarn',
      'moderationAutoMute',
      'moderationAutoKick',
      'moderationAutoBan',
      'moderationLogChannelId',
      'moderationBannedWords',
      'moderationWarnPunishments',
      'verificationEnabled',
      'verificationRoleId',
      'verificationChannelId',
      'verificationMethod',
      'verificationMessage',
      'verificationEmoji',
      'verificationButtonText',
      'verificationAlreadyVerifiedMessage',
      'welcomeEnabled',
      'welcomeChannelId',
      'welcomeMessage',
      'welcomeUseEmbed',
      'autoRoleEnabled',
      'autoRoleIds',
      'goodbyeEnabled',
      'goodbyeChannelId',
      'goodbyeMessage',
      'goodbyeUseEmbed',
      'whitelistEnabled',
      'whitelistUserIds',
      'whitelistRoleIds',
    ];

    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }

    const config = await guildConfigRepository.upsert(guildId, filteredUpdates);
    res.json(config);
  } catch (error) {
    console.error('Error updating guild config:', error);
    res.status(500).json({ error: 'Failed to update guild configuration' });
  }
});

router.post('/:guildId/verification/send', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId, message, emoji, buttonText, method } = req.body;

    const botToken = process.env.DISCORD_TOKEN;
    const member = await fetchGuildMember(guildId, req.user.id, botToken);
    const guild = req.user.guilds.find(g => g.id === guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const guildWithRoles = {
      ...guild,
      roles: member?.roles || [],
    };

    const whitelistCheck = await checkGuildWhitelist(
      guildId,
      req.user,
      [guildWithRoles]
    );

    if (!whitelistCheck.allowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: whitelistCheck.reason
      });
    }

    const { sendVerificationMessage } = await import('../../utils/verification.js');
    await sendVerificationMessage(guildId, channelId, message, emoji, buttonText, method);

    res.json({ success: true, message: 'Verification message sent' });
  } catch (error) {
    console.error('Error sending verification message:', error);
    res.status(500).json({ error: error.message || 'Failed to send verification message' });
  }
});

router.post('/:guildId/welcome/test', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;

    const botToken = process.env.DISCORD_TOKEN;
    const member = await fetchGuildMember(guildId, req.user.id, botToken);
    const guild = req.user.guilds.find(g => g.id === guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const guildWithRoles = {
      ...guild,
      roles: member?.roles || [],
    };

    const whitelistCheck = await checkGuildWhitelist(
      guildId,
      req.user,
      [guildWithRoles]
    );

    if (!whitelistCheck.allowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: whitelistCheck.reason
      });
    }

    const config = await guildConfigRepository.findByGuildId(guildId);
    if (!config || !config.welcomeChannelId) {
      return res.status(400).json({ error: 'Welcome channel is not configured' });
    }

    const { default: client } = await import('../../index.js');
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(404).json({ error: 'Bot is not in this guild' });
    }

    const channel = discordGuild.channels.cache.get(config.welcomeChannelId);
    if (!channel) {
      return res.status(404).json({ error: 'Welcome channel not found' });
    }

    const discordMember = await discordGuild.members.fetch(req.user.id).catch(() => null);
    const username = discordMember ? `<@${req.user.id}>` : req.user.username;

    const message = config.welcomeMessage
      .replace('{user}', username)
      .replace('{server}', discordGuild.name)
      .replace('{memberCount}', discordGuild.memberCount.toString());

    const { EmbedBuilder } = await import('discord.js');

    if (config.welcomeUseEmbed) {
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Welcome!')
        .setDescription(message)
        .setThumbnail(discordMember?.user.displayAvatarURL() || null)
        .setFooter({ text: 'This is a test message' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(`${message}\n-# This is a test message`);
    }

    res.json({ success: true, message: 'Test welcome message sent' });
  } catch (error) {
    console.error('Error sending test welcome message:', error);
    res.status(500).json({ error: error.message || 'Failed to send test welcome message' });
  }
});

router.post('/:guildId/goodbye/test', requireAuth, requireWhitelist, requireGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;

    const botToken = process.env.DISCORD_TOKEN;
    const member = await fetchGuildMember(guildId, req.user.id, botToken);
    const guild = req.user.guilds.find(g => g.id === guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const guildWithRoles = {
      ...guild,
      roles: member?.roles || [],
    };

    const whitelistCheck = await checkGuildWhitelist(
      guildId,
      req.user,
      [guildWithRoles]
    );

    if (!whitelistCheck.allowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: whitelistCheck.reason
      });
    }

    const config = await guildConfigRepository.findByGuildId(guildId);
    if (!config || !config.goodbyeChannelId) {
      return res.status(400).json({ error: 'Goodbye channel is not configured' });
    }

    const { default: client } = await import('../../index.js');
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(404).json({ error: 'Bot is not in this guild' });
    }

    const channel = discordGuild.channels.cache.get(config.goodbyeChannelId);
    if (!channel) {
      return res.status(404).json({ error: 'Goodbye channel not found' });
    }

    const discordMember = await discordGuild.members.fetch(req.user.id).catch(() => null);
    const username = discordMember ? discordMember.user.username : req.user.username;

    const message = config.goodbyeMessage
      .replace('{user}', username)
      .replace('{server}', discordGuild.name)
      .replace('{memberCount}', discordGuild.memberCount.toString());

    const { EmbedBuilder } = await import('discord.js');

    if (config.goodbyeUseEmbed) {
      const embed = new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle('Goodbye!')
        .setDescription(message)
        .setThumbnail(discordMember?.user.displayAvatarURL() || null)
        .setFooter({ text: 'This is a test message' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(`${message}\n-# This is a test message`);
    }

    res.json({ success: true, message: 'Test goodbye message sent' });
  } catch (error) {
    console.error('Error sending test goodbye message:', error);
    res.status(500).json({ error: error.message || 'Failed to send test goodbye message' });
  }
});

export default router;
