/**
 * Intended Meaning & Grammar Normalization Layer for FriendZone.
 *
 * Normalizes broken source grammar, typos, missing auxiliary verbs, and informal chat structures
 * BEFORE translating, so that Azure Translator receives the true INTENDED meaning rather than
 * producing literal or broken target-language translations.
 *
 * Invariant: Fixes grammar mentally, preserves facts & intent exactly, never inserts false certainty or altered pronouns.
 */

// Common typos & misspellings map
const TYPO_MAP: Record<string, string> = {
  'alot': 'a lot',
  'wiered': 'weird',
  'weirdo': 'weirdo',
  'frnd': 'friend',
  'frnds': 'friends',
  'wat': 'what',
  'wut': 'what',
  'yday': 'yesterday',
  'tomm': 'tomorrow',
  'tomrow': 'tomorrow',
  'bcoz': 'because',
  'bcuz': 'because',
  'cos': 'because',
  'coz': 'because',
  'becuz': 'because',
  'gud': 'good',
  'nvr': 'never',
  'sum1': 'someone',
  'any1': 'anyone',
  'no1': 'no one',
  'txt': 'text',
  'msg': 'message',
  'pic': 'picture',
  'pics': 'pictures',
};

// Grammar pattern replacement rules
const GRAMMAR_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // "he don't" / "she don't" / "it don't" -> "he doesn't"
  { pattern: /\b(he|she|it)\s+don'?t\b/gi, replacement: "$1 doesn't" },

  // "what u doing" / "what you doing" -> "what are you doing"
  { pattern: /\bwhat\s+(u|you)\s+doing\b/gi, replacement: "what are you doing" },

  // "yesterday i go" -> "yesterday I went"
  { pattern: /\byesterday\s+i\s+go\b/gi, replacement: "yesterday I went" },

  // "yesterday i buy" -> "yesterday I bought"
  { pattern: /\byesterday\s+i\s+buy\b/gi, replacement: "yesterday I bought" },

  // "go market" -> "go to the market" / "went to the market"
  { pattern: /\bwent\s+market\b/gi, replacement: "went to the market" },
  { pattern: /\bgo\s+market\b/gi, replacement: "go to the market" },

  // "buy many thing" -> "buy many things" / "bought many things"
  { pattern: /\bmany\s+thing\b/gi, replacement: "many things" },

  // Missing apostrophes in common contractions
  { pattern: /\bdont\b/gi, replacement: "don't" },
  { pattern: /\bcant\b/gi, replacement: "can't" },
  { pattern: /\bwont\b/gi, replacement: "won't" },
  { pattern: /\bdidnt\b/gi, replacement: "didn't" },
  { pattern: /\bisnt\b/gi, replacement: "isn't" },
  { pattern: /\bdoesnt\b/gi, replacement: "doesn't" },
  { pattern: /\bhavent\b/gi, replacement: "haven't" },
  { pattern: /\bwouldnt\b/gi, replacement: "wouldn't" },
  { pattern: /\bcouldnt\b/gi, replacement: "couldn't" },
  { pattern: /\bshouldnt\b/gi, replacement: "shouldn't" },
];

/**
 * Intended Meaning Normalizer: Normalizes typos, broken verb agreements,
 * and chat shorthand while preserving core intent, pronouns, and modality.
 */
export function normalizeIntendedMeaning(text: string): { normalizedText: string; isModified: boolean } {
  let result = text;
  let isModified = false;

  // 1. Normalize typos & single token misspellings
  const words = result.split(/(\s+)/);
  const correctedWords = words.map((token) => {
    const trimmed = token.trim();
    if (!trimmed) return token;

    const lower = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    const typoCorrection = TYPO_MAP[lower];

    if (typoCorrection) {
      isModified = true;
      const prefix = trimmed.match(/^[^\w]+/)?.[0] || '';
      const suffix = trimmed.match(/[^\w]+$/)?.[0] || '';
      return `${prefix}${typoCorrection}${suffix}`;
    }

    return token;
  });

  result = correctedWords.join('');

  // 2. Apply grammar pattern corrections
  for (const rule of GRAMMAR_PATTERNS) {
    if (rule.pattern.test(result)) {
      result = result.replace(rule.pattern, rule.replacement);
      isModified = true;
    }
  }

  return {
    normalizedText: result,
    isModified,
  };
}
