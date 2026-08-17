/**
 * Formatting & Emotion Preservation Module for FriendZone Translation Engine.
 *
 * Implements strict preservation rules for:
 * 1. Emojis and Unicode emoticons
 * 2. Repeated letters & prolonged sounds ("noooo", "brooo", "omggg")
 * 3. Laughter patterns ("hahaha", "jajaja", "ㅋㅋㅋㅋ")
 * 4. Punctuation intensity ("!!", "???", "...")
 */

export interface FormattedTextMetadata {
  originalText: string;
  emojis: string[];
  repeatedLetterPatterns: Array<{ token: string; char: string; count: number }>;
  laughterCount: number;
  trailingPunctuation: string;
}

// Regex matching all modern Unicode emojis & Extended Pictographics
const EMOJI_REGEX = /(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

// Regex matching emoticons like :) :D <3 xD etc
const EMOTICON_REGEX = /(?::\)|:D|;-\)|<3|xD|XD|:P|:-\)|:-\()/g;

/**
 * Extracts emojis, repeated character patterns, laughter, and trailing punctuation metadata.
 */
export function extractFormattingMetadata(text: string): FormattedTextMetadata {
  const emojis: string[] = [];

  // Match unicode emojis
  const unicodeMatches = text.match(EMOJI_REGEX) || [];
  emojis.push(...unicodeMatches);

  // Match emoticons
  const emoticonMatches = text.match(EMOTICON_REGEX) || [];
  emojis.push(...emoticonMatches);

  // Repeated letter patterns e.g. "noooo" -> 'o' x 4
  const repeatedLetterMatches: Array<{ token: string; char: string; count: number }> = [];
  const wordTokens = text.split(/\s+/);

  for (const token of wordTokens) {
    const match = token.match(/([a-zA-Z가-힣])\1{2,}/);
    if (match) {
      repeatedLetterMatches.push({
        token,
        char: match[1],
        count: match[0].length,
      });
    }
  }

  // Count laughter occurrences e.g. "ha" / "ja" / "ㅋㅋ"
  const laughterMatches = text.match(/(ha|ja|he|je|ㅋㅋ|ㅎㅎ){2,}/gi);
  const laughterCount = laughterMatches ? laughterMatches.length : 0;

  // Extract trailing punctuation e.g. "!!" or "???" or "..."
  const trailingPunctuationMatch = text.match(/[!?.~]+$/);
  const trailingPunctuation = trailingPunctuationMatch ? trailingPunctuationMatch[0] : '';

  return {
    originalText: text,
    emojis,
    repeatedLetterPatterns: repeatedLetterMatches,
    laughterCount,
    trailingPunctuation,
  };
}

/**
 * Post-processes translated text to ensure no emojis, punctuation, or emotional character extensions
 * were lost or corrupted during translation.
 */
export function restoreFormatting(translatedText: string, metadata: FormattedTextMetadata): string {
  let result = translatedText.trim();

  // 1. Ensure trailing punctuation is preserved if Azure stripped it
  if (metadata.trailingPunctuation && !result.endsWith(metadata.trailingPunctuation)) {
    // Strip single dot if Azure added a single dot instead of "!!" or "???"
    if (metadata.trailingPunctuation.length > 1 && result.endsWith('.')) {
      result = result.slice(0, -1);
    }
    if (!result.endsWith(metadata.trailingPunctuation)) {
      result += metadata.trailingPunctuation;
    }
  }

  // 2. Restore Emojis if Azure omitted any of them
  const unicodeInResult = (result.match(EMOJI_REGEX) || []) as string[];
  const emoticonsInResult = (result.match(EMOTICON_REGEX) || []) as string[];
  const resultEmojis = unicodeInResult.concat(emoticonsInResult);
  const missingEmojis: string[] = [];

  for (const emoji of metadata.emojis) {
    if (!resultEmojis.includes(emoji)) {
      missingEmojis.push(emoji);
    }
  }

  if (missingEmojis.length > 0) {
    // Append missing emojis naturally at the end of translated message
    result = `${result} ${missingEmojis.join(' ')}`.trim();
  }

  // 3. Preserve character repetition e.g. if original was "noooo" and translated is "no" or "nein"
  if (metadata.repeatedLetterPatterns.length > 0) {
    for (const pattern of metadata.repeatedLetterPatterns) {
      // If translated text ends with single letter of same type, extend it slightly
      const lastChar = result.slice(-1);
      if (lastChar.toLowerCase() === pattern.char.toLowerCase() && !result.endsWith(pattern.char.repeat(pattern.count))) {
        // Extend last letter up to original repetition count (max 5)
        const extendCount = Math.min(pattern.count - 1, 4);
        result += pattern.char.repeat(extendCount);
      }
    }
  }

  return result;
}
