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
  messageType?: string;
  systemMetadata?: any;
  mediaAssetId?: string;
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
      include: {
        conversation: true,
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this conversation');
    }

    const conv = membership.conversation;

    // Group messaging permission check
    if (conv.type === 'GROUP' && conv.onlyAdminsCanSend) {
      const isOwnerOrAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN';
      if (!isOwnerOrAdmin) {
        throw new ForbiddenError('Only group admins can send messages in this group');
      }
    }

    // Direct conversation block check
    if (conv.type === 'DIRECT') {
      const members = await prisma.conversationMember.findMany({
        where: { conversationId: input.conversationId, status: 'ACTIVE' },
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
    }

    try {
      const message = await prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: input.senderId,
          contentOriginal: input.contentOriginal,
          originalLanguage: input.originalLanguage.toLowerCase(),
          idempotencyKey: input.idempotencyKey,
          messageType: input.messageType || 'USER',
          systemMetadata: input.systemMetadata || null,
          status: 'SENT',
          ...(input.mediaAssetId ? { mediaAssets: { connect: { id: input.mediaAssetId } } } : {}),
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
          mediaAssets: true,
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
        mediaAssets: true,
      },
    });

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop()!;
      nextCursor = `${nextItem.createdAt.toISOString()}__${nextItem.id}`;
    }

    // Dynamic Multi-Language On-Demand Translation
    // If user shifted their native language, load or translate missing messages safely without duplicate jobs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nativeLanguage: true, translationEnabled: true },
    });

    if (user?.translationEnabled) {
      const targetLang = (user.nativeLanguage || 'en').toLowerCase();
      const translationService = new TranslationService();

      await Promise.all(
        messages.map(async (msg) => {
          const existingTrans = msg.translations.find(
            (t) => t.targetLanguage.toLowerCase() === targetLang
          );

          // HIGH-10: If translation is already COMPLETED, PENDING, or FAILED, do NOT spawn duplicate jobs
          if (existingTrans) {
            return;
          }

          // No translation record exists for this target language yet
          let reservation: any = null;
          const quotaService = new QuotaService();
          try {
            reservation = await quotaService.reserveQuota(userId);

            const translatedContent = await translationService.processTranslation({
              messageId: msg.id,
              conversationId: msg.conversationId,
              sourceLanguage: msg.originalLanguage.toLowerCase(),
              targetLanguage: targetLang,
              textOriginal: msg.contentOriginal,
            });

            if (translatedContent) {
              const transObj = {
                id: `trans_${msg.id}_${targetLang}`,
                messageId: msg.id,
                targetLanguage: targetLang,
                translatedContent,
                provider: process.env.TRANSLATION_PROVIDER || 'azure',
                status: 'COMPLETED',
                createdAt: new Date(),
              };
              msg.translations.push(transObj as any);
            } else if (reservation) {
              // Translation returned empty/null; release reservation
              await quotaService.releaseQuota(reservation).catch(() => {});
            }
          } catch (err: any) {
            // If quota was reserved but translation failed, safely release it
            if (reservation) {
              await quotaService.releaseQuota(reservation).catch(() => {});
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

  /**
   * Edits an existing message and wipes outdated translations to trigger fresh re-translation.
   */
  async editMessage(messageId: string, userId: string, newContent: string) {
    const trimmed = newContent?.trim();
    if (!trimmed) {
      throw new BadRequestError('Message content cannot be empty');
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: { user: true },
            },
          },
        },
        sender: { select: { id: true, displayName: true, nativeLanguage: true } },
      },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundError('Message not found or has been deleted');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenError('You can only edit your own messages');
    }

    // Update message content and delete outdated translations atomically inside a transaction
    const sysMeta = (message.systemMetadata as any) || {};
    sysMeta.isEdited = true;
    sysMeta.editedAt = new Date().toISOString();

    const updatedMessage = await prisma.$transaction(async (tx) => {
      // 1. Wipe stale translations atomically
      await tx.messageTranslation.deleteMany({
        where: { messageId },
      });

      // 2. Update canonical content and system metadata
      return await tx.message.update({
        where: { id: messageId },
        data: {
          contentOriginal: trimmed,
          systemMetadata: sysMeta,
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
          mediaAssets: true,
        },
      });
    });

    return updatedMessage;
  }

  /**
   * Soft-deletes a message.
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            members: {
              where: { userId, status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundError('Message not found or already deleted');
    }

    const member = message.conversation.members[0];
    if (!member) {
      throw new ForbiddenError('You are not an active member of this conversation');
    }

    const isSender = message.senderId === userId;
    const isGroupAdmin = member.role === 'OWNER' || member.role === 'ADMIN';

    if (!isSender && !isGroupAdmin) {
      throw new ForbiddenError('You do not have permission to delete this message');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, messageId, conversationId: message.conversationId };
  }
}

