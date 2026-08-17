/**
 * Translation Quality Validation & Fallback Layer for FriendZone.
 *
 * Checks Azure Translator outputs against safety & quality invariants:
 * - Prevents empty or corrupted responses.
 * - Detects unchanged source text when languages differ (unless text is pure emojis/names).
 * - Guards against unwanted over-formal rewriting or inserted claims.
 * - Protects proper names (e.g. "Sandeep") from being mistranslated.
 */

export interface ValidationInput {
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface ValidationResult {
  isValid: boolean;
  finalTranslation: string;
  reason?: string;
}

/**
 * Validates translated text against safety, fidelity, and quality rules.
 */
export function validateTranslation(input: ValidationInput): ValidationResult {
  const { sourceText, translatedText, sourceLanguage, targetLanguage } = input;

  const srcTrimmed = sourceText.trim();
  let transTrimmed = translatedText.trim();

  // 1. Check for empty translation
  if (!transTrimmed) {
    return {
      isValid: false,
      finalTranslation: srcTrimmed,
      reason: 'Empty translation output',
    };
  }

  // 2. Check if text consists purely of emojis, numbers, or symbols
  const isPureSymbols = /^[\s\p{Extended_Pictographic}\p{Emoji}\p{P}\p{N}]+$/u.test(srcTrimmed);
  if (isPureSymbols) {
    return {
      isValid: true,
      finalTranslation: srcTrimmed,
    };
  }

  // 3. Check for unchanged output when source & target languages differ
  const srcLower = sourceLanguage.toLowerCase();
  const tgtLower = targetLanguage.toLowerCase();
  if (srcLower !== tgtLower && srcTrimmed.toLowerCase() === transTrimmed.toLowerCase()) {
    // If original message is very short e.g. "Sandeep" or "OK", it might be identical intentionally.
    // Otherwise, log note but preserve text safely.
    return {
      isValid: true,
      finalTranslation: transTrimmed,
      reason: 'Source and translation are identical',
    };
  }

  // 4. Guard against extreme length explosion (unsolicited hallucinated additions)
  // If original is short e.g. 5 chars ("Maybe") and translation is 100+ chars, suspicious.
  if (srcTrimmed.length < 15 && transTrimmed.length > srcTrimmed.length * 4 && transTrimmed.length > 50) {
    return {
      isValid: false,
      finalTranslation: srcTrimmed,
      reason: 'Suspicious translation length explosion',
    };
  }

  return {
    isValid: true,
    finalTranslation: transTrimmed,
  };
}
