/**
 * Slang & Internet Language Intelligence Layer for FriendZone Translation Engine.
 *
 * Captures conversational abbreviations, informal expressions, internet slang,
 * and emotional laughter expressions across multiple popular languages.
 *
 * Purpose: Ensures slang is translated with its casual conversational INTENT
 * rather than rigid textbook expansion or literal character-by-character translation.
 */

export interface SlangEntry {
  term: string;
  intent: string; // Informal meaning / conversational equivalent
  preserveCasualTone: boolean;
}

const COMMON_SLANG_MAP: Record<string, string> = {
  // English Internet Slang & Abbreviations
  'wyd': 'what are you doing',
  'rn': 'right now',
  'idk': "i don't know",
  'ikr': 'i know right',
  'ngl': 'not gonna lie',
  'tbh': 'to be honest',
  'fr': 'for real',
  'lol': 'haha',
  'lmao': 'hahaha',
  'lmaooo': 'hahahaha',
  'rofl': 'hahaha',
  'bruh': 'bro',
  'bro': 'bro',
  'omg': 'oh my god',
  'omgg': 'oh my god',
  'omggg': 'oh my god',
  'imo': 'in my opinion',
  'imho': 'in my humble opinion',
  'btw': 'by the way',
  'afaik': 'as far as i know',
  'smh': 'shaking my head',
  'tbf': 'to be fair',
  'nvm': 'never mind',
  'ttyl': 'talk to you later',
  'ofc': 'of course',
  'pls': 'please',
  'plz': 'please',
  'thx': 'thanks',
  'ty': 'thank you',
  'wbu': 'what about you',
  'hbu': 'how about you',
  'brb': 'be right back',
  'bff': 'best friend',
  'istg': 'i swear to god',
  'tf': 'what the hell',
  'wtff': 'what the hell',

  // Spanish Conversational Slang & Shorthand
  'pq': 'porque',
  'tmb': 'también',
  'q': 'que',
  'dnd': 'de nada',
  'ns': 'no sé',
  'ntp': 'no te preocupes',
  'jjj': 'jajaja',
  'jajaja': 'hahaha',
  'jajajaja': 'hahahaha',
  'xfa': 'por favor',
  'k': 'que',
  'tb': 'también',

  // French Conversational Slang
  'slt': 'salut',
  'stp': "s'il te plaît",
  'svp': "s'il vous plaît",
  'mdr': 'hahaha',
  'ptdr': 'hahaha',
  'stg': 'je te jure',

  // German Conversational Shorthand
  'vg': 'viele grüße',
  'lg': 'liebe grüße',
  'kb': 'keine lust',
  'hmd': 'gott sei dank',

  // Korean Conversational Slang & Onomatopoeia
  'ㅋㅋ': 'hahaha',
  'ㅋㅋㅋ': 'hahaha',
  'ㅋㅋㅋㅋ': 'hahahaha',
  'ㅎㅎ': 'haha',
  'ㅎㅎㅎ': 'hahaha',
  'ㄱㅅ': '감사합니다',
  'ㄴㄴ': '아니야',
  'ㅇㅇ': '응',
  'ㄷㄷ': '대박',
  'ㅠㅠ': '😭',
  'ㅜㅜ': '😭',
};

/**
 * Normalizes and checks if a token is a known slang term.
 */
export function getSlangIntent(word: string): string | null {
  const clean = word.toLowerCase().replace(/[^a-z0-9áéíóúñäöüß가-힣]/g, '');
  return COMMON_SLANG_MAP[clean] || null;
}

/**
 * Pre-processes slang in source text so Azure Translator translates the intended
 * casual phrase rather than failing on unrecognized abbreviations.
 */
export function preprocessSlangInText(text: string): { processedText: string; replacedTerms: Array<{ original: string; expanded: string }> } {
  const words = text.split(/(\s+)/);
  const replacedTerms: Array<{ original: string; expanded: string }> = [];

  const processedWords = words.map((token) => {
    const trimmed = token.trim();
    if (!trimmed) return token;

    // Check if token matches slang
    const cleanWord = trimmed.toLowerCase().replace(/[^a-z0-9áéíóúñäöüß가-힣]/g, '');
    const intent = COMMON_SLANG_MAP[cleanWord];

    if (intent && cleanWord.length <= 6) {
      // Keep punctuation surrounding token
      const prefix = trimmed.match(/^[^\w가-힣]+/)?.[0] || '';
      const suffix = trimmed.match(/[^\w가-힣]+$/)?.[0] || '';
      replacedTerms.push({ original: trimmed, expanded: intent });
      return `${prefix}${intent}${suffix}`;
    }

    return token;
  });

  return {
    processedText: processedWords.join(''),
    replacedTerms,
  };
}
