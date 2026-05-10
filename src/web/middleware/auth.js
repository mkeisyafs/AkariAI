import axios from 'axios';

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

export function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
  next();
}

export function requireOwner(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  const botOwnerId = process.env.BOT_OWNER_ID;
  if (!botOwnerId || req.user.id !== botOwnerId) {
    return res.status(403).json({ error: 'Access denied. Only the bot owner can access the dashboard.' });
  }

  next();
}

export function requireWhitelist(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  const botOwnerId = process.env.BOT_OWNER_ID;
  if (botOwnerId && req.user.id !== botOwnerId) {
    return res.status(403).json({ error: 'Access denied. Only the bot owner can access the dashboard.' });
  }

  next();
}

export async function requireGuildAccess(req, res, next) {
  const { guildId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  if (!req.user.guilds || req.user.guilds.length === 0) {
    try {
      const guilds = await fetchGuildsWithRetry(req.user.accessToken);
      req.user.guilds = guilds;
    } catch (error) {
      console.error('Error fetching guilds in middleware:', error.message);
      return res.status(503).json({ 
        error: 'Unable to fetch guilds from Discord',
        message: 'Please try again in a moment'
      });
    }
  }

  const hasAccess = req.user.guilds.some(guild => guild.id === guildId);

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Forbidden. You do not have administrator permissions in this guild.'
    });
  }

  next();
}
