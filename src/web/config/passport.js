import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';

export function configurePassport() {
  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/api/auth/callback',
        scope: ['identify', 'guilds'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          if (!accessToken) {
            console.error('No access token received from Discord OAuth');
            return done(new Error('No access token'), null);
          }

          const user = {
            id: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
            avatar: profile.avatar,
            guilds: [],
            accessToken: accessToken,
          };

          return done(null, user);
        } catch (error) {
          console.error('Unexpected error in OAuth callback:', error.message);
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}
