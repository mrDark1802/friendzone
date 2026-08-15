import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION_DAYS: z.string().transform((val) => parseInt(val, 10)).default('30'),
  TRANSLATION_PROVIDER: z.enum(['deepl', 'google', 'azure', 'mock']).default('azure'),
  DEEPL_API_KEY: z.string().optional(),
  // Azure Cognitive Services Translator
  AZURE_TRANSLATOR_KEY: z.string().optional(),
  AZURE_TRANSLATOR_REGION: z.string().default('eastus'),
  AZURE_TRANSLATOR_ENDPOINT: z.string().default('https://api.cognitive.microsofttranslator.com'),
  
  // Application URLs & CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Resend Email API Configuration
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('FriendZone <onboarding@resend.dev>'),
  RESEND_REPLY_TO: z.string().default('friendzone_live@proton.me'),

  // SMTP Transporter Configuration (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = _env.data;
