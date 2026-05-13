import express from 'express';
import cors from 'cors';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { configurePassport } from './config/passport.js';
import authRoutes, { meRouter } from './routes/auth.js';
import guildRoutes from './routes/guilds.js';
import moderationRoutes from './routes/moderation.js';
import knowledgeRoutes from './routes/knowledge.js';
import adminBotsRouter from './routes/admin/bots.js';
import guildBotsRouter from './routes/guildBots.js';
import pairChanceRouter from './routes/pairChance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MemoryStore = createMemoryStore(session);

// startWebServer accepts either a BotManager (multi-bot, preferred) or a
// legacy single discord.js Client (backwards-compatible during T22 transition).
// Legacy routes pull a client lazily via `req.app.locals.getDiscordClient()` so
// that at request time we always hand back the *currently* READY client — not
// a snapshot taken at boot before any bot finished logging in.
export function startWebServer(botManagerOrClient) {
  const app = express();
  const PORT = process.env.WEB_PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  const isBotManager =
    botManagerOrClient &&
    typeof botManagerOrClient.getAllHandles === 'function' &&
    typeof botManagerOrClient.getClient === 'function';

  const getDiscordClient = () => {
    if (!isBotManager) return botManagerOrClient || null;
    const handles = botManagerOrClient.getAllHandles();
    for (const h of handles) {
      const c = botManagerOrClient.getClient(h.botId);
      if (c && typeof c.isReady === 'function' && c.isReady()) return c;
    }
    return null;
  };

  app.locals.botManager = isBotManager ? botManagerOrClient : null;
  app.locals.getDiscordClient = getDiscordClient;
  // TODO(T22): remove this legacy assignment once all routes consume
  // getDiscordClient() / botManager.getClient(botId) directly.
  Object.defineProperty(app.locals, 'discordClient', {
    get: getDiscordClient,
    configurable: true,
    enumerable: true,
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  }));

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    session({
      store: new MemoryStore({
        checkPeriod: 86400000,
      }),
      secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      },
    })
  );

  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRouter);
  app.use('/api/guilds', guildRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/guilds', knowledgeRoutes);
  app.use('/api/admin/bots', adminBotsRouter);
  app.use('/api/guilds/:guildId/bots', guildBotsRouter);
  app.use('/api/guilds/:guildId/pair-chance', pairChanceRouter);

  app.get('/api/health', (req, res) => {
    const client = getDiscordClient();
    const bots = isBotManager
      ? botManagerOrClient.getAllHandles().map((h) => ({
          botId: h.botId,
          status: h.status,
          discordBotUserId: h.discordBotUserId,
        }))
      : undefined;
    res.json({
      status: 'ok',
      bot: client && client.user ? {
        username: client.user.username,
        id: client.user.id,
      } : null,
      ...(bots ? { bots } : {}),
    });
  });

  const webDistPath = path.join(__dirname, '../../web/dist');

  if (isProduction) {
    app.use(express.static(webDistPath));
    app.use((req, res) => {
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: isProduction ? 'Something went wrong' : err.message,
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Web server running on http://localhost:${PORT}`);
    if (!isProduction) {
      console.log(`   Frontend dev server: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    }
  });

  return app;
}
