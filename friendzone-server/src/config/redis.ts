import { Redis } from 'ioredis';
import { env } from './env.config.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) return null; // Stop retrying if Redis is not available
    return Math.min(times * 100, 1000);
  },
});

redis.on('connect', () => {
  logger.info('⚡ Redis client connecting...');
});

redis.on('ready', () => {
  logger.info('🔴 Redis client ready and connected');
});

redis.on('error', (err) => {
  // Silent log when Redis is offline for local dev
});

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    return false;
  }
}
