import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';
import { TooManyRequestsError } from '../utils/errors.utils.js';
import { logger } from '../config/logger.js';

const inMemoryCounters = new Map<string, { count: number; expiresAt: number }>();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  isSecurityCritical?: boolean;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix, isSecurityCritical = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Resolve client IP using forwarded header or socket connection
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
    // Key by user identifier (e.g. email) + IP to prevent cross-user lockouts
    const userIdentifier = req.body?.email ? req.body.email.trim().toLowerCase() : 'anon';
    const key = `fz:rl:${keyPrefix}:${userIdentifier}:${rawIp}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      // Redis Sliding Window Counter
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        res.setHeader('Retry-After', windowSeconds);
        throw new TooManyRequestsError(`Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds}s.`);
      }

      return next();
    } catch (error) {
      if (error instanceof TooManyRequestsError) {
        return next(error);
      }

      logger.error({ error, keyPrefix, isSecurityCritical }, '⚠️ Redis Rate Limiter error');

      // Fallback Strategy for Auth/Security Critical Endpoints
      if (isSecurityCritical) {
        const now = Date.now();
        const memRecord = inMemoryCounters.get(key);

        if (!memRecord || now > memRecord.expiresAt) {
          inMemoryCounters.set(key, { count: 1, expiresAt: now + windowMs });
          return next();
        }

        memRecord.count += 1;
        if (memRecord.count > maxRequests) {
          res.setHeader('Retry-After', windowSeconds);
          return next(new TooManyRequestsError('Auth rate limit exceeded (Fallback mode).'));
        }
      }

      // Fail-Open for lower-risk read endpoints if Redis is down
      return next();
    }
  };
}

// Pre-configured rate limiters
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute per user/IP
  keyPrefix: 'auth',
  isSecurityCritical: true,
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 300,
  keyPrefix: 'api',
  isSecurityCritical: false,
});
