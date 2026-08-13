import { Response, NextFunction } from 'express';
import { ConversationsService } from './conversations.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const conversationsService = new ConversationsService();

export async function createDirectHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { targetUserId } = req.body;
    const conversation = await conversationsService.createDirectConversation(req.user!.userId, targetUserId);
    res.status(201).json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
}

export async function createGroupHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { title, memberIds } = req.body;
    const conversation = await conversationsService.createGroupConversation(req.user!.userId, title, memberIds);
    res.status(201).json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
}

export async function getConversationsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const conversations = await conversationsService.getUserConversations(req.user!.userId);
    res.status(200).json({ success: true, data: { conversations } });
  } catch (error) {
    next(error);
  }
}
