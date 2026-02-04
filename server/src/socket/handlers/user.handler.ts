import { Socket } from 'socket.io';
import { getUserById } from '../../services/user.service.js';

export function registerUserSocketHandlers(socket: Socket) {
  socket.on('user:get_profile', async (data, callback) => {
    // TODO: Auth middleware to set socket.data.userId
    const userId = socket.data.userId || 1; // fallback for demo
    const user = await getUserById(userId);
    if (!user) return callback({ error: 'User not found' });
    callback({ user });
  });
}
