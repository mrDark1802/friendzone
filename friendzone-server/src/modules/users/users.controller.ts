import { Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const usersService = new UsersService();

export async function getMeHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getProfile(req.user!.userId);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function updateSettingsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateSettings(req.user!.userId, req.body);
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function changePasswordHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    await usersService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
}

import { QuotaService } from './quota.service.js';

const quotaService = new QuotaService();

export async function searchUsersHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string) || '';
    const users = await usersService.searchUsers(q, req.user!.userId);
    res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
}

export async function getQuotaHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const quota = await quotaService.getUserQuota(req.user!.userId);
    res.status(200).json({ success: true, data: { quota } });
  } catch (error) {
    next(error);
  }
}

export async function upgradePlanHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { plan } = req.body;
    const updated = await quotaService.upgradePlan(req.user!.userId, plan || 'FREE');
    const quota = await quotaService.getUserQuota(req.user!.userId);
    res.status(200).json({ success: true, message: `Plan upgraded to ${updated.plan} successfully!`, data: { user: updated, quota } });
  } catch (error) {
    next(error);
  }
}
