import { Response, NextFunction } from 'express';
import { ModerationService } from './moderation.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const moderationService = new ModerationService();

export async function submitReportHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { reportedUserId, messageId, reason } = req.body;
    const report = await moderationService.submitReport(req.user!.userId, reportedUserId, messageId, reason);
    res.status(201).json({ success: true, message: 'Report submitted successfully', data: { report } });
  } catch (error) {
    next(error);
  }
}

export async function getReportsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as 'PENDING' | 'RESOLVED' | 'DISMISSED' | undefined;
    const reports = await moderationService.getReports(status);
    res.status(200).json({ success: true, data: { reports } });
  } catch (error) {
    next(error);
  }
}
