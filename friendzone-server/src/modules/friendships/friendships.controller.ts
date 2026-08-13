import { Response, NextFunction } from 'express';
import { FriendshipsService } from './friendships.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

import { socketServer } from '../../infrastructure/websocket/socket.server.js';

import { prisma } from '../../config/database.js';

const friendshipsService = new FriendshipsService();

export async function sendRequestHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { targetUserId } = req.body;
    const request = await friendshipsService.sendFriendRequest(req.user!.userId, targetUserId);
    
    if (socketServer) {
      const sender = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, displayName: true, username: true, email: true },
      });

      socketServer.emitFriendRequestReceived(targetUserId, {
        request,
        sender: sender || { id: req.user!.userId, displayName: 'Someone', username: 'user' },
      });
    }

    res.status(201).json({ success: true, message: 'Friend request sent', data: { request } });
  } catch (error) {
    next(error);
  }
}

export async function acceptRequestHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { requesterUserId } = req.body;
    const friendship = await friendshipsService.acceptFriendRequest(req.user!.userId, requesterUserId);
    res.status(200).json({ success: true, message: 'Friend request accepted', data: { friendship } });
  } catch (error) {
    next(error);
  }
}

export async function blockUserHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { targetUserId } = req.body;
    const block = await friendshipsService.blockUser(req.user!.userId, targetUserId);
    res.status(200).json({ success: true, message: 'User blocked successfully', data: { block } });
  } catch (error) {
    next(error);
  }
}

export async function unblockUserHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { targetUserId } = req.body;
    await friendshipsService.unblockUser(req.user!.userId, targetUserId);
    res.status(200).json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getFriendsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const friends = await friendshipsService.getFriendsList(req.user!.userId);
    res.status(200).json({ success: true, data: { friends } });
  } catch (error) {
    next(error);
  }
}
