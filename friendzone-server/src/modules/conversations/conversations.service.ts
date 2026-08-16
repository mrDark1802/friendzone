import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { getCanonicalPair } from '../../utils/sanitization.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.utils.js';

export const MAX_GROUP_MEMBERS = 100;

function hashInviteToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

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

    let conversation = await prisma.conversation.findUnique({
      where: { canonicalPair },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, displayName: true, nativeLanguage: true, username: true } },
          },
        },
      },
    });

    if (conversation) {
      return conversation;
    }

    return await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        canonicalPair,
        createdBy: currentUserId,
        members: {
          create: [
            { userId: currentUserId, role: 'ADMIN', status: 'ACTIVE' },
            { userId: targetUserId, role: 'MEMBER', status: 'ACTIVE' },
          ],
        },
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, displayName: true, nativeLanguage: true, username: true } },
          },
        },
      },
    });
  }

  /**
   * Creates a GROUP conversation inside an atomic transaction.
   */
  async createGroupConversation(
    creatorId: string,
    title: string,
    memberIds: string[],
    description?: string,
    avatarUrl?: string
  ) {
    const trimmedTitle = title?.trim();
    if (!trimmedTitle) {
      throw new BadRequestError('Group title is required');
    }
    if (trimmedTitle.length > 100) {
      throw new BadRequestError('Group title must not exceed 100 characters');
    }

    // Filter out creatorId and remove duplicates
    const sanitizedMemberIds = Array.from(new Set(memberIds.filter((id) => id && id !== creatorId)));
    const totalMembers = 1 + sanitizedMemberIds.length;

    if (totalMembers > MAX_GROUP_MEMBERS) {
      throw new BadRequestError(`Group capacity cannot exceed ${MAX_GROUP_MEMBERS} members`);
    }

    // Verify creator exists
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, displayName: true, nativeLanguage: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator user not found');
    }

    // Check block status between creator and target members
    if (sanitizedMemberIds.length > 0) {
      const blocks = await prisma.block.findMany({
        where: {
          OR: [
            { blockerId: creatorId, blockedId: { in: sanitizedMemberIds } },
            { blockerId: { in: sanitizedMemberIds }, blockedId: creatorId },
          ],
        },
      });

      if (blocks.length > 0) {
        throw new ForbiddenError('Cannot add blocked users to group');
      }
    }

    return await prisma.$transaction(
      async (tx) => {
        // 1. Create Conversation with active members in a single query
        const conversation = await tx.conversation.create({
          data: {
            type: 'GROUP',
            title: trimmedTitle,
            description: description?.trim() || null,
            avatarUrl: avatarUrl?.trim() || null,
            canonicalPair: null,
            createdBy: creatorId,
            members: {
              create: [
                { userId: creatorId, role: 'OWNER', status: 'ACTIVE' },
                ...sanitizedMemberIds.map((userId) => ({
                  userId,
                  role: 'MEMBER' as const,
                  status: 'ACTIVE' as const,
                  addedBy: creatorId,
                })),
              ],
            },
          },
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: {
                user: { select: { id: true, displayName: true, nativeLanguage: true, username: true } },
              },
            },
          },
        });

        // 2. Create System Event Message
        const sysMessage = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: creatorId,
            contentOriginal: `${creator.displayName} created the group "${trimmedTitle}"`,
            originalLanguage: (creator.nativeLanguage || 'en').toLowerCase(),
            idempotencyKey: `sys_created_${conversation.id}_${Date.now()}`,
            messageType: 'SYSTEM',
            systemMetadata: {
              eventType: 'GROUP_CREATED',
              actorId: creatorId,
              actorName: creator.displayName,
              title: trimmedTitle,
              memberCount: totalMembers,
            },
            status: 'SENT',
          },
          include: {
            sender: { select: { id: true, displayName: true, nativeLanguage: true } },
            translations: true,
          },
        });

        return { conversation, sysMessage };
      },
      { maxWait: 10000, timeout: 20000 }
    );
  }

  /**
   * Lists active conversations for current user.
   */
  async getUserConversations(userId: string) {
    const convs = await prisma.conversation.findMany({
      where: {
        deletedAt: null,
        members: {
          some: { userId, status: 'ACTIVE' },
        },
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, displayName: true, nativeLanguage: true, username: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            sender: { select: { id: true, displayName: true } },
            translations: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return await Promise.all(
      convs.map(async (c) => {
        let isBlocked = false;
        let blockedByMe = false;

        if (c.type === 'DIRECT') {
          const otherMember = c.members.find((m) => m.userId !== userId);
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
                otherMember.user.displayName = 'FriendZone User';
                otherMember.user.username = 'user';
              }
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

  /**
   * Gets details for a specific group conversation.
   */
  async getGroupDetails(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, displayName: true, username: true, nativeLanguage: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        invites: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Group conversation not found');
    }

    const currentMember = conversation.members.find((m) => m.userId === userId);
    if (!currentMember || currentMember.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this group');
    }

    const currentUserRole = currentMember.role; // 'OWNER' | 'ADMIN' | 'MEMBER'

    return {
      conversation,
      currentUserRole,
      activeInvite: conversation.invites[0] || null,
    };
  }

  /**
   * Updates group information and settings.
   */
  async updateGroupInfo(
    conversationId: string,
    requesterId: string,
    data: {
      title?: string;
      description?: string;
      avatarUrl?: string;
      onlyAdminsCanSend?: boolean;
      onlyAdminsCanEditInfo?: boolean;
      onlyAdminsCanAddMembers?: boolean;
    }
  ) {
    const member = await prisma.conversationMember.findUnique({
      where: { uk_conv_user: { conversationId, userId: requesterId } },
      include: {
        conversation: true,
        user: { select: { id: true, displayName: true, nativeLanguage: true } },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this group');
    }

    const conv = member.conversation;
    if (conv.type !== 'GROUP') {
      throw new BadRequestError('Cannot update info on a direct conversation');
    }

    // Permission check
    const isOwnerOrAdmin = member.role === 'OWNER' || member.role === 'ADMIN';
    if (conv.onlyAdminsCanEditInfo && !isOwnerOrAdmin) {
      throw new ForbiddenError('Only admins can edit group information');
    }

    return await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      const changes: string[] = [];

      if (data.title !== undefined && data.title.trim() !== conv.title) {
        const newTitle = data.title.trim();
        if (!newTitle) throw new BadRequestError('Group title cannot be empty');
        updateData.title = newTitle;
        changes.push(`title to "${newTitle}"`);
      }

      if (data.description !== undefined && data.description !== conv.description) {
        updateData.description = data.description.trim() || null;
        changes.push('description');
      }

      if (data.avatarUrl !== undefined && data.avatarUrl !== conv.avatarUrl) {
        updateData.avatarUrl = data.avatarUrl.trim() || null;
        changes.push('icon');
      }

      if (data.onlyAdminsCanSend !== undefined) {
        if (!isOwnerOrAdmin) throw new ForbiddenError('Only admins can change group settings');
        updateData.onlyAdminsCanSend = data.onlyAdminsCanSend;
        changes.push(`permissions (only admins can send messages: ${data.onlyAdminsCanSend})`);
      }

      if (data.onlyAdminsCanEditInfo !== undefined) {
        if (!isOwnerOrAdmin) throw new ForbiddenError('Only admins can change group settings');
        updateData.onlyAdminsCanEditInfo = data.onlyAdminsCanEditInfo;
        changes.push(`permissions (only admins can edit info: ${data.onlyAdminsCanEditInfo})`);
      }

      if (data.onlyAdminsCanAddMembers !== undefined) {
        if (!isOwnerOrAdmin) throw new ForbiddenError('Only admins can change group settings');
        updateData.onlyAdminsCanAddMembers = data.onlyAdminsCanAddMembers;
        changes.push(`permissions (only admins can add members: ${data.onlyAdminsCanAddMembers})`);
      }

      if (Object.keys(updateData).length === 0) {
        return { conversation: conv, sysMessage: null };
      }

      const updatedConv = await tx.conversation.update({
        where: { id: conversationId },
        data: updateData,
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, displayName: true, username: true } } },
          },
        },
      });

      const sysMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: requesterId,
          contentOriginal: `${member.user.displayName} updated the group ${changes.join(', ')}`,
          originalLanguage: (member.user.nativeLanguage || 'en').toLowerCase(),
          idempotencyKey: `sys_update_${conversationId}_${Date.now()}`,
          messageType: 'SYSTEM',
          systemMetadata: {
            eventType: 'GROUP_INFO_UPDATED',
            actorId: requesterId,
            actorName: member.user.displayName,
            changes,
          },
          status: 'SENT',
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
        },
      });

      return { conversation: updatedConv, sysMessage };
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Search and list group members with server-side pagination.
   */
  async getGroupMembers(
    conversationId: string,
    requesterId: string,
    query?: { search?: string; page?: number; limit?: number }
  ) {
    const membership = await prisma.conversationMember.findUnique({
      where: { uk_conv_user: { conversationId, userId: requesterId } },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this group');
    }

    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 30));
    const skip = (page - 1) * limit;

    const search = query?.search?.trim();

    const whereClause: any = {
      conversationId,
      status: 'ACTIVE',
      ...(search
        ? {
            user: {
              OR: [
                { displayName: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [members, total] = await Promise.all([
      prisma.conversationMember.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, username: true, nativeLanguage: true } },
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      }),
      prisma.conversationMember.count({ where: whereClause }),
    ]);

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Adds new members to group.
   */
  async addGroupMembers(conversationId: string, requesterId: string, targetUserIds: string[]) {
    const requester = await prisma.conversationMember.findUnique({
      where: { uk_conv_user: { conversationId, userId: requesterId } },
      include: {
        conversation: true,
        user: { select: { id: true, displayName: true, nativeLanguage: true } },
      },
    });

    if (!requester || requester.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this group');
    }

    const conv = requester.conversation;
    if (conv.type !== 'GROUP') {
      throw new BadRequestError('Cannot add members to a direct conversation');
    }

    const isOwnerOrAdmin = requester.role === 'OWNER' || requester.role === 'ADMIN';
    if (conv.onlyAdminsCanAddMembers && !isOwnerOrAdmin) {
      throw new ForbiddenError('Only group admins can add new members');
    }

    // Clean target user IDs
    const cleanTargets = Array.from(new Set(targetUserIds.filter((id) => id && id !== requesterId)));
    if (cleanTargets.length === 0) {
      throw new BadRequestError('No valid target users specified');
    }

    // Check existing active members count
    const activeCount = await prisma.conversationMember.count({
      where: { conversationId, status: 'ACTIVE' },
    });

    if (activeCount + cleanTargets.length > MAX_GROUP_MEMBERS) {
      throw new BadRequestError(`Group capacity cannot exceed ${MAX_GROUP_MEMBERS} members`);
    }

    // Check block relationships
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: requesterId, blockedId: { in: cleanTargets } },
          { blockerId: { in: cleanTargets }, blockedId: requesterId },
        ],
      },
    });

    if (blocks.length > 0) {
      throw new ForbiddenError('Cannot add blocked users to group');
    }

    // Fetch added users display names for system message
    const addedUsers = await prisma.user.findMany({
      where: { id: { in: cleanTargets } },
      select: { id: true, displayName: true },
    });

    return await prisma.$transaction(async (tx) => {
      // Upsert membership for targets
      for (const targetId of cleanTargets) {
        await tx.conversationMember.upsert({
          where: { uk_conv_user: { conversationId, userId: targetId } },
          create: {
            conversationId,
            userId: targetId,
            role: 'MEMBER',
            status: 'ACTIVE',
            addedBy: requesterId,
          },
          update: {
            role: 'MEMBER',
            status: 'ACTIVE',
            leftAt: null,
            addedBy: requesterId,
            joinedAt: new Date(),
          },
        });
      }

      const namesText = addedUsers.map((u) => u.displayName).join(', ');
      const sysMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: requesterId,
          contentOriginal: `${requester.user.displayName} added ${namesText}`,
          originalLanguage: (requester.user.nativeLanguage || 'en').toLowerCase(),
          idempotencyKey: `sys_add_${conversationId}_${Date.now()}`,
          messageType: 'SYSTEM',
          systemMetadata: {
            eventType: 'MEMBER_ADDED',
            actorId: requesterId,
            actorName: requester.user.displayName,
            targetUserIds: cleanTargets,
            targetNames: addedUsers.map((u) => u.displayName),
          },
          status: 'SENT',
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
        },
      });

      const updatedConv = await tx.conversation.findUnique({
        where: { id: conversationId },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, displayName: true, username: true } } },
          },
        },
      });

      return { conversation: updatedConv!, sysMessage, addedUserIds: cleanTargets };
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Removes a member from group.
   */
  async removeGroupMember(conversationId: string, requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new BadRequestError('Use leave group endpoint to remove yourself');
    }

    const [requester, target] = await Promise.all([
      prisma.conversationMember.findUnique({
        where: { uk_conv_user: { conversationId, userId: requesterId } },
        include: {
          conversation: true,
          user: { select: { id: true, displayName: true, nativeLanguage: true } },
        },
      }),
      prisma.conversationMember.findUnique({
        where: { uk_conv_user: { conversationId, userId: targetUserId } },
        include: {
          user: { select: { id: true, displayName: true } },
        },
      }),
    ]);

    if (!requester || requester.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this group');
    }
    if (!target || target.status !== 'ACTIVE') {
      throw new NotFoundError('Target user is not an active member of this group');
    }

    // Role Checks:
    // OWNER can remove ADMIN or MEMBER
    // ADMIN can remove MEMBER (cannot remove OWNER or another ADMIN)
    // MEMBER cannot remove anyone
    if (requester.role === 'MEMBER') {
      throw new ForbiddenError('Members cannot remove other users from the group');
    }
    if (requester.role === 'ADMIN' && (target.role === 'OWNER' || target.role === 'ADMIN')) {
      throw new ForbiddenError('Admins cannot remove group owners or other admins');
    }
    if (target.role === 'OWNER') {
      throw new ForbiddenError('Cannot remove the group owner');
    }

    return await prisma.$transaction(async (tx) => {
      await tx.conversationMember.update({
        where: { uk_conv_user: { conversationId, userId: targetUserId } },
        data: {
          status: 'INACTIVE',
          leftAt: new Date(),
          removedBy: requesterId,
        },
      });

      const sysMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: requesterId,
          contentOriginal: `${requester.user.displayName} removed ${target.user.displayName}`,
          originalLanguage: (requester.user.nativeLanguage || 'en').toLowerCase(),
          idempotencyKey: `sys_remove_${conversationId}_${Date.now()}`,
          messageType: 'SYSTEM',
          systemMetadata: {
            eventType: 'MEMBER_REMOVED',
            actorId: requesterId,
            actorName: requester.user.displayName,
            targetUserId,
            targetName: target.user.displayName,
          },
          status: 'SENT',
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
        },
      });

      return { sysMessage, removedUserId: targetUserId };
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Leave group conversation with automatic owner transfer if needed.
   */
  async leaveGroup(conversationId: string, userId: string) {
    const member = await prisma.conversationMember.findUnique({
      where: { uk_conv_user: { conversationId, userId } },
      include: {
        conversation: true,
        user: { select: { id: true, displayName: true, nativeLanguage: true } },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this group');
    }

    return await prisma.$transaction(async (tx) => {
      let transferSysMessage: any = null;

      // Handle owner transfer if leaving user is OWNER
      if (member.role === 'OWNER') {
        const remainingActiveMembers = await tx.conversationMember.findMany({
          where: {
            conversationId,
            userId: { not: userId },
            status: 'ACTIVE',
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          include: { user: { select: { id: true, displayName: true } } },
        });

        if (remainingActiveMembers.length > 0) {
          // Prefer an ADMIN, else pick earliest joined MEMBER
          const newOwner = remainingActiveMembers.find((m) => m.role === 'ADMIN') || remainingActiveMembers[0];
          await tx.conversationMember.update({
            where: { id: newOwner.id },
            data: { role: 'OWNER' },
          });

          transferSysMessage = await tx.message.create({
            data: {
              conversationId,
              senderId: userId,
              contentOriginal: `${newOwner.user.displayName} is now the group owner`,
              originalLanguage: (member.user.nativeLanguage || 'en').toLowerCase(),
              idempotencyKey: `sys_transfer_${conversationId}_${Date.now()}`,
              messageType: 'SYSTEM',
              systemMetadata: {
                eventType: 'OWNER_TRANSFERRED',
                actorId: userId,
                newOwnerId: newOwner.userId,
                newOwnerName: newOwner.user.displayName,
              },
              status: 'SENT',
            },
            include: {
              sender: { select: { id: true, displayName: true, nativeLanguage: true } },
              translations: true,
            },
          });
        }
      }

      // Deactivate leaving member
      await tx.conversationMember.update({
        where: { uk_conv_user: { conversationId, userId } },
        data: {
          status: 'INACTIVE',
          leftAt: new Date(),
        },
      });

      const sysMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          contentOriginal: `${member.user.displayName} left the group`,
          originalLanguage: (member.user.nativeLanguage || 'en').toLowerCase(),
          idempotencyKey: `sys_left_${conversationId}_${Date.now()}`,
          messageType: 'SYSTEM',
          systemMetadata: {
            eventType: 'MEMBER_LEFT',
            actorId: userId,
            actorName: member.user.displayName,
          },
          status: 'SENT',
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
        },
      });

      return { sysMessage, transferSysMessage, leftUserId: userId };
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Promote or demote group roles (Promote MEMBER->ADMIN, Demote ADMIN->MEMBER, Transfer OWNER).
   */
  async updateMemberRole(
    conversationId: string,
    requesterId: string,
    targetUserId: string,
    newRole: 'ADMIN' | 'MEMBER' | 'OWNER'
  ) {
    if (requesterId === targetUserId) {
      throw new BadRequestError('Cannot change your own role directly');
    }

    const [requester, target] = await Promise.all([
      prisma.conversationMember.findUnique({
        where: { uk_conv_user: { conversationId, userId: requesterId } },
        include: { user: { select: { id: true, displayName: true, nativeLanguage: true } } },
      }),
      prisma.conversationMember.findUnique({
        where: { uk_conv_user: { conversationId, userId: targetUserId } },
        include: { user: { select: { id: true, displayName: true } } },
      }),
    ]);

    if (!requester || requester.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this group');
    }
    if (!target || target.status !== 'ACTIVE') {
      throw new NotFoundError('Target user is not an active member of this group');
    }

    // Only OWNER can assign/remove ADMIN or transfer OWNER
    if (requester.role !== 'OWNER') {
      throw new ForbiddenError('Only the group owner can modify admin or owner roles');
    }

    return await prisma.$transaction(async (tx) => {
      if (newRole === 'OWNER') {
        // Demote current owner to ADMIN, set target as OWNER
        await tx.conversationMember.update({
          where: { uk_conv_user: { conversationId, userId: requesterId } },
          data: { role: 'ADMIN' },
        });
        await tx.conversationMember.update({
          where: { uk_conv_user: { conversationId, userId: targetUserId } },
          data: { role: 'OWNER' },
        });
      } else {
        await tx.conversationMember.update({
          where: { uk_conv_user: { conversationId, userId: targetUserId } },
          data: { role: newRole },
        });
      }

      const eventType =
        newRole === 'OWNER'
          ? 'OWNER_TRANSFERRED'
          : newRole === 'ADMIN'
          ? 'ADMIN_PROMOTED'
          : 'ADMIN_DEMOTED';

      const sysText =
        newRole === 'OWNER'
          ? `${target.user.displayName} is now the group owner`
          : newRole === 'ADMIN'
          ? `${requester.user.displayName} made ${target.user.displayName} an admin`
          : `${requester.user.displayName} removed ${target.user.displayName} as admin`;

      const sysMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: requesterId,
          contentOriginal: sysText,
          originalLanguage: (requester.user.nativeLanguage || 'en').toLowerCase(),
          idempotencyKey: `sys_role_${conversationId}_${targetUserId}_${Date.now()}`,
          messageType: 'SYSTEM',
          systemMetadata: {
            eventType,
            actorId: requesterId,
            actorName: requester.user.displayName,
            targetUserId,
            targetName: target.user.displayName,
            newRole,
          },
          status: 'SENT',
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
        },
      });

      return { sysMessage, targetUserId, newRole };
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Creates a cryptographically secure group invite link token.
   */
  async createGroupInvite(conversationId: string, requesterId: string) {
    const member = await prisma.conversationMember.findUnique({
      where: { uk_conv_user: { conversationId, userId: requesterId } },
      include: { conversation: true },
    });

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not an active member of this group');
    }

    if (member.role === 'MEMBER' && member.conversation.onlyAdminsCanAddMembers) {
      throw new ForbiddenError('Only group admins can create invite links');
    }

    // Revoke previous active invite links for this conversation
    await prisma.groupInvite.updateMany({
      where: { conversationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashInviteToken(rawToken);

    const invite = await prisma.groupInvite.create({
      data: {
        conversationId,
        tokenHash,
        createdBy: requesterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      inviteId: invite.id,
      token: rawToken,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Revokes existing group invite link.
   */
  async revokeGroupInvite(conversationId: string, requesterId: string) {
    const member = await prisma.conversationMember.findUnique({
      where: { uk_conv_user: { conversationId, userId: requesterId } },
    });

    if (!member || member.status !== 'ACTIVE' || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new ForbiddenError('Only group admins can revoke invite links');
    }

    await prisma.groupInvite.updateMany({
      where: { conversationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Join group via invite token.
   */
  async joinViaInviteToken(rawToken: string, userId: string) {
    const tokenHash = hashInviteToken(rawToken);

    const invite = await prisma.groupInvite.findUnique({
      where: { tokenHash },
      include: {
        conversation: {
          include: {
            members: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!invite || invite.revokedAt) {
      throw new BadRequestError('This invite link is invalid or has been revoked');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestError('This invite link has expired');
    }

    if (invite.maxUses && invite.useCount >= invite.maxUses) {
      throw new BadRequestError('This invite link has reached maximum usage capacity');
    }

    const conv = invite.conversation;
    if (conv.members.length >= MAX_GROUP_MEMBERS) {
      throw new BadRequestError(`Group has reached maximum capacity of ${MAX_GROUP_MEMBERS} members`);
    }

    // Check existing active membership
    const existingMember = conv.members.find((m) => m.userId === userId);
    if (existingMember) {
      return { conversation: conv, isAlreadyMember: true };
    }

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, nativeLanguage: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return await prisma.$transaction(async (tx) => {
      // Add member
      await tx.conversationMember.upsert({
        where: { uk_conv_user: { conversationId: conv.id, userId } },
        create: {
          conversationId: conv.id,
          userId,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        update: {
          role: 'MEMBER',
          status: 'ACTIVE',
          leftAt: null,
          joinedAt: new Date(),
        },
      });

      // Increment invite use count
      await tx.groupInvite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      });

      // System message
      const sysMessage = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: userId,
          contentOriginal: `${user.displayName} joined using an invite link`,
          originalLanguage: (user.nativeLanguage || 'en').toLowerCase(),
          idempotencyKey: `sys_join_${conv.id}_${userId}_${Date.now()}`,
          messageType: 'SYSTEM',
          systemMetadata: {
            eventType: 'MEMBER_JOINED',
            actorId: userId,
            actorName: user.displayName,
          },
          status: 'SENT',
        },
        include: {
          sender: { select: { id: true, displayName: true, nativeLanguage: true } },
          translations: true,
        },
      });

      const fullConv = await tx.conversation.findUnique({
        where: { id: conv.id },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, displayName: true, username: true } } },
          },
        },
      });

      return { conversation: fullConv!, sysMessage, isAlreadyMember: false };
    }, { maxWait: 10000, timeout: 20000 });
  }
}
