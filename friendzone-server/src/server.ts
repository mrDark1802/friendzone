import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/database.js';
import { initializeSocketServer } from './infrastructure/websocket/socket.server.js';
import { startMediaCleanupCron } from './jobs/mediaCleanup.job.js';

async function bootstrap() {
  try {
    // 1. Connect to Database via Prisma
    await connectDatabase();

    // 2. Create Express Application
    const app = createApp();

    // 3. Create HTTP Server
    const server = http.createServer(app);

    // 4. Initialize Socket.IO Server
    initializeSocketServer(server);

    // 5. Initialize Media Cleanup Cron Job
    startMediaCleanupCron();

    // 5. Start Server Listener
    server.listen(env.PORT, () => {
      logger.info(
        `🚀 FriendZone Server running at http://localhost:${env.PORT} (Environment: ${env.NODE_ENV})`
      );
    });

    // Graceful Shutdown Handling
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down FriendZone Server gracefully...');

      server.close(() => {
        logger.info('HTTP Server closed.');
      });

      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ error }, '🔥 Server bootstrap failed!');
    process.exit(1);
  }
}

bootstrap();
