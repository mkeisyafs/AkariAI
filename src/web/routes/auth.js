import { Router } from 'express';
import passport from 'passport';

const router = Router();

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
    guilds: guilds.map(g => ({
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
