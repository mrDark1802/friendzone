import crypto from 'crypto';

/**
 * Normalizes source text for translation caching.
 * Trims leading/trailing whitespace and collapses multiple internal spaces
 * while strictly PRESERVING character capitalization.
 */
export function normalizeTranslationText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Generates a SHA-256 hash of the normalized text.
 */
export function hashTranslationText(text: string): string {
  const normalized = normalizeTranslationText(text);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Constructs a deterministic Redis translation cache key.
 * Format: fz:trans:{provider}:{sourceLang}:{targetLang}:{sha256(normalizedText)}
 */
export function buildRedisTranslationKey(
  provider: string,
  sourceLang: string,
  targetLang: string,
  textHash: string
): string {
  return `fz:trans:${provider.toLowerCase()}:${sourceLang.toLowerCase()}:${targetLang.toLowerCase()}:${textHash}`;
}

/**
 * Lexicographical canonical pair helper for 1-to-1 friendships and direct conversations.
 */
export function getCanonicalPair(userA: string, userB: string): { userId1: string; userId2: string; canonicalPair: string } {
  const [userId1, userId2] = userA < userB ? [userA, userB] : [userB, userA];
  return {
    userId1,
    userId2,
    canonicalPair: `${userId1}:${userId2}`,
  };
}
