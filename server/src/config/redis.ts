import { createClient, RedisClientType } from 'redis';

export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
}) as RedisClientType;

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('✓ Redis connected'));

export async function connectRedis() {
  await redis.connect();
}

export async function disconnectRedis() {
  await redis.quit();
}
