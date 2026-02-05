import { Server as HTTPServer, createServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';
import { registerUserSocketHandlers } from './handlers/user.handler.js';
import { registerPvpSocketHandlers } from './handlers/pvp.handler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'poke_edu_secret_key';

interface SocketData {
  userId: number;
  username: string;
}

export function createSocketServer() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  
  const PORT = process.env.SOCKET_PORT || 3001;
  
  // Authentification middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token'));
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });
  
  // Connexion client
  io.on('connection', (socket) => {
    const typedSocket = socket as Socket<any, any, any, SocketData>;
    logger.info(`User connected: ${typedSocket.data.username} (ID: ${typedSocket.data.userId})`);
    
    // Join user-specific room for targeted notifications
    typedSocket.join(`user_${typedSocket.data.userId}`);
    
    // Register all handlers
    registerUserSocketHandlers(typedSocket);
    registerPvpSocketHandlers(io as any, typedSocket as any);
    
    typedSocket.on('disconnect', () => {
      logger.info(`User disconnected: ${typedSocket.data.username}`);
    });
  });
  
  httpServer.listen(PORT, () => {
    logger.info(`WebSocket Server listening on port ${PORT}`);
  });
  
  // Export io for use in other modules
  (global as any).__io = io;
  
  return httpServer;
}

// Helper to get io instance from other modules
export function getIO(): Server | undefined {
  return (global as any).__io;
}
