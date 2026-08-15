import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/crypto.utils.js';
import { UnauthorizedError } from '../utils/errors.utils.js';
import { prisma } from '../config/database.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}

/**
 * Hard Security Boundary Middleware: Enforces that the authenticated user
 * has verified their email address against authoritative database state.
 */
export async function requireVerifiedEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await prisma.user.findFirst({
      where: { id: req.user.userId, deletedAt: null },
      select: { isVerified: true },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Please verify your email address to activate your FriendZone account and access the platform.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
