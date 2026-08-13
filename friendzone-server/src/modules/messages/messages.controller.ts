import { Response, NextFunction } from 'express';
import { MessagesService } from './messages.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const messagesService = new MessagesService();

export async function sendMessageHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId, contentOriginal, originalLanguage, idempotencyKey } = req.body;
    const { message, isDuplicate } = await messagesService.createMessage({
      conversationId,
      senderId: req.user!.userId,
      contentOriginal,
      originalLanguage,
      idempotencyKey,
    });

    res.status(isDuplicate ? 200 : 201).json({
      success: true,
      message: isDuplicate ? 'Duplicate message returned' : 'Message sent successfully',
      data: { message, isDuplicate },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMessagesHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const conversationId = req.params.conversationId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const cursorParam = req.query.cursor ? (req.query.cursor as string) : undefined;

    let cursor: { createdAt: string; id: string } | undefined = undefined;
    if (cursorParam) {
      const [createdAt, id] = cursorParam.split('__');
      if (createdAt && id) {
        cursor = { createdAt, id };
      }
    }

    const result = await messagesService.getConversationMessages(
      conversationId,
      req.user!.userId,
      limit,
      cursor
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function markReadHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId, messageId } = req.body;
    await messagesService.markRead(conversationId, req.user!.userId, messageId);
    res.status(200).json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    next(error);
  }
}
