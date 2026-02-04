import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { createAPIServer } from './api/app.js';
import { createSocketServer } from './socket/server.js';
import { logger } from './config/logger.js';

dotenv.config();

async function bootstrap() {
  try {
    logger.info('🚀 Starting Poke-Edu Server...');
    
    // Connexions DB & Redis
    await connectDatabase();
    await connectRedis();
    
    // Démarrer serveurs
    const apiServer = createAPIServer();
    const socketServer = createSocketServer();
    
    logger.info('✓ All servers started successfully');
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      apiServer.close(() => logger.info('API server closed'));
      socketServer.close(() => logger.info('Socket server closed'));
      
      await disconnectDatabase();
      await disconnectRedis();
      
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
