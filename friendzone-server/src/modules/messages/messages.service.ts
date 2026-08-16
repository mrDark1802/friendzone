import { prisma } from '../../config/database.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../utils/errors.utils.js';
import { TranslationService } from '../translation/translation.service.js';
import { QuotaService } from '../users/quota.service.js';

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  contentOriginal: string;
  originalLanguage: string;
  idempotencyKey: string;
}

export class MessagesService {
  /**
   * Saves original message to database with idempotency deduplication.
   */
  async createMessage(input: CreateMessageInput) {
    if (!input.idempotencyKey) {
      throw new BadRequestError('idempotencyKey is required for message sending');
    }

    // Verify conversation membership (IDOR Protection)
    const membership = await prisma.conversationMember.findUnique({
      where: {
        uk_conv_user: {
          conversationId: input.conversationId,
          userId: input.senderId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this conversation');
    }

    // Verify block status between members (Server-Side Block Enforcement)
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: input.conversationId },
    });
    const otherMember = members.find((m) => m.userId !== input.senderId);

    if (otherMember) {
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: input.senderId, blockedId: otherMember.userId },
            { blockerId: otherMember.userId, blockedId: input.senderId },
          ],
        },
      });
      if (block) {
        throw new ForbiddenError('Cannot send message because this user is blocked');
      }
    }

    try {
      const message = await prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: input.senderId,
          contentOriginal: input.contentOriginal,
          originalLanguage: input.originalLanguage.toLowerCase(),
          idempotencyKey: input.idempotencyKey,
          status: 'SENT',
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
        },
      });

      // Touch conversation updatedAt timestamp
      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      });

      return { message, isDuplicate: false };
    } catch (error: any) {
      // Catch idempotency unique constraint violation (P2002)
      if (error.code === 'P2002') {
        const existingMessage = await prisma.message.findUnique({
          where: {
            uk_messages_idempotency: {
              conversationId: input.conversationId,
              idempotencyKey: input.idempotencyKey,
            },
          },
          include: {
            sender: { select: { id: true, displayName: true, nativeLanguage: true } },
            translations: true,
          },
        });

        if (existingMessage) {
          return { message: existingMessage, isDuplicate: true };
        }
      }
      throw error;
    }
  }

  /**
   * Cursor-based pagination sorted by (createdAt DESC, id DESC).
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 20,
    cursor?: { createdAt: string; id: string }
  ) {
    // IDOR verification
    const membership = await prisma.conversationMember.findUnique({
      where: {
        uk_conv_user: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have permission to view messages in this conversation');
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                {
                  createdAt: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        sender: { select: { id: true, displayName: true, nativeLanguage: true } },
        translations: true,
      },
    });

    let nextCursor: { createdAt: string; id: string } | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop()!;
      nextCursor = {
        createdAt: nextItem.createdAt.toISOString(),
        id: nextItem.id,
      };
    }

    // Dynamic Multi-Language On-Demand Translation
    // If user shifted their native language (e.g. Spanish -> Japanese), translate missing messages on the fly
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nativeLanguage: true, translationEnabled: true },
    });

    if (user?.translationEnabled) {
      const targetLang = (user.nativeLanguage || 'en').toLowerCase();
      const translationService = new TranslationService();

      await Promise.all(
        messages.map(async (msg) => {
          const msgSrcLang = msg.originalLanguage.toLowerCase();
          if (msgSrcLang === targetLang) return; // Same language, skip

          const existingTrans = msg.translations.find(
            (t) => t.targetLanguage.toLowerCase() === targetLang
          );

          if (!existingTrans || existingTrans.status !== 'COMPLETED') {
            try {
              // Enforce quota before processing on-demand translation
              const quotaService = new QuotaService();
              await quotaService.checkAndIncrementQuota(userId);

              const translatedContent = await translationService.processTranslation({
                messageId: msg.id,
                sourceLanguage: msgSrcLang,
                targetLanguage: targetLang,
                textOriginal: msg.contentOriginal,
              });

              const existingIdx = msg.translations.findIndex(
                (t) => t.targetLanguage.toLowerCase() === targetLang
              );
              const transObj = {
                id: existingTrans?.id || `trans_${msg.id}_${targetLang}`,
                messageId: msg.id,
                targetLanguage: targetLang,
                translatedContent,
                provider: process.env.TRANSLATION_PROVIDER || 'azure',
                status: 'COMPLETED',
                createdAt: new Date(),
              };

              if (existingIdx >= 0) {
                msg.translations[existingIdx] = transObj as any;
              } else {
                msg.translations.push(transObj as any);
              }
            } catch (err) {
              // Non-blocking log for single message translation failure
            }
          }
        })
      );
    }

    return {
      messages,
      nextCursor,
    };
  }

  /**
   * Updates last read message ID and sets status='READ' for incoming messages.
   */
  async markRead(conversationId: string, userId: string, messageId: string) {
    // 1. Update status to READ on unread messages sent by others in this conversation
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { in: ['SENT', 'DELIVERED'] },
      },
      data: {
        status: 'READ',
      },
    });

    // 2. Resolve target messageId if "latest" or invalid string was passed
    let targetMsgId: string | null = messageId;

    if (!targetMsgId || targetMsgId === 'latest') {
      const lastMsg = await prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      targetMsgId = lastMsg?.id || null;
    }

    if (!targetMsgId) {
      return { success: true };
    }

    // Verify targetMsgId exists in DB before updating conversation_members_last_read_message_id_fkey
    const msgExists = await prisma.message.findFirst({
      where: { id: targetMsgId, conversationId },
      select: { id: true },
    });

    if (!msgExists) {
      return { success: true };
    }

    try {
      return await prisma.conversationMember.update({
        where: {
          uk_conv_user: { conversationId, userId },
        },
        data: {
          lastReadMessageId: targetMsgId,
        },
      });
    } catch (err: any) {
      return { success: true };
    }
  }
}
