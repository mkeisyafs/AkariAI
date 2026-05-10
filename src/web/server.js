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
import authRoutes from './routes/auth.js';
import guildRoutes from './routes/guilds.js';
import moderationRoutes from './routes/moderation.js';
import knowledgeRoutes from './routes/knowledge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MemoryStore = createMemoryStore(session);

export function startWebServer(discordClient) {
  const app = express();
  const PORT = process.env.WEB_PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
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
  app.use('/api/guilds', guildRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/guilds', knowledgeRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      bot: discordClient.user ? {
        username: discordClient.user.username,
        id: discordClient.user.id,
      } : null,
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
