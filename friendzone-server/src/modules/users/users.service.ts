import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors.utils.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.utils.js';

export class UsersService {
  async getProfile(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        nativeLanguage: true,
        countryCode: true,
        translationEnabled: true,
        onboardingCompleted: true,
        usagePurposes: true,
        role: true,
        plan: true,
        isVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        fluentLanguages: { select: { languageCode: true } },
        learningLanguages: { select: { languageCode: true } },
        profileMediaId: true,
        profileMedia: { select: { id: true, storageKey: true, thumbnailKey: true, uploadStatus: true } },
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return user;
  }

  async updateSettings(
    userId: string,
    data: {
      nativeLanguage?: string;
      translationEnabled?: boolean;
      displayName?: string;
      username?: string;
    }
  ) {
    // Check username uniqueness if changing username
    if (data.username) {
      const cleanUsername = data.username.toLowerCase().trim().replace(/\s+/g, '_');
      const existingUser = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          id: { not: userId },
          deletedAt: null,
        },
      });

      if (existingUser) {
        throw new ConflictError('Username is already taken by another user');
      }
      data.username = cleanUsername;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        nativeLanguage: data.nativeLanguage ? data.nativeLanguage.toLowerCase() : undefined,
        translationEnabled: typeof data.translationEnabled === 'boolean' ? data.translationEnabled : undefined,
        displayName: data.displayName ? data.displayName.trim() : undefined,
        username: data.username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        nativeLanguage: true,
        translationEnabled: true,
        profileMediaId: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async changePassword(userId: string, currentPass?: string, newPass?: string) {
    if (!currentPass || !newPass) {
      throw new BadRequestError('Current password and new password are required');
    }

    if (newPass.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await verifyPassword(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Incorrect current password');
    }

    const passwordHash = await hashPassword(newPass);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async searchUsers(query: string, currentUserId: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return [];
    }

    // Find all blocked user IDs (users blocked by me OR users who blocked me)
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: currentUserId },
          { blockedId: currentUserId },
        ],
      },
    });
    const blockedUserIds = new Set<string>();
    blocks.forEach((b) => {
      if (b.blockerId === currentUserId) blockedUserIds.add(b.blockedId);
      if (b.blockedId === currentUserId) blockedUserIds.add(b.blockerId);
    });

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: [currentUserId, ...Array.from(blockedUserIds)] },
        deletedAt: null,
        OR: [
          { displayName: { contains: trimmed, mode: 'insensitive' } },
          { username: { contains: trimmed, mode: 'insensitive' } },
          { email: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        nativeLanguage: true,
        profileMediaId: true,
      },
      take: 20,
    });

    // Attach real-time friendship status to each user
    const usersWithStatus = await Promise.all(
      users.map(async (u) => {
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId1: currentUserId, userId2: u.id },
              { userId1: u.id, userId2: currentUserId },
            ],
          },
        });

        let friendshipStatus: 'NONE' | 'PENDING' | 'ACCEPTED' = 'NONE';
        if (friendship) {
          friendshipStatus = friendship.status === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING';
        }

        return {
          ...u,
          friendshipStatus,
        };
      })
    );

    return usersWithStatus;
  }
}
