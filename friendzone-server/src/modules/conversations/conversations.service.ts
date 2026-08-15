import { prisma } from '../../config/database.js';
import { getCanonicalPair } from '../../utils/sanitization.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.utils.js';

export class ConversationsService {
  /**
   * Creates or returns existing DIRECT 1-to-1 conversation using canonicalPair DB uniqueness.
   */
  async createDirectConversation(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestError('Cannot start a direct conversation with yourself');
    }

    // Block check
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: currentUserId },
        ],
      },
    });

    if (block) {
      throw new ForbiddenError('Cannot initiate conversation due to user block settings');
    }

    const { canonicalPair } = getCanonicalPair(currentUserId, targetUserId);

    // Check if DIRECT conversation already exists via canonicalPair
    let conversation = await prisma.conversation.findUnique({
      where: { canonicalPair },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, nativeLanguage: true } },
          },
        },
      },
    });

    if (conversation) {
      return conversation;
    }

    // Create new DIRECT conversation
    return await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        canonicalPair,
        createdBy: currentUserId,
        members: {
          create: [
            { userId: currentUserId, role: 'ADMIN' },
            { userId: targetUserId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, nativeLanguage: true } },
          },
        },
      },
    });
  }

  /**
   * Creates a GROUP conversation.
   */
  async createGroupConversation(currentUserId: string, title: string, memberIds: string[]) {
    const uniqueMemberIds = Array.from(new Set([currentUserId, ...memberIds]));

    return await prisma.conversation.create({
      data: {
        type: 'GROUP',
        title,
        canonicalPair: null, // Unlimited group conversations allowed
        createdBy: currentUserId,
        members: {
          create: uniqueMemberIds.map((userId) => ({
            userId,
            role: userId === currentUserId ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, nativeLanguage: true } },
          },
        },
      },
    });
  }

  /**
   * Lists conversations for current user.
   */
  async getUserConversations(userId: string) {
    const convs = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, nativeLanguage: true, username: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            translations: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return await Promise.all(
      convs.map(async (c) => {
        const otherMember = c.members.find((m) => m.userId !== userId);
        let isBlocked = false;
        let blockedByMe = false;

        if (otherMember?.userId) {
          const block = await prisma.block.findFirst({
            where: {
              OR: [
                { blockerId: userId, blockedId: otherMember.userId },
                { blockerId: otherMember.userId, blockedId: userId },
              ],
            },
          });

          if (block) {
            isBlocked = true;
            if (block.blockerId === userId) {
              blockedByMe = true;
            } else {
              // They blocked me -> anonymize their profile so I can't track or inspect them
              otherMember.user.displayName = "FriendZone User";
              otherMember.user.username = "user";
            }
          }
        }

        return {
          ...c,
          isBlocked,
          blockedByMe,
        };
      })
    );
  }
}
