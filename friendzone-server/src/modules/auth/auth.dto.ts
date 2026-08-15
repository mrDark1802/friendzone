import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password exceeds maximum length')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(100),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  dateOfBirth: z.string().optional().refine((val) => {
    if (!val) return true;
    const birthDate = new Date(val);
    if (isNaN(birthDate.getTime())) return false;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return birthDate <= cutoff;
  }, 'You must be at least 18 years old to create a FriendZone account'),
});

export const onboardingSchema = z.object({
  nativeLanguage: z.string().min(2).max(10),
  fluentLanguages: z.array(z.string().min(2).max(10)).optional().default([]),
  learningLanguages: z.array(z.string().min(2).max(10)).optional().default([]),
  countryCode: z.string().length(2).optional(),
  usagePurposes: z.array(z.string()).optional().default([]),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Invalid or missing verification token'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid reset token'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password exceeds maximum length')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
