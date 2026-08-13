import { Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const notificationsService = new NotificationsService();

export async function getNotificationsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await notificationsService.getUserNotifications(req.user!.userId);
    res.status(200).json({ success: true, data: { notifications } });
  } catch (error) {
    next(error);
  }
}

export async function markReadHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { notificationId } = req.body || {};
    await notificationsService.markRead(req.user!.userId, notificationId);
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
}
