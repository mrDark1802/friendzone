import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.config.js';
import { logger } from '../../config/logger.js';
import {
  hashTranslationText,
  buildRedisTranslationKey,
  normalizeTranslationText,
} from '../../utils/sanitization.js';

import { preprocessSlangInText } from './slangDictionary.js';
import { extractFormattingMetadata, restoreFormatting } from './formattingPreservation.js';
import { getConversationContext, formatContextPrompt } from './contextEngine.js';
import { validateTranslation } from './translationValidation.js';
import { normalizeIntendedMeaning } from './grammarNormalizer.js';

export interface TranslateRequestPayload {
  messageId: string;
  conversationId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  textOriginal: string;
}

export interface WordBreakdownItem {
  original: string;
  translated: string;
}

/**
 * Azure Translator Language Code Mapping.
 * Maps 2-letter codes and script variants to Azure's exact BCP-47 requirements.
 * For standard 2-letter codes (en, es, fr, de, ja, ko, hi, ar, etc.), Azure reads the code directly.
 */
const AZURE_LANG_MAP: Record<string, string> = {
  // Chinese Script Dialects
  'zh': 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-hant': 'zh-Hant',

  // Portuguese Regional Dialects
  'pt': 'pt-br',
  'pt-br': 'pt-br',
  'pt-pt': 'pt-pt',

  // Norwegian (Azure expects 'nb' for Norwegian Bokmål)
  'no': 'nb',
  'nor': 'nb',

  // Tagalog / Filipino
  'tl': 'fil',

  // Serbian Script Variants
  'sr': 'sr-Cyrl',
  'sr-cyrl': 'sr-Cyrl',
  'sr-latn': 'sr-Latn',

  // Mongolian
  'mn': 'mn-Cyrl',
};

function toAzureLangCode(lang: string): string {
  const lower = lang.toLowerCase();
  return AZURE_LANG_MAP[lower] ?? lower;
}

export class TranslationService {
  private provider = env.TRANSLATION_PROVIDER || 'azure';

  /**
   * Main Natural Context-Aware Translation Entry Point.
   * Preserves slang, emojis, emotional intensity, character repetitions, and conversational tone.
   */
  async processTranslation(payload: TranslateRequestPayload): Promise<string> {
    const { messageId, conversationId, sourceLanguage, targetLanguage, textOriginal } = payload;
    const srcLang = sourceLanguage.toLowerCase();
    const tgtLang = targetLanguage.toLowerCase();

    const totalStart = performance.now();
    console.log(`\n🔄 [NATURAL TRANSLATION START] msgId=${messageId} | ${srcLang} → ${tgtLang} | text="${textOriginal.slice(0, 50)}${textOriginal.length > 50 ? '…' : ''}"`);

    // Skip translation if source == target
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
    } catch (err) {
      /* Non-blocking Redis bypass */
    }

    // Layer 2: PostgreSQL Cache Lookup (~5ms)
    try {
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

      if (dbCache) {
        console.log(`🐘 [LAYER 2 HIT] PostgreSQL Cache HIT → "${dbCache.translatedContent.slice(0, 50)}"`);
        await this.saveMessageTranslation(messageId, tgtLang, dbCache.translatedContent, 'COMPLETED');
        try {
          await redis.set(redisKey, dbCache.translatedContent, 'EX', 7 * 24 * 60 * 60);
        } catch (_) {}
        return dbCache.translatedContent;
      }
    } catch (_) {}

    // Layer 3: Natural Context-Aware Translation Pipeline
    const apiStart = performance.now();

    // 3a. Extract formatting, emoji, and emotional repetition metadata
    const formatMeta = extractFormattingMetadata(textOriginal);

    // 3b. Normalize broken source grammar & typos to capture intended meaning
    const { normalizedText: grammarNormalized } = normalizeIntendedMeaning(normalizedText);

    // 3c. Pre-process conversational slang and internet abbreviations
    const { processedText } = preprocessSlangInText(grammarNormalized);

    // 3c. Fetch recent conversation context window (if conversationId provided)
    const recentContext = conversationId
      ? await getConversationContext(conversationId, messageId, 3)
      : [];
    const contextPrompt = formatContextPrompt(recentContext);

    // Prepare final text to translate (combine lightweight context if message is short or ambiguous)
    const textToTranslate = (processedText.length < 25 && contextPrompt)
      ? `${contextPrompt} ${processedText}`
      : processedText;

    // 3d. Execute Azure / Provider Translation
    let rawTranslation = await this.callTranslationProviders(srcLang, tgtLang, textToTranslate);

    // Clean up any context markers if returned in translation
    if (contextPrompt && rawTranslation.includes('[Context:')) {
      rawTranslation = rawTranslation.replace(/\[Context:[^\]]+\]\s*/gi, '').trim();
    }

    // 3e. Restore Emojis, Punctuation, Character Repetitions, and Emotional Intensity
    const restoredTranslation = restoreFormatting(rawTranslation, formatMeta);

    // 3f. Quality & Safety Validation
    const validation = validateTranslation({
      sourceText: textOriginal,
      translatedText: restoredTranslation,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
    });

    const finalTranslation = validation.finalTranslation;
    const apiMs = (performance.now() - apiStart).toFixed(1);
    console.log(`🌐 [TRANSLATION SUCCESS] Natural result in ${apiMs}ms → "${finalTranslation.slice(0, 50)}"`);

    // Save to PostgreSQL Cache
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
          translatedContent: finalTranslation,
        },
        update: {},
      });
    } catch (_) {}

    // Save MessageTranslation record
    await this.saveMessageTranslation(messageId, tgtLang, finalTranslation, 'COMPLETED');

    // Cache in Redis (7 days)
    try {
      await redis.set(redisKey, finalTranslation, 'EX', 7 * 24 * 60 * 60);
    } catch (_) {}

    const totalMs = (performance.now() - totalStart).toFixed(1);
    console.log(`🏁 [TRANSLATION COMPLETED] Total=${totalMs}ms | API=${apiMs}ms\n`);

    return finalTranslation;
  }

  /**
   * Generates optional word-level breakdown for educational expansion.
   */
  async getWordBreakdown(
    originalText: string,
    translatedText: string,
    srcLang: string,
    tgtLang: string
  ): Promise<WordBreakdownItem[]> {
    const origTokens = originalText.trim().split(/\s+/).filter(Boolean);
    const transTokens = translatedText.trim().split(/\s+/).filter(Boolean);

    if (origTokens.length === 0) return [];

    const breakdown: WordBreakdownItem[] = [];
    const minLen = Math.min(origTokens.length, transTokens.length);

    for (let i = 0; i < minLen; i++) {
      breakdown.push({
        original: origTokens[i],
        translated: transTokens[i] || transTokens[transTokens.length - 1],
      });
    }

    // If original tokens are longer, map remaining
    if (origTokens.length > minLen) {
      for (let i = minLen; i < origTokens.length; i++) {
        breakdown.push({
          original: origTokens[i],
          translated: translatedText,
        });
      }
    }

    return breakdown;
  }

  /**
   * Resilient Translation Pipeline: Azure → MyMemory Free API → Basic Fallback
   */
  private async callTranslationProviders(srcLang: string, tgtLang: string, text: string): Promise<string> {
    if (env.AZURE_TRANSLATOR_KEY && env.AZURE_TRANSLATOR_KEY.length > 20) {
      try {
        return await this.callAzureAPI(srcLang, tgtLang, text);
      } catch (err: any) {
        console.log(`⚠️  [AZURE FAIL] Azure API failed (${err?.message}), triggering MyMemory fallback...`);
      }
    }

    try {
      return await this.callMyMemoryAPI(srcLang, tgtLang, text);
    } catch (err: any) {
      console.log(`⚠️  [MYMEMORY FAIL] MyMemory API failed (${err?.message}), using smart fallback...`);
    }

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

    const headersRecord: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json',
      'X-ClientTraceId': crypto.randomUUID(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: headersRecord,
      body: JSON.stringify([{ text }]),
    });

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

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

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
    // Skip messageTranslation record if messageId is synthetic test ID
    if (messageId.startsWith('test_')) return;

    try {
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
    } catch (_) {
      /* Non-blocking handle */
    }
  }

  /**
   * Marks translation as FAILED for message & target language.
   */
  async markTranslationFailed(messageId: string, targetLanguage: string) {
    await this.saveMessageTranslation(messageId, targetLanguage, '', 'FAILED');
  }
}
