import { Router } from 'express';
import passport from 'passport';

const router = Router();

// T28: session/identity endpoint mounted at /api/me by server.js.
// Kept in this file so auth-related routes live together.
const SNOWFLAKE_RE = /^[0-9]{15,20}$/;
function parseAdminIds() {
  return (process.env.GLOBAL_ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => SNOWFLAKE_RE.test(s));
}

export const meRouter = Router();
meRouter.get('/', (req, res) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const adminIds = parseAdminIds();
  res.json({
    userId: req.user.id,
    username: req.user.username,
    avatar: req.user.avatar || null,
    isGlobalAdmin: adminIds.includes(req.user.id),
  });
});

router.get('/discord', passport.authenticate('discord'));

router.get(
  '/callback',
  passport.authenticate('discord', {
    failureRedirect: process.env.FRONTEND_URL || 'http://localhost:5173',
  }),
  (req, res) => {
    const botOwnerId = process.env.BOT_OWNER_ID;
    if (botOwnerId && req.user.id !== botOwnerId) {
      req.logout(() => {});
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=access_denied`);
    }
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  }
);

router.get('/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id, username, discriminator, avatar, guilds } = req.user;
  res.json({
    id,
    username,
    discriminator,
    avatar,
    guilds: (guilds || []).map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
    })),
  });
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;
