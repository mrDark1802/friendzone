import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.config.js';
import { prisma } from '../../config/database.js';

export class CallsController {
  /**
   * Generates dynamic, short-lived (5-15 min) ephemeral TURN/STUN ICE servers for authenticated user.
   * Calls Cloudflare Realtime TURN API when CLOUDFLARE_TURN_KEY_ID & CLOUDFLARE_TURN_API_TOKEN are configured.
   * Never exposes long-lived secrets to the client or logs.
   */
  async getIceServers(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ttlSeconds = 600; // 10 minutes ephemeral TTL
    const cfKeyId = process.env.CLOUDFLARE_TURN_KEY_ID || env.CLOUDFLARE_TURN_KEY_ID;
    const cfApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN || env.CLOUDFLARE_TURN_API_TOKEN;

    const defaultStunServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ];

    // Try Cloudflare Realtime TURN API if credentials exist
    if (cfKeyId && cfApiToken) {
      try {
        const cfUrl = `https://rtc.live.cloudflare.com/v1/turn/keys/${cfKeyId}/credentials/generate-ice-servers`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(cfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: ttlSeconds }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data: any = await response.json();
          if (data && Array.isArray(data.iceServers)) {
            return res.json({
              iceServers: [...defaultStunServers, ...data.iceServers],
              ttlSeconds,
            });
          }
          if (Array.isArray(data)) {
            return res.json({
              iceServers: [...defaultStunServers, ...data],
              ttlSeconds,
            });
          }
        } else {
          logger.warn({ status: response.status }, '⚠️ Cloudflare Realtime TURN API returned non-200 status');
        }
      } catch (err: any) {
        logger.warn({ errorName: err?.name || 'Error' }, '⚠️ Cloudflare Realtime TURN API call failed, falling back to STUN');
      }
    }

    // HMAC Fallback for custom TURN server (if configured)
    const turnServer = process.env.TURN_SERVER;
    const turnSecret = process.env.TURN_SECRET;
    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [...defaultStunServers];

    if (turnServer && turnSecret) {
      const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
      const username = `${timestamp}:${userId}`;
      const hmac = crypto.createHmac('sha1', turnSecret);
      hmac.update(username);
      const credential = hmac.digest('base64');

      iceServers.push({
        urls: [turnServer.startsWith('turn:') ? turnServer : `turn:${turnServer}`],
        username,
        credential,
      });
    }

    return res.json({
      iceServers,
      ttlSeconds,
    });
  }

  /**
   * Retrieves recent call history for the authenticated user across all conversations.
   */
  async getCallHistory(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const userConvs = await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });

      const convIds = userConvs.map((c: { conversationId: string }) => c.conversationId);

      const callLogs = await prisma.message.findMany({
        where: {
          conversationId: { in: convIds },
          OR: [
            { contentOriginal: { startsWith: '📞' } },
            { contentOriginal: { startsWith: '📹' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          sender: {
            select: { id: true, displayName: true, username: true },
          },
          conversation: {
            include: {
              members: {
                include: {
                  user: {
                    select: { id: true, displayName: true, username: true },
                  },
                },
              },
            },
          },
        },
      });

      const formatted = callLogs.map((log: any) => {
        const otherMember = log.conversation.members.find((m: any) => m.userId !== userId)?.user;
        const isCaller = log.senderId === userId;
        const isMissed = log.contentOriginal.toLowerCase().includes('missed') || log.contentOriginal.toLowerCase().includes('declined');
        const isVideo = log.contentOriginal.includes('📹') || log.contentOriginal.toLowerCase().includes('video');

        return {
          id: log.id,
          conversationId: log.conversationId,
          peer: otherMember || { id: log.sender.id, displayName: log.sender.displayName, avatar: log.sender.avatar },
          type: isVideo ? 'video' : 'audio',
          direction: isCaller ? 'outgoing' : 'incoming',
          status: isMissed ? (isCaller ? 'cancelled' : 'missed') : 'completed',
          text: log.contentOriginal,
          createdAt: log.createdAt,
        };
      });

      return res.json({ calls: formatted });
    } catch (err: any) {
      logger.error({ err }, 'Failed to fetch call history');
      return res.status(500).json({ error: 'Failed to fetch call history' });
    }
  }
}
