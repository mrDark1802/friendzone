/**
 * Conversation Context Engine for FriendZone Translation System.
 *
 * Lightweight context retriever that fetches recent 3-5 messages in a conversation
 * to disambiguate short or context-dependent messages (e.g. "Maybe 😂", "Why?", "Yeah").
 */

import { prisma } from '../../config/database.js';

export interface RecentMessageContext {
  senderName: string;
  text: string;
  isMe: boolean;
}

export interface ConversationTranslationContext {
  conversationId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  recentMessages: RecentMessageContext[];
}

/**
 * Fetches lightweight context window of recent messages for a given conversation.
 */
export async function getConversationContext(
  conversationId: string | undefined,
  currentMessageId?: string,
  limit: number = 3
): Promise<RecentMessageContext[]> {
  if (!conversationId) return [];

  try {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(currentMessageId ? { id: { not: currentMessageId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        contentOriginal: true,
        senderId: true,
        sender: {
          select: {
            displayName: true,
          },
        },
      },
    });

    // Return in chronological order
    return messages.reverse().map((msg) => ({
      senderName: msg.sender.displayName || 'User',
      text: msg.contentOriginal,
      isMe: false,
    }));
  } catch (err) {
    // Non-blocking fallback
    return [];
  }
}

/**
 * Formats context array into a compact, single-line prompt helper string.
 */
export function formatContextPrompt(recentMessages: RecentMessageContext[]): string {
  return '';
}
