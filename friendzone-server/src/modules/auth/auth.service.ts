import { prisma } from '../../config/database.js';
import { env } from '../../config/env.config.js';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
  signAccessToken,
} from '../../utils/crypto.utils.js';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from '../../utils/errors.utils.js';
import { RegisterInput, LoginInput } from './auth.dto.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

export class AuthService {
  /**
   * Registers a new user account.
   */
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictError('An active account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const username = input.username ? input.username.toLowerCase().replace(/\s+/g, '_') : input.email.split('@')[0];

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        displayName: input.displayName,
        username,
        nativeLanguage: (input.nativeLanguage || 'en').toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        nativeLanguage: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Authenticates user and issues access token + initial refresh token session.
   */
  async login(input: LoginInput, deviceInfo?: string, ipAddress?: string) {
    const user = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRandomToken(32);
    const refreshTokenHash = hashToken(refreshToken);
    const familyId = crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRATION_DAYS);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        familyId,
        refreshTokenHash,
        deviceInfo: deviceInfo || 'Unknown Device',
        ipAddress: ipAddress || '0.0.0.0',
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        nativeLanguage: user.nativeLanguage,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotates refresh token with REUSE DETECTION & Token Family Revocation.
   */
  async refreshToken(rawRefreshToken: string, deviceInfo?: string, ipAddress?: string) {
    const tokenHash = hashToken(rawRefreshToken);

    const session = await prisma.userSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      if (session) {
        logger.warn(
          { userId: session.userId, familyId: session.familyId },
          '⚠️ REUSE DETECTED: Revoking entire Token Family!'
        );
        await prisma.userSession.updateMany({
          where: { familyId: session.familyId },
          data: { isRevoked: true },
        });
      }
      throw new UnauthorizedError('Invalid or reused refresh token. Please log in again.');
    }

    await prisma.userSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    const newAccessToken = signAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    const newRefreshToken = generateRandomToken(32);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRATION_DAYS);

    await prisma.userSession.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        refreshTokenHash: newRefreshTokenHash,
        deviceInfo: deviceInfo || session.deviceInfo,
        ipAddress: ipAddress || session.ipAddress,
        expiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revokes single device session.
   */
  async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.userSession.updateMany({
      where: { refreshTokenHash: tokenHash },
      data: { isRevoked: true },
    });
  }

  /**
   * Revokes ALL sessions for a user.
   */
  async logoutAllDevices(userId: string) {
    await prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }
}
