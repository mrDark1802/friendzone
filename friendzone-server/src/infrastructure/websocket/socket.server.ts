import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, JwtPayload } from '../../utils/crypto.utils.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { MessagesService } from '../../modules/messages/messages.service.js';
import { enqueueTranslationJob } from '../queue/translation.queue.js';
import { env } from '../../config/env.config.js';

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
    });

    this.setupHandshakeAuth();
    this.setupEventHandlers();
  }

  private setupHandshakeAuth() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
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

          if (!membership) {
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

      socket.on('disconnect', async () => {
        logger.info({ userId, socketId: socket.id }, '🔌 User disconnected');
        if (userId) {
          const currentSockets = this.onlineUsers.get(userId) || 1;
          const remainingSockets = currentSockets - 1;

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
}

export let socketServer: SocketServer | undefined;

export function initializeSocketServer(httpServer: HTTPServer): SocketServer {
  socketServer = new SocketServer(httpServer);
  return socketServer;
}
