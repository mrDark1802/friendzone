import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';

export interface NotificationDTO {
  id: string;
  type: 'FRIEND_REQUEST' | 'MESSAGE' | 'SYSTEM';
  title: string;
  content: string;
  senderId?: string;
  senderName?: string;
  senderUsername?: string;
  senderAvatar?: string;
  isRead: boolean;
  createdAt: string;
}

// In-memory fallback set for read notifications if Redis is offline
const inMemoryReadSet = new Set<string>();

export class NotificationsService {
  private getReadSetKey(userId: string): string {
    return `fz:notifs_read:${userId}`;
  }

  async isNotificationRead(userId: string, notifId: string): Promise<boolean> {
    try {
      const isMember = await redis.sismember(this.getReadSetKey(userId), notifId);
      if (isMember === 1) return true;
    } catch {
      // Fallback
    }
    return inMemoryReadSet.has(`${userId}:${notifId}`);
  }

  async getUserNotifications(userId: string): Promise<NotificationDTO[]> {
    const notifications: NotificationDTO[] = [];

    // 1. Pending Friend Requests received by userId
    const pendingRequests = await prisma.friendship.findMany({
      where: {
        status: 'PENDING',
        actionUserId: { not: userId },
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        actionUser: { select: { id: true, displayName: true, email: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const req of pendingRequests) {
      const requester = req.actionUser;
      const notifId = `friend_req_${req.id}`;
      const isRead = await this.isNotificationRead(userId, notifId);

      notifications.push({
        id: notifId,
        type: 'FRIEND_REQUEST',
        title: 'New Connection Request',
        content: `${requester.displayName} (@${requester.username || requester.email.split('@')[0]}) sent you a friend request.`,
        senderId: requester.id,
        senderName: requester.displayName,
        senderUsername: requester.username || requester.email.split('@')[0],
        isRead,
        createdAt: req.createdAt.toISOString(),
      });
    }

    // 2. Recent Messages in user's conversations
    const userConvs = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true, lastReadMessageId: true },
    });

    const convMap = new Map<string, string | null>();
    userConvs.forEach((c) => convMap.set(c.conversationId, c.lastReadMessageId));

    const convIds = Array.from(convMap.keys());
    if (convIds.length > 0) {
      const recentMessages = await prisma.message.findMany({
        where: {
          conversationId: { in: convIds },
          senderId: { not: userId },
        },
        include: {
          sender: { select: { id: true, displayName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      for (const msg of recentMessages) {
        const notifId = `msg_${msg.id}`;
        let isRead = await this.isNotificationRead(userId, notifId);

        // If the user's lastReadMessageId in this conversation is >= this message's ID or created timestamp, mark as read
        const lastReadMsgId = convMap.get(msg.conversationId);
        if (!isRead && lastReadMsgId) {
          if (lastReadMsgId === msg.id) {
            isRead = true;
          } else {
            const lastReadMsg = await prisma.message.findUnique({
              where: { id: lastReadMsgId },
              select: { createdAt: true },
            });
            if (lastReadMsg && msg.createdAt <= lastReadMsg.createdAt) {
              isRead = true;
            }
          }
        }

        notifications.push({
          id: notifId,
          type: 'MESSAGE',
          title: `New Message from ${msg.sender.displayName}`,
          content: msg.contentOriginal.length > 60 ? `${msg.contentOriginal.substring(0, 60)}...` : msg.contentOriginal,
          senderId: msg.sender.id,
          senderName: msg.sender.displayName,
          senderUsername: msg.sender.username,
          isRead,
          createdAt: msg.createdAt.toISOString(),
        });
      }
    }

    // Sort by createdAt descending
    return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markRead(userId: string, notifId?: string): Promise<boolean> {
    if (notifId) {
      try {
        await redis.sadd(this.getReadSetKey(userId), notifId);
      } catch {
        inMemoryReadSet.add(`${userId}:${notifId}`);
      }
    } else {
      // Mark all current notifications read
      const currentNotifs = await this.getUserNotifications(userId);
      for (const n of currentNotifs) {
        try {
          await redis.sadd(this.getReadSetKey(userId), n.id);
        } catch {
          inMemoryReadSet.add(`${userId}:${n.id}`);
        }
      }
    }
    return true;
  }
}
