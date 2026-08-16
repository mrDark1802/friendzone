import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.config.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { prisma } from './config/database.js';
import { checkRedisHealth } from './config/redis.js';

// Import Module Routers
import authRouter from './modules/auth/auth.routes.js';
import usersRouter from './modules/users/users.routes.js';
import friendshipsRouter from './modules/friendships/friendships.routes.js';
import conversationsRouter from './modules/conversations/conversations.routes.js';
import messagesRouter from './modules/messages/messages.routes.js';
import moderationRouter from './modules/moderation/moderation.routes.js';
import notificationsRouter from './modules/notifications/notifications.routes.js';
import reviewsRouter from './modules/reviews/reviews.routes.js';
import callsRouter from './modules/calls/calls.routes.js';
import mediaRouter from './modules/media/media.routes.js';

export function createApp(): Express {
  const app = express();

  // Trust proxy headers for accurate client IP resolution behind localtunnels and proxies
  app.set('trust proxy', 1);

  // Security Headers & Referrer Policy Configuration
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    })
  );

  // Comprehensive CORS Configuration for both Local Development and Live Production
  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000',
    'https://sandeepworks.in',
    'https://friendzone-g05i.onrender.com',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const envOrigins = [env.CORS_ORIGIN, env.FRONTEND_URL].filter(Boolean);
        const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

        if (allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        callback(null, origin || true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    })
  );

  // Parsers & Body Size Limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Pino HTTP Request Logging
  app.use(
    (pinoHttp as any)({
      logger,
      autoLogging: env.NODE_ENV !== 'test',
    })
  );

  // Decoupled Health Checks
  // Liveness Check: Process is responsive
  app.get('/health/liveness', (req: Request, res: Response) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
  });

  // Readiness Check: PostgreSQL is reachable for writes
  app.get('/health/readiness', async (req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'READY', database: 'CONNECTED' });
    } catch (error) {
      res.status(503).json({ status: 'NOT_READY', database: 'DISCONNECTED' });
    }
  });

  // Dependency Health Check: Redis and background services
  app.get('/health/deps', async (req: Request, res: Response) => {
    const isRedisOk = await checkRedisHealth();
    res.status(200).json({
      status: isRedisOk ? 'HEALTHY' : 'DEGRADED',
      redis: isRedisOk ? 'OK' : 'DOWN',
      translationProvider: env.TRANSLATION_PROVIDER,
    });
  });

  // API Version 1 Route Wiring
  const apiV1 = express.Router();
  apiV1.use('/auth', authRouter);
  apiV1.use('/users', usersRouter);
  apiV1.use('/friendships', friendshipsRouter);
  apiV1.use('/conversations', conversationsRouter);
  apiV1.use('/messages', messagesRouter);
  apiV1.use('/moderation', moderationRouter);
  apiV1.use('/notifications', notificationsRouter);
  apiV1.use('/reviews', reviewsRouter);
  apiV1.use('/calls', callsRouter);
  apiV1.use('/media', mediaRouter);

  app.use('/api/v1', apiV1);

  // Global Error Handler Middleware
  app.use(errorHandler);

  return app;
}
