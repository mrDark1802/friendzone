import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { r2Service } from '../services/storage/r2.service.js';
import { RETENTION_CONFIG } from '../config/media.config.js';
import { logger } from '../config/logger.js';

export async function runMediaCleanupBatch(): Promise<{ cleanedExpired: number; cleanedAbandoned: number }> {
  logger.info('Starting server-side scheduled media cleanup job...');
  let cleanedExpired = 0;
  let cleanedAbandoned = 0;

  // 1. Expired Chat Media Cleanup (Batch processing)
  try {
    const expiredAssets = await prisma.mediaAsset.findMany({
      where: {
        mediaCategory: 'CHAT',
        expiresAt: { lte: new Date() },
        deletedAt: null,
      },
      take: RETENTION_CONFIG.CLEANUP_BATCH_SIZE,
    });

    for (const asset of expiredAssets) {
      try {
        await r2Service.deleteObject(asset.storageKey);
        if (asset.thumbnailKey) {
          await r2Service.deleteObject(asset.thumbnailKey);
        }

        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: {
            uploadStatus: 'DELETED',
            deletedAt: new Date(),
          },
        });
        cleanedExpired++;
      } catch (err) {
        logger.error({ err, mediaId: asset.id }, 'Failed to clean up expired media item');
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Error querying expired media assets');
  }

  // 2. Abandoned PENDING Uploads Cleanup (PENDING > 24 hours)
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - RETENTION_CONFIG.PENDING_RETENTION_HOURS * 3600 * 1000
    );

    const abandonedAssets = await prisma.mediaAsset.findMany({
      where: {
        uploadStatus: 'PENDING',
        createdAt: { lte: twentyFourHoursAgo },
        deletedAt: null,
      },
      take: RETENTION_CONFIG.CLEANUP_BATCH_SIZE,
    });

    for (const asset of abandonedAssets) {
      try {
        await r2Service.deleteObject(asset.storageKey);
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: {
            uploadStatus: 'FAILED',
            deletedAt: new Date(),
          },
        });
        cleanedAbandoned++;
      } catch (err) {
        logger.error({ err, mediaId: asset.id }, 'Failed to clean up abandoned media item');
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Error querying abandoned PENDING uploads');
  }

  logger.info(
    { cleanedExpired, cleanedAbandoned },
    'Completed server-side media cleanup job batch'
  );

  return { cleanedExpired, cleanedAbandoned };
}

export function startMediaCleanupCron() {
  const cronSchedule = RETENTION_CONFIG.CLEANUP_CRON;
  const timezone = RETENTION_CONFIG.CLEANUP_TIMEZONE;

  logger.info({ cronSchedule, timezone }, 'Initializing media cleanup cron scheduler...');

  cron.schedule(
    cronSchedule,
    async () => {
      try {
        await runMediaCleanupBatch();
      } catch (err) {
        logger.error({ err }, 'Unhandled error during scheduled media cleanup cron execution');
      }
    },
    { timezone }
  );
}
