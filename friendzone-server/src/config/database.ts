import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

declare global {
  var prismaSingleton: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaSingleton ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaSingleton = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('🐘 PostgreSQL Database connected successfully via Prisma Client');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to PostgreSQL Database');
    throw error;
  }
}
