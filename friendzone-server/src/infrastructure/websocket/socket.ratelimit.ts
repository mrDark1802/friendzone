import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';

export interface RateLimitConfig {
  points: number; // Max requests
  durationSeconds: number; // Time window in seconds
}

export const SOCKET_RATE_LIMITS: Record<string, RateLimitConfig> = {
  send_message: { points: 25, durationSeconds: 10 },
  edit_message: { points: 15, durationSeconds: 10 },
  delete_message: { points: 15, durationSeconds: 10 },
  typing: { points: 40, durationSeconds: 10 },
  mark_read: { points: 40, durationSeconds: 10 },
  call_action: { points: 15, durationSeconds: 10 },
  general: { points: 50, durationSeconds: 10 },
};

// In-memory fallback if Redis is unreachable
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks and increments rate limit counter for a user and action.
 * Returns true if allowed, false if rate limited.
 */
export async function checkSocketRateLimit(
  userId: string,
  action: keyof typeof SOCKET_RATE_LIMITS = 'general'
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const config = SOCKET_RATE_LIMITS[action] || SOCKET_RATE_LIMITS.general;
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `rl:ws:${userId}:${action}:${Math.floor(now / config.durationSeconds)}`;

  try {
    const current = await redis.incr(windowKey);
    if (current === 1) {
      await redis.expire(windowKey, config.durationSeconds + 1);
    }

    if (current > config.points) {
      const ttl = await redis.ttl(windowKey);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, ttl),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, config.points - current),
      retryAfterSeconds: 0,
    };
  } catch (err) {
    // Fallback to in-memory window
    const memKey = `${userId}:${action}`;
    const entry = memoryStore.get(memKey);

    if (!entry || now >= entry.resetTime) {
      memoryStore.set(memKey, { count: 1, resetTime: now + config.durationSeconds });
      return { allowed: true, remaining: config.points - 1, retryAfterSeconds: 0 };
    }

    entry.count += 1;
    if (entry.count > config.points) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, entry.resetTime - now),
      };
    }

    return {
      allowed: true,
      remaining: config.points - entry.count,
      retryAfterSeconds: 0,
    };
  }
}
