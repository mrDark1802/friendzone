import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, JwtPayload } from '../../utils/crypto.utils.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { MessagesService } from '../../modules/messages/messages.service.js';
import { QuotaService, QuotaReservation } from '../../modules/users/quota.service.js';
import { enqueueTranslationJob } from '../queue/translation.queue.js';
import { env } from '../../config/env.config.js';
import { callRegistry } from '../../modules/calls/calls.registry.js';
import crypto from 'crypto';
import { checkSocketRateLimit } from './socket.ratelimit.js';
import {
  validateSocketPayload,
  JoinConversationSchema,
  LeaveConversationSchema,
  TypingSchema,
  GetUserStatusSchema,
  SendMessageSchema,
  EditMessageSchema,
  DeleteMessageSchema,
  MarkReadSchema,
  CallInviteSchema,
  CallActionSchema,
  CallAcceptSchema,
  WebRTCOfferSchema,
  WebRTCAnswerSchema,
  WebRTCIceCandidateSchema,
} from './socket.validation.js';

export interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export class SocketServer {
  private io: SocketIOServer;
  private messagesService = new MessagesService();
  private onlineUsers = new Map<string, number>(); // userId -> active socket count

  constructor(httpServer: HTTPServer) {
    const defaultDevOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
    ];

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const envOrigins = [env.CORS_ORIGIN, env.FRONTEND_URL]
            .filter(Boolean)
            .flatMap((o) => (o ? o.split(',').map((s) => s.trim()) : [])) as string[];
          const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
          const allowedOrigins = new Set(isDev ? [...defaultDevOrigins, ...envOrigins] : envOrigins);

          if (allowedOrigins.has(origin)) {
            return callback(null, true);
          }
          logger.warn({ origin, nodeEnv: env.NODE_ENV }, '⚠️ Socket.IO connection blocked by CORS policy');
          callback(new Error('Socket.IO CORS policy violation: Origin not allowed'));
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
      socket.on('get_user_status', async (rawPayload: unknown) => {
        const validation = validateSocketPayload(GetUserStatusSchema, rawPayload);
        if (!validation.success) return;

        const { userIds } = validation.data;
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
      socket.on('typing_start', async (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(TypingSchema, rawPayload);
        if (!validation.success) return;

        const rateLimit = await checkSocketRateLimit(userId, 'typing');
        if (!rateLimit.allowed) return;

        socket.to(`conv:${validation.data.conversationId}`).emit('user_typing', {
          conversationId: validation.data.conversationId,
          userId,
        });
      });

      // Real-time Typing Stop Listener
      socket.on('typing_stop', (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(TypingSchema, rawPayload);
        if (!validation.success) return;

        socket.to(`conv:${validation.data.conversationId}`).emit('user_stopped_typing', {
          conversationId: validation.data.conversationId,
          userId,
        });
      });

      // Join Conversation Room with authorization check
      socket.on('join_conversation', async (rawPayload: unknown) => {
        try {
          if (!userId) return;
          const validation = validateSocketPayload(JoinConversationSchema, rawPayload);
          if (!validation.success) {
            socket.emit('error', { code: 'INVALID_PAYLOAD', message: validation.error });
            return;
          }

          const { conversationId } = validation.data;
          const membership = await prisma.conversationMember.findUnique({
            where: { uk_conv_user: { conversationId, userId } },
          });

          if (!membership || membership.status !== 'ACTIVE') {
            socket.emit('error', { code: 'UNAUTHORIZED', message: 'Unauthorized to join conversation room' });
            return;
          }

          socket.join(`conv:${conversationId}`);
          logger.info({ userId, conversationId }, '🚪 Joined conversation room');
        } catch (error) {
          logger.error({ error }, 'Error joining conversation room');
        }
      });

      // Leave Conversation Room
      socket.on('leave_conversation', (rawPayload: unknown) => {
        const validation = validateSocketPayload(LeaveConversationSchema, rawPayload);
        if (validation.success) {
          socket.leave(`conv:${validation.data.conversationId}`);
          logger.info({ userId, conversationId: validation.data.conversationId }, '🚪 Left conversation room');
        }
      });

      // Real-time Send Message Listener
      socket.on(
        'send_message',
        async (
          rawPayload: unknown,
          ackCallback?: (response: any) => void
        ) => {
          try {
            if (!userId) {
              ackCallback?.({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
              return;
            }

            // MED-7: Schema validation
            const validation = validateSocketPayload(SendMessageSchema, rawPayload);
            if (!validation.success) {
              logger.warn({ userId, error: validation.error }, '⚠️ Rejected invalid send_message payload');
              ackCallback?.({ status: 'error', code: 'INVALID_PAYLOAD', message: validation.error });
              socket.emit('error', { code: 'INVALID_PAYLOAD', message: validation.error });
              return;
            }

            // HIGH-9: Socket Rate Limiting
            const rateLimit = await checkSocketRateLimit(userId, 'send_message');
            if (!rateLimit.allowed) {
              logger.warn({ userId, retryAfterSeconds: rateLimit.retryAfterSeconds }, '⚠️ Rate limit exceeded for send_message');
              const errMsg = 'Rate limit exceeded: Too many messages. Please slow down.';
              ackCallback?.({ status: 'rate_limited', code: 'RATE_LIMIT_EXCEEDED', message: errMsg, retryAfterSeconds: rateLimit.retryAfterSeconds });
              socket.emit('error', { code: 'RATE_LIMIT_EXCEEDED', message: errMsg });
              return;
            }

            const { conversationId, contentOriginal, originalLanguage, idempotencyKey } = validation.data;
            const senderId = userId;
            const msgStart = performance.now();

            // Authorization: Verify sender is an ACTIVE member of the conversation
            const senderMembership = await prisma.conversationMember.findUnique({
              where: { uk_conv_user: { conversationId, userId: senderId } },
            });

            if (!senderMembership || senderMembership.status !== 'ACTIVE') {
              logger.warn({ userId, conversationId }, '⚠️ User attempted to send message to unauthorized conversation');
              ackCallback?.({ status: 'forbidden', code: 'FORBIDDEN', message: 'You are not an active member of this conversation' });
              socket.emit('error', { code: 'FORBIDDEN', message: 'Unauthorized conversation action' });
              return;
            }

            const origLang = (validation.data.originalLanguage || 'en').toLowerCase();
            console.log(`\n📨 [SOCKET send_message] convId=${conversationId} | lang=${origLang} | text="${contentOriginal.slice(0, 40)}${contentOriginal.length > 40 ? '…' : ''}"`);

            // 1. Save original message to DB with idempotency deduplication
            const dbSaveStart = performance.now();
            const { message, isDuplicate } = await this.messagesService.createMessage({
              conversationId,
              senderId,
              contentOriginal,
              originalLanguage: origLang,
              idempotencyKey,
            });
            console.log(`💾 [SOCKET] DB save done in ${(performance.now() - dbSaveStart).toFixed(1)}ms | isDuplicate=${isDuplicate} | msgId=${message.id}`);

            // Send ACK callback to sender
            if (ackCallback) {
              ackCallback({ status: 'saved', messageId: message.id, isDuplicate });
            }

            // CRIT-5: If duplicate message retry, stop immediately! Do NOT broadcast or re-translate.
            if (isDuplicate) return;

            // 2. Fetch members for translation filtering & user-room broadcasting
            const membersStart = performance.now();
            const members = await prisma.conversationMember.findMany({
              where: { conversationId, status: 'ACTIVE' },
              include: {
                user: { select: { id: true, nativeLanguage: true, translationEnabled: true } },
              },
            });
            console.log(`👥 [SOCKET] Fetched ${members.length} members in ${(performance.now() - membersStart).toFixed(1)}ms`);

            // CRIT-1: Broadcast original message to user rooms only (exactly-once delivery)
            const broadcastStart = performance.now();
            for (const m of members) {
              this.io.to(`user:${m.userId}`).emit('message_sent', { message });
            }
            console.log(`📡 [SOCKET] Broadcast message_sent to ${members.length} user channels in ${(performance.now() - broadcastStart).toFixed(1)}ms`);

            // Use sender's DB nativeLanguage as authoritative source
            const senderMember = members.find((m) => m.userId === senderId);
            const senderLang = (senderMember?.user.nativeLanguage || origLang || 'en').toLowerCase();
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

              console.log(`🎯 [SOCKET] Will translate to "${targetLang}" for userId=${member.userId}`);
              requiredTargetLangs.add(targetLang);
            }

            console.log(`📋 [SOCKET] Translation targets: [${Array.from(requiredTargetLangs).join(', ') || 'none'}]`);

            // CRIT-6: 1 original message requiring translation = 1 quota unit charged to SENDER
            let reservation: QuotaReservation | null = null;
            if (requiredTargetLangs.size > 0) {
              try {
                reservation = await quotaService.reserveQuota(senderId);
              } catch (quotaErr: any) {
                if (quotaErr.code === 'QUOTA_EXCEEDED') {
                  console.log(`🚫 [QUOTA EXCEEDED] senderId=${senderId} reached translation limit!`);
                  this.io.to(`user:${senderId}`).emit('quota_exceeded', {
                    code: 'QUOTA_EXCEEDED',
                    message: quotaErr.message,
                    conversationId,
                    messageId: message.id,
                  });
                  for (const targetLang of Array.from(requiredTargetLangs)) {
                    await prisma.messageTranslation.upsert({
                      where: {
                        uk_message_target_lang: { messageId: message.id, targetLanguage: targetLang },
                      },
                      create: {
                        messageId: message.id,
                        targetLanguage: targetLang,
                        status: 'FAILED',
                      },
                      update: {
                        status: 'FAILED',
                      },
                    });
                    const failPayload = {
                      messageId: message.id,
                      targetLanguage: targetLang,
                      translatedContent: null,
                      status: 'FAILED',
                    };
                    for (const m of members) {
                      this.io.to(`user:${m.userId}`).emit('message_translated', failPayload);
                    }
                  }
                  return;
                }
                throw quotaErr;
              }
            }

            // 4. Enqueue Translation Jobs
            let anyJobSucceeded = false;
            let completedJobsCount = 0;
            const totalJobs = requiredTargetLangs.size;
            let isReservationReleased = false;

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
                completedJobsCount++;
                if (translatedText) {
                  anyJobSucceeded = true;
                }
                const jobMs = (performance.now() - jobStart).toFixed(1);
                const totalMs = (performance.now() - msgStart).toFixed(1);
                console.log(`✅ [SOCKET] Translation job done in ${jobMs}ms | total from msg receive: ${totalMs}ms`);
                console.log(`📤 [SOCKET] Emitting message_translated to user channels`);
                const transPayload = {
                  messageId: message.id,
                  targetLanguage: targetLang,
                  translatedContent: translatedText,
                  status: translatedText ? 'COMPLETED' : 'FAILED',
                };
                for (const m of members) {
                  this.io.to(`user:${m.userId}`).emit('message_translated', transPayload);
                }

                // CRIT-7: If all translation jobs failed, safely release the reservation
                if (completedJobsCount === totalJobs && !anyJobSucceeded && reservation && !isReservationReleased) {
                  isReservationReleased = true;
                  quotaService.releaseQuota(reservation).catch(() => {});
                }
              }).catch((err) => {
                completedJobsCount++;
                const jobMs = (performance.now() - jobStart).toFixed(1);
                console.error(`❌ [SOCKET] Translation job FAILED after ${jobMs}ms:`, err?.message || err);
                logger.error({ err, messageId: message.id, targetLang }, 'Translation job failed');
                const failPayload = {
                  messageId: message.id,
                  targetLanguage: targetLang,
                  translatedContent: null,
                  status: 'FAILED',
                };
                for (const m of members) {
                  this.io.to(`user:${m.userId}`).emit('message_translated', failPayload);
                }

                // CRIT-7: If all translation jobs failed, safely release the reservation
                if (completedJobsCount === totalJobs && !anyJobSucceeded && reservation && !isReservationReleased) {
                  isReservationReleased = true;
                  quotaService.releaseQuota(reservation).catch(() => {});
                }
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
      socket.on('mark_read', async (rawPayload: unknown) => {
        try {
          if (!userId) return;
          const validation = validateSocketPayload(MarkReadSchema, rawPayload);
          if (!validation.success) return;

          const rateLimit = await checkSocketRateLimit(userId, 'mark_read');
          if (!rateLimit.allowed) return;

          const { conversationId, messageId } = validation.data;
          await this.messagesService.markRead(conversationId, userId, messageId);
          this.io.to(`conv:${conversationId}`).emit('read_receipt', {
            conversationId,
            userId,
            lastReadMessageId: messageId,
          });
        } catch (error) {
          logger.error({ error }, 'Error marking read');
        }
      });

      // Real-time Edit Message Listener with automatic re-translation
      socket.on(
        'edit_message',
        async (
          rawPayload: unknown,
          ackCallback?: (response: any) => void
        ) => {
          try {
            if (!userId) {
              ackCallback?.({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
              return;
            }

            const validation = validateSocketPayload(EditMessageSchema, rawPayload);
            if (!validation.success) {
              logger.warn({ userId, error: validation.error }, '⚠️ Rejected invalid edit_message payload');
              ackCallback?.({ status: 'error', code: 'INVALID_PAYLOAD', message: validation.error });
              socket.emit('error', { code: 'INVALID_PAYLOAD', message: validation.error });
              return;
            }

            const rateLimit = await checkSocketRateLimit(userId, 'edit_message');
            if (!rateLimit.allowed) {
              logger.warn({ userId }, '⚠️ Rate limit exceeded for edit_message');
              const errMsg = 'Rate limit exceeded: Too many edits. Please slow down.';
              ackCallback?.({ status: 'rate_limited', code: 'RATE_LIMIT_EXCEEDED', message: errMsg });
              socket.emit('error', { code: 'RATE_LIMIT_EXCEEDED', message: errMsg });
              return;
            }

            const { messageId, contentOriginal } = validation.data;
            const updatedMessage = await this.messagesService.editMessage(messageId, userId, contentOriginal);

            if (ackCallback) {
              ackCallback({ status: 'edited', message: updatedMessage });
            }

            const conversationId = updatedMessage.conversationId;

            // Fetch members
            const members = await prisma.conversationMember.findMany({
              where: { conversationId, status: 'ACTIVE' },
              include: {
                user: { select: { id: true, nativeLanguage: true, translationEnabled: true } },
              },
            });

            // Broadcast message_edited to user channels
            for (const m of members) {
              this.io.to(`user:${m.userId}`).emit('message_edited', { message: updatedMessage });
            }

            const senderMember = members.find((m) => m.userId === userId);
            const senderLang = (senderMember?.user.nativeLanguage || updatedMessage.originalLanguage || 'en').toLowerCase();
            const requiredTargetLangs = new Set<string>();
            const quotaService = new QuotaService();

            for (const member of members) {
              if (member.userId === userId) continue;
              if (!member.user.translationEnabled) continue;

              const targetLang = (member.preferredLanguage || member.user.nativeLanguage).toLowerCase();
              if (targetLang === senderLang) continue;

              requiredTargetLangs.add(targetLang);
            }

            let editReservation: QuotaReservation | null = null;
            if (requiredTargetLangs.size > 0) {
              try {
                editReservation = await quotaService.reserveQuota(userId);
              } catch (quotaErr: any) {
                if (quotaErr.code === 'QUOTA_EXCEEDED') {
                  this.io.to(`user:${userId}`).emit('quota_exceeded', {
                    code: 'QUOTA_EXCEEDED',
                    message: quotaErr.message,
                    conversationId,
                    messageId: updatedMessage.id,
                  });
                  for (const targetLang of Array.from(requiredTargetLangs)) {
                    await prisma.messageTranslation.upsert({
                      where: {
                        uk_message_target_lang: { messageId: updatedMessage.id, targetLanguage: targetLang },
                      },
                      create: {
                        messageId: updatedMessage.id,
                        targetLanguage: targetLang,
                        status: 'FAILED',
                      },
                      update: {
                        status: 'FAILED',
                      },
                    });
                    for (const m of members) {
                      this.io.to(`user:${m.userId}`).emit('message_translated', {
                        messageId: updatedMessage.id,
                        targetLanguage: targetLang,
                        translatedContent: null,
                        status: 'FAILED',
                      });
                    }
                  }
                  return;
                }
              }
            }

            let anyEditSucceeded = false;
            let completedEditCount = 0;
            const totalEditJobs = requiredTargetLangs.size;
            let isEditReservationReleased = false;

            for (const targetLang of Array.from(requiredTargetLangs)) {
              await prisma.messageTranslation.upsert({
                where: {
                  uk_message_target_lang: { messageId: updatedMessage.id, targetLanguage: targetLang },
                },
                create: {
                  messageId: updatedMessage.id,
                  targetLanguage: targetLang,
                  status: 'PENDING',
                },
                update: {
                  status: 'PENDING',
                  translatedContent: null,
                },
              });

              enqueueTranslationJob({
                messageId: updatedMessage.id,
                conversationId,
                sourceLanguage: senderLang,
                targetLanguage: targetLang,
                textOriginal: contentOriginal,
              })
                .then((translatedText) => {
                  completedEditCount++;
                  if (translatedText) anyEditSucceeded = true;
                  const transPayload = {
                    messageId: updatedMessage.id,
                    targetLanguage: targetLang,
                    translatedContent: translatedText,
                    status: translatedText ? 'COMPLETED' : 'FAILED',
                  };
                  for (const m of members) {
                    this.io.to(`user:${m.userId}`).emit('message_translated', transPayload);
                  }

                  if (completedEditCount === totalEditJobs && !anyEditSucceeded && editReservation && !isEditReservationReleased) {
                    isEditReservationReleased = true;
                    quotaService.releaseQuota(editReservation).catch(() => {});
                  }
                })
                .catch(() => {
                  completedEditCount++;
                  const failPayload = {
                    messageId: updatedMessage.id,
                    targetLanguage: targetLang,
                    translatedContent: null,
                    status: 'FAILED',
                  };
                  for (const m of members) {
                    this.io.to(`user:${m.userId}`).emit('message_translated', failPayload);
                  }

                  if (completedEditCount === totalEditJobs && !anyEditSucceeded && editReservation && !isEditReservationReleased) {
                    isEditReservationReleased = true;
                    quotaService.releaseQuota(editReservation).catch(() => {});
                  }
                });
            }
          } catch (error: any) {
            logger.error({ error }, 'Error in WebSocket edit_message handler');
            socket.emit('error', { message: error.message || 'Failed to edit message' });
          }
        }
      );

      // Real-time Delete Message Listener
      socket.on('delete_message', async (rawPayload: unknown, ackCallback?: (response: any) => void) => {
        try {
          if (!userId) {
            ackCallback?.({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
            return;
          }

          const validation = validateSocketPayload(DeleteMessageSchema, rawPayload);
          if (!validation.success) {
            ackCallback?.({ status: 'error', code: 'INVALID_PAYLOAD', message: validation.error });
            socket.emit('error', { code: 'INVALID_PAYLOAD', message: validation.error });
            return;
          }

          const rateLimit = await checkSocketRateLimit(userId, 'delete_message');
          if (!rateLimit.allowed) {
            const errMsg = 'Rate limit exceeded: Too many delete requests. Please slow down.';
            ackCallback?.({ status: 'rate_limited', code: 'RATE_LIMIT_EXCEEDED', message: errMsg });
            socket.emit('error', { code: 'RATE_LIMIT_EXCEEDED', message: errMsg });
            return;
          }

          const { messageId } = validation.data;
          const result = await this.messagesService.deleteMessage(messageId, userId);
          if (ackCallback) {
            ackCallback({ status: 'deleted', messageId, conversationId: result.conversationId });
          }

          // Fetch members to broadcast message_deleted to every member's user room
          const members = await prisma.conversationMember.findMany({
            where: { conversationId: result.conversationId, status: 'ACTIVE' },
            select: { userId: true },
          });

          for (const m of members) {
            this.io.to(`user:${m.userId}`).emit('message_deleted', {
              messageId,
              conversationId: result.conversationId,
            });
          }
        } catch (error: any) {
          logger.error({ error }, 'Error in WebSocket delete_message handler');
          socket.emit('error', { message: error.message || 'Failed to delete message' });
        }
      });


      // ==========================================
      // WEBRTC 1-ON-1 CALL SIGNALING HANDLERS
      // ==========================================

      socket.on('call:invite', async (rawPayload: unknown) => {
        if (!userId) return;

        const validation = validateSocketPayload(CallInviteSchema, rawPayload);
        if (!validation.success) {
          socket.emit('call:error', { message: validation.error });
          return;
        }

        const rateLimit = await checkSocketRateLimit(userId, 'call_action');
        if (!rateLimit.allowed) {
          socket.emit('call:error', { message: 'Rate limit exceeded for call actions. Please slow down.' });
          return;
        }

        const { conversationId, targetUserId, type } = validation.data;

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

      socket.on('call:accept', async (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(CallAcceptSchema, rawPayload);
        if (!validation.success) return;

        const { callId } = validation.data;
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

      socket.on('call:connected', async (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(CallAcceptSchema, rawPayload);
        if (!validation.success) return;

        const { callId } = validation.data;
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

      socket.on('call:decline', async (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(CallActionSchema, rawPayload || {});
        const callId = validation.success ? validation.data.callId : undefined;

        let session = callId ? callRegistry.getCall(callId) : callRegistry.getCallByUserId(userId);
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
          this.io.to(`user:${session.callerId}`).to(`user:${session.targetId}`).emit('message_sent', { message });
        } catch (e) {}

        callRegistry.removeCall(session.callId);
        callRegistry.forceClearUserCalls(userId);
      });

      socket.on('call:cancel', async (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(CallActionSchema, rawPayload || {});
        const callId = validation.success ? validation.data.callId : undefined;

        let session = callId ? callRegistry.getCall(callId) : callRegistry.getCallByUserId(userId);
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
          this.io.to(`user:${session.callerId}`).to(`user:${session.targetId}`).emit('message_sent', { message });
        } catch (e) {}

        callRegistry.removeCall(session.callId);
        callRegistry.forceClearUserCalls(userId);
      });

      socket.on('call:end', async (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(CallActionSchema, rawPayload || {});
        const callId = validation.success ? validation.data.callId : undefined;

        let session = callId ? callRegistry.getCall(callId) : callRegistry.getCallByUserId(userId);
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
          this.io.to(`user:${session.callerId}`).to(`user:${session.targetId}`).emit('message_sent', { message });
        } catch (e) {}

        callRegistry.removeCall(session.callId);
        callRegistry.forceClearUserCalls(userId);
      });

      socket.on('webrtc:offer', (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(WebRTCOfferSchema, rawPayload);
        if (!validation.success) return;

        const { callId, targetUserId, offer } = validation.data;
        const session = callRegistry.getCall(callId);
        if (!session || (session.callerId !== userId && session.targetId !== userId)) return;
        this.io.to(`user:${targetUserId}`).emit('webrtc:offer', { callId, fromUserId: userId, offer });
      });

      socket.on('webrtc:answer', (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(WebRTCAnswerSchema, rawPayload);
        if (!validation.success) return;

        const { callId, targetUserId, answer } = validation.data;
        const session = callRegistry.getCall(callId);
        if (!session || (session.callerId !== userId && session.targetId !== userId)) return;
        this.io.to(`user:${targetUserId}`).emit('webrtc:answer', { callId, fromUserId: userId, answer });
      });

      socket.on('webrtc:ice-candidate', (rawPayload: unknown) => {
        if (!userId) return;
        const validation = validateSocketPayload(WebRTCIceCandidateSchema, rawPayload);
        if (!validation.success) return;

        const { callId, targetUserId, candidate } = validation.data;
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
