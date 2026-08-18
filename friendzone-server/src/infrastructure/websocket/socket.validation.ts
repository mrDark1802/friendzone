import { z } from 'zod';

export const JoinConversationSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required').max(100),
});

export const LeaveConversationSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required').max(100),
});

export const TypingSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required').max(100),
});

export const GetUserStatusSchema = z.object({
  userIds: z
    .array(z.string().min(1).max(100))
    .min(1, 'At least one userId is required')
    .max(100, 'Cannot query more than 100 users at once'),
});

export const SendMessageSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required').max(100),
  contentOriginal: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters')
    .refine((val) => val.trim().length > 0, 'Message cannot consist solely of whitespace'),
  originalLanguage: z
    .string()
    .min(2, 'Invalid language code')
    .max(15, 'Invalid language code')
    .regex(/^[a-zA-Z-]+$/, 'Language code must contain only letters and hyphens')
    .default('en'),
  idempotencyKey: z.string().min(1, 'idempotencyKey is required').max(100),
});

export const EditMessageSchema = z.object({
  messageId: z.string().min(1, 'messageId is required').max(100),
  contentOriginal: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters')
    .refine((val) => val.trim().length > 0, 'Message cannot consist solely of whitespace'),
});

export const DeleteMessageSchema = z.object({
  messageId: z.string().min(1, 'messageId is required').max(100),
});

export const MarkReadSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required').max(100),
  messageId: z.string().min(1, 'messageId is required').max(100),
});

export const CallInviteSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required').max(100),
  targetUserId: z.string().min(1, 'targetUserId is required').max(100),
  type: z.enum(['audio', 'video'], { errorMap: () => ({ message: 'Call type must be audio or video' }) }),
});

export const CallActionSchema = z.object({
  callId: z.string().min(1).max(100).optional(),
});

export const CallAcceptSchema = z.object({
  callId: z.string().min(1, 'callId is required').max(100),
});

export const WebRTCOfferSchema = z.object({
  callId: z.string().min(1).max(100),
  targetUserId: z.string().min(1).max(100),
  offer: z.record(z.any()).refine((obj) => obj && typeof obj === 'object', 'Offer must be an object'),
});

export const WebRTCAnswerSchema = z.object({
  callId: z.string().min(1).max(100),
  targetUserId: z.string().min(1).max(100),
  answer: z.record(z.any()).refine((obj) => obj && typeof obj === 'object', 'Answer must be an object'),
});

export const WebRTCIceCandidateSchema = z.object({
  callId: z.string().min(1).max(100),
  targetUserId: z.string().min(1).max(100),
  candidate: z.record(z.any()).refine((obj) => obj && typeof obj === 'object', 'Candidate must be an object'),
});

/**
 * Safely parses and validates a socket event payload.
 * Returns either { success: true, data: T } or { success: false, error: string }.
 */
export function validateSocketPayload<T>(
  schema: z.ZodSchema<T>,
  payload: unknown
): { success: true; data: T } | { success: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Malformed or missing event payload' };
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const fieldPath = firstIssue.path.join('.') || 'payload';
    return { success: false, error: `${fieldPath}: ${firstIssue.message}` };
  }

  return { success: true, data: result.data };
}
