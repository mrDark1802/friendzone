import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, JwtPayload } from '../../utils/crypto.utils.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { MessagesService } from '../../modules/messages/messages.service.js';
import { QuotaService } from '../../modules/users/quota.service.js';
import { enqueueTranslationJob } from '../queue/translation.queue.js';
import { env } from '../../config/env.config.js';
import { callRegistry } from '../../modules/calls/calls.registry.js';
import crypto from 'crypto';

export interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export class SocketServer {
  private io: SocketIOServer;
  private messagesService = new MessagesService();
  private onlineUsers = new Map<string, number>(); // userId -> active socket count

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          callback(null, origin || true);
        },
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 10000,
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    this.setupHandshakeAuth();
    this.setupEventHandlers();
  }

  private setupHandshakeAuth() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.split(' ')[1] ||
          (socket.handshake.query?.token as string);

        if (!token) {
          return next(new Error('Authentication error: Missing token'));
        }

        const decoded = verifyAccessToken(token);
        socket.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid or expired token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      const userId = socket.user?.userId;
      logger.info({ userId, socketId: socket.id }, '🔌 User connected via WebSocket');

      if (userId) {
        // Join Personal Room
        socket.join(`user:${userId}`);

        // Track Online Count per User
        const currentSockets = this.onlineUsers.get(userId) || 0;
        this.onlineUsers.set(userId, currentSockets + 1);

        if (currentSockets === 0) {
          // User just came online
          this.io.emit('user_status_changed', {
            userId,
            status: 'ONLINE',
            lastSeen: null,
          });
        }

        // Check if user has active call in socket recovery state
        const activeCall = callRegistry.getCallByUserId(userId);
        if (activeCall && activeCall.recoveryTimeoutTimer) {
          clearTimeout(activeCall.recoveryTimeoutTimer);
          activeCall.recoveryTimeoutTimer = undefined;
          logger.info({ userId, callId: activeCall.callId }, '🔄 User socket reconnected within call recovery window');
          socket.emit('call:reconnected', { callId: activeCall.callId, status: activeCall.status });
        }
      }

      // Query Online Status of Users
      socket.on('get_user_status', async ({ userIds }: { userIds: string[] }) => {
        if (!userIds || !Array.isArray(userIds)) return;
        const dbUsers = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, lastSeen: true },
        });

        const statusMap = dbUsers.map((u) => ({
          userId: u.id,
          isOnline: (this.onlineUsers.get(u.id) || 0) > 0,
          lastSeen: u.lastSeen ? u.lastSeen.toISOString() : null,
        }));

        socket.emit('user_status_response', statusMap);
      });

      // Real-time Typing Start Listener
      socket.on('typing_start', ({ conversationId }: { conversationId: string }) => {
        if (!conversationId || !userId) return;
        socket.to(`conv:${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
        });
      });

      // Real-time Typing Stop Listener
      socket.on('typing_stop', ({ conversationId }: { conversationId: string }) => {
        if (!conversationId || !userId) return;
        socket.to(`conv:${conversationId}`).emit('user_stopped_typing', {
          conversationId,
          userId,
        });
      });

      // Join Conversation Room with authorization check
      socket.on('join_conversation', async ({ conversationId }: { conversationId: string }) => {
        try {
          const membership = await prisma.conversationMember.findUnique({
            where: { uk_conv_user: { conversationId, userId: userId! } },
          });

          if (!membership || membership.status !== 'ACTIVE') {
            socket.emit('error', { message: 'Unauthorized to join conversation room' });
            return;
          }

          socket.join(`conv:${conversationId}`);
          logger.info({ userId, conversationId }, '🚪 Joined conversation room');
        } catch (error) {
          logger.error({ error }, 'Error joining conversation room');
        }
      });

      // Real-time Send Message Listener
      socket.on(
        'send_message',
        async (
          payload: {
            conversationId: string;
            contentOriginal: string;
            originalLanguage: string;
            idempotencyKey: string;
          },
          ackCallback?: (response: any) => void
        ) => {
          try {
            const { conversationId, contentOriginal, originalLanguage, idempotencyKey } = payload;
            const senderId = userId!;
            const msgStart = performance.now();

            console.log(`\n📨 [SOCKET send_message] convId=${conversationId} | lang=${originalLanguage} | text="${contentOriginal.slice(0, 40)}${contentOriginal.length > 40 ? '…' : ''}"`);

            // 1. Save original message to DB
            const dbSaveStart = performance.now();
            const { message, isDuplicate } = await this.messagesService.createMessage({
              conversationId,
              senderId,
              contentOriginal,
              originalLanguage,
              idempotencyKey,
            });
            console.log(`💾 [SOCKET] DB save done in ${(performance.now() - dbSaveStart).toFixed(1)}ms | isDuplicate=${isDuplicate} | msgId=${message.id}`);

            // Send ACK callback to sender
            if (ackCallback) {
              ackCallback({ status: 'saved', messageId: message.id, isDuplicate });
            }

            // 2. Broadcast original message immediately
            const broadcastStart = performance.now();
            this.io.to(`conv:${conversationId}`).emit('message_sent', { message });
            console.log(`📡 [SOCKET] Broadcast to room in ${(performance.now() - broadcastStart).toFixed(1)}ms`);

            if (isDuplicate) return;

            // 3. Fetch members for translation filtering
            const membersStart = performance.now();
            const members = await prisma.conversationMember.findMany({
              where: { conversationId },
              include: {
                user: { select: { id: true, nativeLanguage: true, translationEnabled: true } },
              },
            });
            console.log(`👥 [SOCKET] Fetched ${members.length} members in ${(performance.now() - membersStart).toFixed(1)}ms`);

            // Use sender's DB nativeLanguage as authoritative source
            const senderMember = members.find((m) => m.userId === senderId);
            const senderLang = (senderMember?.user.nativeLanguage || originalLanguage).toLowerCase();
            const requiredTargetLangs = new Set<string>();

            console.log(`🔤 [SOCKET] Sender language (from DB): "${senderLang}"`);

            const quotaService = new QuotaService();

            for (const member of members) {
              if (member.userId === senderId) continue;
              if (!member.user.translationEnabled) {
                console.log(`⏭️  [SOCKET] Skipping userId=${member.userId} — translationEnabled=false`);
                continue;
              }

              const targetLang = (member.preferredLanguage || member.user.nativeLanguage).toLowerCase();
              if (targetLang === senderLang) {
                console.log(`⏭️  [SOCKET] Skipping userId=${member.userId} — same language (${targetLang})`);
                continue;
              }

              // Check Subscription Quota for Recipient
              try {
                await quotaService.checkAndIncrementQuota(member.userId);
              } catch (quotaErr: any) {
                if (quotaErr.code === 'QUOTA_EXCEEDED') {
                  console.log(`🚫 [QUOTA EXCEEDED] userId=${member.userId} reached limit!`);
                  socket.to(`user:${member.userId}`).emit('quota_exceeded', {
                    message: quotaErr.message,
                  });
                  this.io.to(`conv:${conversationId}`).emit('message_translated', {
                    messageId: message.id,
                    targetLanguage: targetLang,
                    translatedContent: null,
                    status: 'QUOTA_EXCEEDED',
                  });
                  continue;
                }
              }

              console.log(`🎯 [SOCKET] Will translate to "${targetLang}" for userId=${member.userId}`);
              requiredTargetLangs.add(targetLang);
            }

            console.log(`📋 [SOCKET] Translation targets: [${Array.from(requiredTargetLangs).join(', ') || 'none'}]`);

            // 4. Enqueue Translation Jobs
            for (const targetLang of Array.from(requiredTargetLangs)) {
              // Pre-create pending MessageTranslation row
              const pendingStart = performance.now();
              await prisma.messageTranslation.upsert({
                where: {
                  uk_message_target_lang: { messageId: message.id, targetLanguage: targetLang },
                },
                create: {
                  messageId: message.id,
                  targetLanguage: targetLang,
                  status: 'PENDING',
                },
                update: {},
              });
              console.log(`📝 [SOCKET] PENDING row created in ${(performance.now() - pendingStart).toFixed(1)}ms for targetLang=${targetLang}`);

              const jobStart = performance.now();
              console.log(`🚀 [SOCKET] Starting translation job: ${senderLang} → ${targetLang}`);

              // Run translation and emit result (non-blocking per language)
              enqueueTranslationJob({
                messageId: message.id,
                conversationId,
                sourceLanguage: senderLang,
                targetLanguage: targetLang,
                textOriginal: contentOriginal,
              }).then((translatedText) => {
                const jobMs = (performance.now() - jobStart).toFixed(1);
                const totalMs = (performance.now() - msgStart).toFixed(1);
                console.log(`✅ [SOCKET] Translation job done in ${jobMs}ms | total from msg receive: ${totalMs}ms`);
                console.log(`📤 [SOCKET] Emitting message_translated to room conv:${conversationId}`);
                this.io.to(`conv:${conversationId}`).emit('message_translated', {
                  messageId: message.id,
                  targetLanguage: targetLang,
                  translatedContent: translatedText,
                  status: translatedText ? 'COMPLETED' : 'FAILED',
                });
              }).catch((err) => {
                const jobMs = (performance.now() - jobStart).toFixed(1);
                console.error(`❌ [SOCKET] Translation job FAILED after ${jobMs}ms:`, err?.message || err);
                logger.error({ err, messageId: message.id, targetLang }, 'Translation job failed');
                this.io.to(`conv:${conversationId}`).emit('message_translated', {
                  messageId: message.id,
                  targetLanguage: targetLang,
                  translatedContent: null,
                  status: 'FAILED',
                });
              });
            }

            console.log(`🏁 [SOCKET] send_message handler completed in ${(performance.now() - msgStart).toFixed(1)}ms (translation running async)\n`);
          } catch (error: any) {
            logger.error({ error }, 'Error in WebSocket send_message handler');
            socket.emit('error', { message: error.message || 'Failed to send message' });
          }
        }
      );

      // Real-time Read Receipt Listener
      socket.on('mark_read', async ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
        try {
          await this.messagesService.markRead(conversationId, userId!, messageId);
          this.io.to(`conv:${conversationId}`).emit('read_receipt', {
            conversationId,
            userId,
            lastReadMessageId: messageId,
          });
        } catch (error) {
          logger.error({ error }, 'Error marking read');
        }
      });

      // ==========================================
      // WEBRTC 1-ON-1 CALL SIGNALING HANDLERS
      // ==========================================

      socket.on('call:invite', async ({ conversationId, targetUserId, type }: { conversationId: string; targetUserId: string; type: 'audio' | 'video' }) => {
        if (!userId || !conversationId || !targetUserId) return;

        const member = await prisma.conversationMember.findFirst({
          where: { conversationId, userId },
        });

        if (!member) {
          socket.emit('call:error', { message: 'Unauthorized: You are not a member of this conversation' });
          return;
        }

        const targetMember = await prisma.conversationMember.findFirst({
          where: { conversationId, userId: targetUserId },
        });

        if (!targetMember) {
          socket.emit('call:error', { message: 'Target user is not a member of this conversation' });
          return;
        }

        const block = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: targetUserId },
              { blockerId: targetUserId, blockedId: userId },
            ],
          },
        });

        if (block) {
          socket.emit('call:error', { message: 'Cannot place call due to user block settings' });
          return;
        }

        const callId = `call_${crypto.randomUUID()}`;
        const expiresAt = new Date(Date.now() + 35000);

        const creationResult = callRegistry.tryCreateCall({
          callId,
          conversationId,
          callerId: userId,
          targetId: targetUserId,
          type,
          status: 'RINGING',
          createdAt: new Date(),
          expiresAt,
        });

        if (!creationResult.success) {
          socket.emit('call:busy', {
            callId,
            reason: creationResult.reason === 'BUSY_CALLER' ? 'You are already in a call' : 'User is busy in another call',
          });
          return;
        }

        const callerInfo = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, displayName: true },
        });

        const session = callRegistry.getCall(callId)!;
        session.ringingTimeoutTimer = setTimeout(() => {
          const currentSession = callRegistry.getCall(callId);
          if (currentSession && currentSession.status === 'RINGING') {
            callRegistry.updateCallStatus(callId, 'TIMEOUT');
            this.io.to(`user:${userId}`).emit('call:timeout', { callId });
            this.io.to(`user:${targetUserId}`).emit('call:timeout', { callId });
            callRegistry.removeCall(callId);
          }
        }, 35000);

        this.io.to(`user:${targetUserId}`).emit('call:incoming', {
          callId,
          conversationId,
          caller: callerInfo,
          type,
        });

        socket.emit('call:initiated', { callId, status: 'RINGING' });
      });

      socket.on('call:accept', async ({ callId }: { callId: string }) => {
        if (!userId || !callId) return;
        const session = callRegistry.getCall(callId);
        if (!session || session.targetId !== userId) {
          socket.emit('call:error', { message: 'Invalid call session or unauthorized' });
          return;
        }

        if (session.status !== 'RINGING') {
          socket.emit('call:error', { message: `Cannot accept call in status ${session.status}` });
          return;
        }

        if (session.ringingTimeoutTimer) {
          clearTimeout(session.ringingTimeoutTimer);
          session.ringingTimeoutTimer = undefined;
        }

        callRegistry.updateCallStatus(callId, 'ACCEPTED');
        this.io.to(`user:${session.callerId}`).emit('call:accepted', { callId });
        socket.emit('call:accepted', { callId });
      });

      socket.on('call:connected', async ({ callId }: { callId: string }) => {
        if (!userId || !callId) return;
        const session = callRegistry.getCall(callId);
        if (!session || (session.callerId !== userId && session.targetId !== userId)) {
          socket.emit('call:error', { message: 'Invalid call session or unauthorized' });
          return;
        }

        if (session.status !== 'CONNECTED') {
          callRegistry.updateCallStatus(callId, 'CONNECTED');
        }

        const peerId = session.callerId === userId ? session.targetId : session.callerId;
        this.io.to(`user:${peerId}`).emit('call:connected', { callId });
      });

      socket.on('call:decline', async (payload: { callId?: string }) => {
        if (!userId) return;
        let session = payload?.callId ? callRegistry.getCall(payload.callId) : callRegistry.getCallByUserId(userId);
        if (!session) session = callRegistry.getCallByUserId(userId);
        if (!session) return;

        callRegistry.updateCallStatus(session.callId, 'DECLINED');
        this.io.to(`user:${session.callerId}`).emit('call:declined', { callId: session.callId });
        
        try {
          const logText = session.type === 'video' ? '📹 Video call declined' : '📞 Voice call declined';
          const { message } = await this.messagesService.createMessage({
            conversationId: session.conversationId,
            senderId: session.targetId,
            contentOriginal: logText,
            originalLanguage: 'en',
            idempotencyKey: `log_dec_${session.callId}`,
          });
          this.io.to(`conv:${session.conversationId}`).to(`user:${session.callerId}`).to(`user:${session.targetId}`).emit('message_sent', { message });
        } catch (e) {}

        callRegistry.removeCall(session.callId);
        callRegistry.forceClearUserCalls(userId);
      });

      socket.on('call:cancel', async (payload: { callId?: string }) => {
        if (!userId) return;
        let session = payload?.callId ? callRegistry.getCall(payload.callId) : callRegistry.getCallByUserId(userId);
        if (!session) session = callRegistry.getCallByUserId(userId);
        if (!session) {
          callRegistry.forceClearUserCalls(userId);
          return;
        }

        callRegistry.updateCallStatus(session.callId, 'CANCELLED');
        this.io.to(`user:${session.targetId}`).emit('call:cancelled', { callId: session.callId });

        try {
          const logText = session.type === 'video' ? '📹 Video call cancelled' : '📞 Voice call cancelled';
          const { message } = await this.messagesService.createMessage({
            conversationId: session.conversationId,
            senderId: session.callerId,
            contentOriginal: logText,
            originalLanguage: 'en',
            idempotencyKey: `log_can_${session.callId}_${Date.now()}`,
          });
          this.io.to(`conv:${session.conversationId}`).to(`user:${session.callerId}`).to(`user:${session.targetId}`).emit('message_sent', { message });
        } catch (e) {}

        callRegistry.removeCall(session.callId);
        callRegistry.forceClearUserCalls(userId);
      });

      socket.on('call:end', async (payload: { callId?: string }) => {
        if (!userId) return;
        let session = payload?.callId ? callRegistry.getCall(payload.callId) : callRegistry.getCallByUserId(userId);
        if (!session) session = callRegistry.getCallByUserId(userId);
        if (!session) {
          callRegistry.forceClearUserCalls(userId);
          return;
        }

        const peerId = session.callerId === userId ? session.targetId : session.callerId;
        callRegistry.updateCallStatus(session.callId, 'ENDED');
        this.io.to(`user:${peerId}`).emit('call:ended', { callId: session.callId });

        try {
          const durationSeconds = Math.max(1, Math.floor((Date.now() - session.createdAt.getTime()) / 1000));
          const mins = Math.floor(durationSeconds / 60);
          const secs = durationSeconds % 60;
          const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
          const logText = session.type === 'video' ? `📹 Video call • ${durationStr}` : `📞 Voice call • ${durationStr}`;
          
          const { message } = await this.messagesService.createMessage({
            conversationId: session.conversationId,
            senderId: userId,
            contentOriginal: logText,
            originalLanguage: 'en',
            idempotencyKey: `log_end_${session.callId}_${Date.now()}`,
          });
          this.io.to(`conv:${session.conversationId}`).to(`user:${session.callerId}`).to(`user:${session.targetId}`).emit('message_sent', { message });
        } catch (e) {}

        callRegistry.removeCall(session.callId);
        callRegistry.forceClearUserCalls(userId);
      });

      socket.on('webrtc:offer', ({ callId, targetUserId, offer }: { callId: string; targetUserId: string; offer: any }) => {
        if (!userId || !callId || !targetUserId || !offer) return;
        const session = callRegistry.getCall(callId);
        if (!session || (session.callerId !== userId && session.targetId !== userId)) return;
        this.io.to(`user:${targetUserId}`).emit('webrtc:offer', { callId, fromUserId: userId, offer });
      });

      socket.on('webrtc:answer', ({ callId, targetUserId, answer }: { callId: string; targetUserId: string; answer: any }) => {
        if (!userId || !callId || !targetUserId || !answer) return;
        const session = callRegistry.getCall(callId);
        if (!session || (session.callerId !== userId && session.targetId !== userId)) return;
        this.io.to(`user:${targetUserId}`).emit('webrtc:answer', { callId, fromUserId: userId, answer });
      });

      socket.on('webrtc:ice-candidate', ({ callId, targetUserId, candidate }: { callId: string; targetUserId: string; candidate: any }) => {
        if (!userId || !callId || !targetUserId || !candidate) return;
        const session = callRegistry.getCall(callId);
        if (!session || (session.callerId !== userId && session.targetId !== userId)) return;
        this.io.to(`user:${targetUserId}`).emit('webrtc:ice-candidate', { callId, fromUserId: userId, candidate });
      });

      socket.on('disconnect', async () => {
        logger.info({ userId, socketId: socket.id }, '🔌 User disconnected');
        if (userId) {
          const currentSockets = this.onlineUsers.get(userId) || 1;
          const remainingSockets = currentSockets - 1;

          // If user was in an active CONNECTED call, start 45s socket recovery timer
          const activeCall = callRegistry.getCallByUserId(userId);
          if (activeCall && activeCall.status === 'CONNECTED' && remainingSockets <= 0) {
            const peerId = activeCall.callerId === userId ? activeCall.targetId : activeCall.callerId;
            activeCall.recoveryTimeoutTimer = setTimeout(() => {
              const checkCall = callRegistry.getCall(activeCall.callId);
              if (checkCall && checkCall.status === 'CONNECTED') {
                callRegistry.updateCallStatus(activeCall.callId, 'FAILED');
                this.io.to(`user:${peerId}`).emit('call:ended', { callId: activeCall.callId, reason: 'RECOVERY_TIMEOUT' });
                callRegistry.removeCall(activeCall.callId);
              }
            }, 45000);
          }

          if (remainingSockets <= 0) {
            this.onlineUsers.delete(userId);
            const lastSeen = new Date();
            await prisma.user.update({ where: { id: userId }, data: { lastSeen } }).catch(() => {});
            this.io.emit('user_status_changed', {
              userId,
              status: 'OFFLINE',
              lastSeen: lastSeen.toISOString(),
            });
          } else {
            this.onlineUsers.set(userId, remainingSockets);
          }
        }
      });
    });
  }

  /**
   * Broadcasts translation completed event to conversation room.
   */
  async emitTranslationCompleted(payload: {
    messageId: string;
    targetLanguage: string;
    translatedContent: string | null;
    status: 'COMPLETED' | 'FAILED';
  }) {
    const message = await prisma.message.findUnique({
      where: { id: payload.messageId },
      select: { conversationId: true },
    });

    if (message) {
      this.io.to(`conv:${message.conversationId}`).emit('message_translated', payload);
    }
  }

  /**
   * Broadcasts real-time friend request received event to target user.
   */
  emitFriendRequestReceived(targetUserId: string, payload: any) {
    this.io.to(`user:${targetUserId}`).emit('friend_request_received', payload);
  }

  /**
   * Broadcasts group created event to all initial group members' personal rooms.
   */
  emitGroupCreated(memberUserIds: string[], payload: any) {
    memberUserIds.forEach((userId) => {
      this.io.to(`user:${userId}`).emit('group:created', payload);
    });
  }

  /**
   * Broadcasts group event to conversation room and affected users.
   */
  emitGroupEvent(conversationId: string, eventName: string, payload: any, targetUserIds?: string[]) {
    this.io.to(`conv:${conversationId}`).emit(eventName, payload);
    if (targetUserIds && targetUserIds.length > 0) {
      targetUserIds.forEach((userId) => {
        this.io.to(`user:${userId}`).emit(eventName, payload);
      });
    }
  }
}

export let socketServer: SocketServer | undefined;

export function initializeSocketServer(httpServer: HTTPServer): SocketServer {
  socketServer = new SocketServer(httpServer);
  return socketServer;
}
