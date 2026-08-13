import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password exceeds maximum length'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(100),
  username: z.string().min(2).max(50).optional().default(''),
  nativeLanguage: z.string().min(2).max(10).default('en'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
