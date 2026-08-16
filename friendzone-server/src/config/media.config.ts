import dotenv from 'dotenv';
dotenv.config();

export const MEDIA_LIMITS = {
  IMAGE: parseInt(process.env.MAX_IMAGE_SIZE_BYTES || '', 10) || 10 * 1024 * 1024,
  VIDEO: parseInt(process.env.MAX_VIDEO_SIZE_BYTES || '', 10) || 50 * 1024 * 1024,
  AUDIO: parseInt(process.env.MAX_AUDIO_SIZE_BYTES || '', 10) || 20 * 1024 * 1024,
  DOCUMENT: parseInt(process.env.MAX_DOCUMENT_SIZE_BYTES || '', 10) || 20 * 1024 * 1024,
};

export const ALLOWED_MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  VIDEO: ['video/mp4', 'video/webm'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'],
  DOCUMENT: ['application/pdf', 'text/plain'],
};

export const FORBIDDEN_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.apk',
  '.scr',
  '.msi',
  '.dll',
  '.com',
  '.vbs',
  '.jar',
  '.py',
  '.php',
  '.pl',
];

export const RETENTION_CONFIG = {
  RETENTION_DAYS: parseInt(process.env.MEDIA_RETENTION_DAYS || '', 10) || 7,
  PENDING_RETENTION_HOURS: parseInt(process.env.MEDIA_PENDING_RETENTION_HOURS || '', 10) || 24,
  SIGNED_URL_EXPIRATION_SECONDS: parseInt(process.env.MEDIA_SIGNED_URL_EXPIRATION_SECONDS || '', 10) || 900,
  CLEANUP_CRON: process.env.MEDIA_CLEANUP_CRON || '0 3 * * *',
  CLEANUP_TIMEZONE: process.env.MEDIA_CLEANUP_TIMEZONE || 'Asia/Kolkata',
  CLEANUP_BATCH_SIZE: parseInt(process.env.MEDIA_CLEANUP_BATCH_SIZE || '', 10) || 100,
};

export function getMediaTypeFromMime(mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | null {
  const cleanMime = mimeType.toLowerCase().trim();
  if (ALLOWED_MIME_TYPES.IMAGE.includes(cleanMime)) return 'IMAGE';
  if (ALLOWED_MIME_TYPES.VIDEO.includes(cleanMime)) return 'VIDEO';
  if (ALLOWED_MIME_TYPES.AUDIO.includes(cleanMime)) return 'AUDIO';
  if (ALLOWED_MIME_TYPES.DOCUMENT.includes(cleanMime)) return 'DOCUMENT';
  return null;
}

export function isForbiddenExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return FORBIDDEN_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
