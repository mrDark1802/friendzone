import { prisma } from '../../config/database.js';
import { getCanonicalPair } from '../../utils/sanitization.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors.utils.js';

export class FriendshipsService {
  /**
   * Sends a friend request using canonical user pairing (user_id_1 < user_id_2).
   */
  async sendFriendRequest(actionUserId: string, targetUserId: string) {
    if (actionUserId === targetUserId) {
      throw new BadRequestError('You cannot send a friend request to yourself');
    }

    // Check if a block exists in either direction
    const blockExists = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: actionUserId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: actionUserId },
        ],
      },
    });

    if (blockExists) {
      throw new BadRequestError('Unable to send friend request due to user block settings');
    }

    const { userId1, userId2 } = getCanonicalPair(actionUserId, targetUserId);

    const existingFriendship = await prisma.friendship.findUnique({
      where: { uk_friendship_pair: { userId1, userId2 } },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACCEPTED') {
        throw new ConflictError('You are already friends with this user');
      }
      throw new ConflictError('A friend request between these users is already pending');
    }

    return await prisma.friendship.create({
      data: {
        userId1,
        userId2,
        actionUserId,
        status: 'PENDING',
      },
    });
  }

  /**
   * Accepts a pending friend request.
   */
  async acceptFriendRequest(currentUserId: string, requesterUserId: string) {
    const { userId1, userId2 } = getCanonicalPair(currentUserId, requesterUserId);

    const friendship = await prisma.friendship.findUnique({
      where: { uk_friendship_pair: { userId1, userId2 } },
    });

    if (!friendship || friendship.status !== 'PENDING') {
      throw new NotFoundError('Pending friend request not found');
    }

    if (friendship.actionUserId === currentUserId) {
      throw new BadRequestError('You cannot accept a friend request you initiated');
    }

    return await prisma.friendship.update({
      where: { id: friendship.id },
      data: {
        status: 'ACCEPTED',
        actionUserId: currentUserId,
      },
    });
  }

  /**
   * Blocks a user without destroying historical friendship records.
   */
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestError('You cannot block yourself');
    }

    const existingBlock = await prisma.block.findUnique({
      where: { uk_blocker_blocked: { blockerId, blockedId } },
    });

    if (existingBlock) {
      return existingBlock;
    }

    return await prisma.block.create({
      data: {
        blockerId,
        blockedId,
      },
    });
  }

  /**
   * Unblocks a user.
   */
  async unblockUser(blockerId: string, blockedId: string) {
    return await prisma.block.deleteMany({
      where: {
        blockerId,
        blockedId,
      },
    });
  }

  /**
   * Returns list of accepted friends.
   */
  async getFriendsList(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: { select: { id: true, displayName: true, nativeLanguage: true } },
        user2: { select: { id: true, displayName: true, nativeLanguage: true } },
      },
    });

    return friendships.map((f) => (f.userId1 === userId ? f.user2 : f.user1));
  }
}
