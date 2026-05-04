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

export function requireGuildAccess(req, res, next) {
  const { guildId } = req.params;

  if (!req.user || !req.user.guilds) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  const hasAccess = req.user.guilds.some(guild => guild.id === guildId);

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Forbidden. You do not have administrator permissions in this guild.'
    });
  }

  next();
}
