import { TranslationService, TranslateRequestPayload } from '../../modules/translation/translation.service.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.config.js';

export const TRANSLATION_QUEUE_NAME = 'translation-queue';

const translationService = new TranslationService();

/**
 * Enqueues translation job or executes sync translation if Redis is offline.
 */
export async function enqueueTranslationJob(payload: TranslateRequestPayload) {
  const provider = env.TRANSLATION_PROVIDER || 'deepl';
  try {
    const translatedText = await translationService.processTranslation(payload);
    logger.info({ messageId: payload.messageId, provider }, 'Instant translation processed successfully');
    return translatedText;
  } catch (error: any) {
    logger.error({ messageId: payload.messageId, error: error.message }, 'Translation processing error');
    return null;
  }
}
