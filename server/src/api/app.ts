import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { pvpRouter } from './routes/pvp.routes.js';
import { shopRouter } from './routes/shop.routes.js';
import { collectionRouter } from './routes/collection.routes.js';
import { questionRouter } from './routes/question.routes.js';
import { battleRouter } from './routes/battle.routes.js';
import { wheelRouter } from './routes/wheel.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { logger } from '../config/logger.js';

export function createApp(): express.Application {
  const app: express.Application = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
    }),
  );
  app.use(express.json());

  // Routes d'authentification et utilisateur
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  
  // Routes du jeu
  app.use('/api/pvp', pvpRouter);
  app.use('/api/shop', shopRouter);
  app.use('/api/collection', collectionRouter);
  app.use('/api/question', questionRouter);
  app.use('/api/battle', battleRouter);
  app.use('/api/wheel', wheelRouter);
  
  // Routes admin (accès secret)
  app.use('/api/admin', adminRouter);
  
  // Routes IA (génération de questions)
  app.use('/api/ai', aiRouter);

  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'api' }));

  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('API error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  });

  return app;
}

export function createAPIServer() {
  const app = createApp();
  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, () => {
    logger.info(`API Server listening on port ${PORT}`);
  });

  return server;
}
