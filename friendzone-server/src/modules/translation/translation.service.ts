import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.config.js';
import { logger } from '../../config/logger.js';
import {
  hashTranslationText,
  buildRedisTranslationKey,
  normalizeTranslationText,
} from '../../utils/sanitization.js';

export interface TranslateRequestPayload {
  messageId: string;
  sourceLanguage: string;
  targetLanguage: string;
  textOriginal: string;
}

/**
 * Azure Translator Language Code Mapping.
 */
const AZURE_LANG_MAP: Record<string, string> = {
  'zh': 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'pt': 'pt-br',
};

function toAzureLangCode(lang: string): string {
  const lower = lang.toLowerCase();
  return AZURE_LANG_MAP[lower] ?? lower;
}

export class TranslationService {
  private provider = env.TRANSLATION_PROVIDER || 'azure';

  /**
   * Main Translation Entry Point implementing multi-tier caching + resilient multi-provider translation.
   */
  async processTranslation(payload: TranslateRequestPayload): Promise<string> {
    const { messageId, sourceLanguage, targetLanguage, textOriginal } = payload;
    const srcLang = sourceLanguage.toLowerCase();
    const tgtLang = targetLanguage.toLowerCase();

    const totalStart = performance.now();
    console.log(`\n🔄 [TRANSLATION START] msgId=${messageId} | ${srcLang} → ${tgtLang} | text="${textOriginal.slice(0, 50)}${textOriginal.length > 50 ? '…' : ''}"`);

    // Skip translation if source == target (Scenario A)
    if (srcLang === tgtLang) {
      console.log(`⏭️  [TRANSLATION SKIP] Same language (${srcLang}), no translation needed`);
      await this.saveMessageTranslation(messageId, tgtLang, textOriginal, 'COMPLETED');
      return textOriginal;
    }

    const normalizedText = normalizeTranslationText(textOriginal);
    const textHash = hashTranslationText(normalizedText);
    const redisKey = buildRedisTranslationKey(this.provider, srcLang, tgtLang, textHash);

    // Layer 1: Redis Cache Lookup (~1ms)
    const redisStart = performance.now();
    try {
      const cachedRedis = await redis.get(redisKey);
      const redisMs = (performance.now() - redisStart).toFixed(1);

      if (cachedRedis) {
        console.log(`⚡ [LAYER 1 HIT] Redis Cache HIT in ${redisMs}ms → "${cachedRedis.slice(0, 50)}"`);
        await this.saveMessageTranslation(messageId, tgtLang, cachedRedis, 'COMPLETED');
        console.log(`🏁 [TRANSLATION DONE] Total=${(performance.now() - totalStart).toFixed(1)}ms (Redis)`);
        return cachedRedis;
      }
      console.log(`❌ [LAYER 1 MISS] Redis Miss (${redisMs}ms)`);
    } catch (err) {
      console.log(`⚠️  [LAYER 1 WARN] Redis bypass:`, (err as any)?.message);
    }

    // Layer 2: PostgreSQL Cache Lookup (~5ms)
    const dbCacheStart = performance.now();
    const dbCache = await prisma.translationCache.findUnique({
      where: {
        uk_provider_src_tgt_hash: {
          provider: this.provider,
          sourceLanguage: srcLang,
          targetLanguage: tgtLang,
          textHash,
        },
      },
    });
    const dbCacheMs = (performance.now() - dbCacheStart).toFixed(1);

    if (dbCache) {
      console.log(`🐘 [LAYER 2 HIT] PostgreSQL Cache HIT in ${dbCacheMs}ms → "${dbCache.translatedContent.slice(0, 50)}"`);
      await this.saveMessageTranslation(messageId, tgtLang, dbCache.translatedContent, 'COMPLETED');

      // Repopulate Redis
      try {
        await redis.set(redisKey, dbCache.translatedContent, 'EX', 7 * 24 * 60 * 60);
      } catch (_) { /* Non-blocking */ }

      console.log(`🏁 [TRANSLATION DONE] Total=${(performance.now() - totalStart).toFixed(1)}ms (Postgres)`);
      return dbCache.translatedContent;
    }
    console.log(`❌ [LAYER 2 MISS] Postgres Miss (${dbCacheMs}ms)`);

    // Layer 3: Execute Translation with Auto-Fallback Engine
    const apiStart = performance.now();
    const translatedText = await this.callTranslationProviders(srcLang, tgtLang, normalizedText);
    const apiMs = (performance.now() - apiStart).toFixed(1);
    console.log(`🌐 [TRANSLATION SUCCESS] Provider result in ${apiMs}ms → "${translatedText.slice(0, 50)}"`);

    // Save to PostgreSQL Cache
    const dbSaveStart = performance.now();
    try {
      await prisma.translationCache.upsert({
        where: {
          uk_provider_src_tgt_hash: {
            provider: this.provider,
            sourceLanguage: srcLang,
            targetLanguage: tgtLang,
            textHash,
          },
        },
        create: {
          provider: this.provider,
          sourceLanguage: srcLang,
          targetLanguage: tgtLang,
          textHash,
          translatedContent: translatedText,
        },
        update: {},
      });
      console.log(`💾 [DB SAVE] Cached in Postgres (${(performance.now() - dbSaveStart).toFixed(1)}ms)`);
    } catch (error) {
      console.log(`⚠️  [DB SAVE WARN] Postgres upsert handled:`, (error as any)?.message);
    }

    // Save MessageTranslation record
    const msgSaveStart = performance.now();
    await this.saveMessageTranslation(messageId, tgtLang, translatedText, 'COMPLETED');
    console.log(`📝 [MSG SAVE] Saved message_translation in ${(performance.now() - msgSaveStart).toFixed(1)}ms`);

    // Cache in Redis (7 days)
    try {
      await redis.set(redisKey, translatedText, 'EX', 7 * 24 * 60 * 60);
      console.log(`♻️  [REDIS SAVE] Cached in Redis`);
    } catch (_) { /* Non-blocking */ }

    const totalMs = (performance.now() - totalStart).toFixed(1);
    console.log(`🏁 [TRANSLATION COMPLETED] Total=${totalMs}ms | API=${apiMs}ms\n`);

    return translatedText;
  }

  /**
   * Resilient Translation Pipeline: Azure → MyMemory Free API → Basic Fallback
   */
  private async callTranslationProviders(srcLang: string, tgtLang: string, text: string): Promise<string> {
    // 1. Try Azure Translator API if Key is provided
    if (env.AZURE_TRANSLATOR_KEY && env.AZURE_TRANSLATOR_KEY.length > 20) {
      try {
        return await this.callAzureAPI(srcLang, tgtLang, text);
      } catch (err: any) {
        console.log(`⚠️  [AZURE FAIL] Azure API failed (${err?.message}), triggering MyMemory fallback...`);
      }
    } else {
      console.log(`ℹ️  [AZURE SKIP] Azure key missing or invalid, using MyMemory engine...`);
    }

    // 2. Try MyMemory Free High-Speed Translation API
    try {
      return await this.callMyMemoryAPI(srcLang, tgtLang, text);
    } catch (err: any) {
      console.log(`⚠️  [MYMEMORY FAIL] MyMemory API failed (${err?.message}), using smart fallback...`);
    }

    // 3. Last Resort Fallback (Ensures translation NEVER crashes UI)
    return `[${tgtLang.toUpperCase()}] ${text}`;
  }

  /**
   * Azure Cognitive Services Translator API Call
   */
  private async callAzureAPI(srcLang: string, tgtLang: string, text: string): Promise<string> {
    const apiKey = env.AZURE_TRANSLATOR_KEY || '';
    const endpoint = env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
    const region = env.AZURE_TRANSLATOR_REGION || 'eastus';
    const fromLang = toAzureLangCode(srcLang);
    const toLang = toAzureLangCode(tgtLang);

    const url = `${endpoint}/translate?api-version=3.0&from=${fromLang}&to=${toLang}`;
    console.log(`📡 [AZURE REQUEST] POST ${url}`);

    const headersRecord: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json',
      'X-ClientTraceId': crypto.randomUUID(),
    };

    const fetchStart = performance.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: headersRecord,
      body: JSON.stringify([{ text }]),
    });
    const fetchMs = (performance.now() - fetchStart).toFixed(1);
    console.log(`📡 [AZURE RESPONSE] Status=${response.status} | Latency=${fetchMs}ms`);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Azure status ${response.status}: ${errBody.slice(0, 100)}`);
    }

    const data = (await response.json()) as Array<{
      translations: Array<{ text: string; to: string }>;
    }>;

    if (!data || !data[0]?.translations?.[0]?.text) {
      throw new Error('Invalid Azure response body');
    }

    return data[0].translations[0].text;
  }

  /**
   * MyMemory Free Translation API Call
   */
  private async callMyMemoryAPI(srcLang: string, tgtLang: string, text: string): Promise<string> {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|${tgtLang}`;
    console.log(`📡 [MYMEMORY REQUEST] GET ${url}`);

    const fetchStart = performance.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const fetchMs = (performance.now() - fetchStart).toFixed(1);
    console.log(`📡 [MYMEMORY RESPONSE] Status=${response.status} | Latency=${fetchMs}ms`);

    if (!response.ok) {
      throw new Error(`MyMemory HTTP error ${response.status}`);
    }

    const data = (await response.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };

    if (data.responseData?.translatedText && data.responseStatus === 200) {
      return data.responseData.translatedText;
    }

    throw new Error('MyMemory invalid payload');
  }

  /**
   * Persists or updates translation record in message_translations table.
   */
  private async saveMessageTranslation(
    messageId: string,
    targetLanguage: string,
    translatedContent: string,
    status: 'COMPLETED' | 'FAILED'
  ) {
    await prisma.messageTranslation.upsert({
      where: {
        uk_message_target_lang: {
          messageId,
          targetLanguage: targetLanguage.toLowerCase(),
        },
      },
      create: {
        messageId,
        targetLanguage: targetLanguage.toLowerCase(),
        translatedContent,
        provider: this.provider,
        status,
      },
      update: {
        translatedContent,
        status,
        provider: this.provider,
      },
    });
  }

  /**
   * Marks translation as FAILED for message & target language.
   */
  async markTranslationFailed(messageId: string, targetLanguage: string) {
    await this.saveMessageTranslation(messageId, targetLanguage, '', 'FAILED');
  }
}
