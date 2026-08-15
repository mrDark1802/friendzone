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
  NotFoundError,
} from '../../utils/errors.utils.js';
import {
  RegisterInput,
  OnboardingInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.dto.js';
import { logger } from '../../config/logger.js';
import { emailService } from '../../services/email/resend.js';
import crypto from 'crypto';

export class AuthService {
  /**
   * Checks live username availability.
   */
  async checkUsernameAvailability(username: string) {
    const cleanUsername = username.toLowerCase().trim().replace(/\s+/g, '_');

    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
      return {
        available: false,
        reason: 'INVALID_FORMAT',
        message: 'Username must be between 3 and 30 characters long.',
      };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return {
        available: false,
        reason: 'INVALID_FORMAT',
        message: 'Username can only contain letters, numbers, and underscores.',
      };
    }

    const existingUser = await prisma.user.findFirst({
      where: { username: cleanUsername, deletedAt: null },
    });

    if (existingUser) {
      if (existingUser.isVerified) {
        return {
          available: false,
          reason: 'TAKEN',
          message: 'This username is already taken.',
        };
      } else {
        return {
          available: true,
          reason: 'UNVERIFIED_OVERWRITE_ALLOWED',
          message: 'Username is available.',
        };
      }
    }

    return {
      available: true,
      message: 'Username is available!',
    };
  }

  /**
   * Step 1 Signup: Registers account, hashes password, creates verification token & sends email.
   * If an unverified account with the same email exists, updates the entry with new details & password.
   */
  async register(input: RegisterInput, deviceInfo?: string, ipAddress?: string) {
    const cleanEmail = input.email.toLowerCase().trim();
    const cleanUsername = input.username
      ? input.username.toLowerCase().trim().replace(/\s+/g, '_')
      : cleanEmail.split('@')[0];

    // Check if account with this email exists
    const existingEmailUser = await prisma.user.findFirst({
      where: { email: cleanEmail, deletedAt: null },
    });

    if (existingEmailUser && existingEmailUser.isVerified) {
      throw new ConflictError('An account with this email address already exists and is verified. Please sign in instead.');
    }

    // Check username uniqueness against other active users
    const existingUsernameUser = await prisma.user.findFirst({
      where: {
        username: cleanUsername,
        id: existingEmailUser ? { not: existingEmailUser.id } : undefined,
        deletedAt: null,
      },
    });

    if (existingUsernameUser && existingUsernameUser.isVerified) {
      throw new ConflictError('This username is already taken by another verified account');
    }

    const passwordHash = await hashPassword(input.password);
    const dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
    const rawVerificationToken = generateRandomToken(32);
    const tokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const { user } = await prisma.$transaction(async (tx) => {
      let targetUser;

      if (existingEmailUser && !existingEmailUser.isVerified) {
        // User re-registered with unverified account -> Update entry with new details & password!
        targetUser = await tx.user.update({
          where: { id: existingEmailUser.id },
          data: {
            username: cleanUsername,
            passwordHash,
            displayName: input.displayName.trim(),
            dateOfBirth,
            onboardingCompleted: false,
          },
        });

        // Invalidate old tokens
        await tx.emailVerificationToken.updateMany({
          where: { userId: targetUser.id, usedAt: null },
          data: { usedAt: new Date() },
        });
      } else {
        // Create new User record
        targetUser = await tx.user.create({
          data: {
            email: cleanEmail,
            username: cleanUsername,
            passwordHash,
            displayName: input.displayName.trim(),
            dateOfBirth,
            isVerified: false,
            onboardingCompleted: false,
          },
        });
      }

      // Create new EmailVerificationToken
      await tx.emailVerificationToken.create({
        data: {
          userId: targetUser.id,
          tokenHash,
          expiresAt,
        },
      });

      return { user: targetUser };
    });

    // Fire Resend Verification Email (non-blocking for UI speed)
    emailService
      .sendVerificationEmail({
        to: user.email,
        displayName: user.displayName,
        rawToken: rawVerificationToken,
        expiresInMinutes: 1440,
      })
      .catch((err) => {
        logger.error({ err, userId: user.id }, 'Failed to send registration verification email');
      });

    // Revoke any existing active sessions if re-registering
    await prisma.userSession.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    // Create initial session & tokens so user can proceed directly to Step 2 Onboarding
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRandomToken(32);
    const refreshTokenHash = hashToken(refreshToken);
    const familyId = crypto.randomUUID();
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + env.JWT_REFRESH_EXPIRATION_DAYS);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        familyId,
        refreshTokenHash,
        deviceInfo: deviceInfo || 'Unknown Device',
        ipAddress: ipAddress || '0.0.0.0',
        expiresAt: sessionExpiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        nativeLanguage: user.nativeLanguage,
        isVerified: user.isVerified,
        onboardingCompleted: user.onboardingCompleted,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Step 2 Onboarding: Personalizes user profile (languages, country, usage purposes).
   */
  async completeOnboarding(userId: string, input: OnboardingInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User account not found');
    }

    const nativeLanguage = input.nativeLanguage.toLowerCase().trim();
    const countryCode = input.countryCode ? input.countryCode.toUpperCase().trim() : null;

    // Deduplicate fluent & learning language codes
    const uniqueFluentLangs = Array.from(
      new Set(
        (input.fluentLanguages || [])
          .map((l) => l.toLowerCase().trim())
          .filter((l) => l !== nativeLanguage)
      )
    );

    const uniqueLearningLangs = Array.from(
      new Set(
        (input.learningLanguages || []).map((l) => l.toLowerCase().trim())
      )
    );

    const updatedUser = await prisma.$transaction(async (tx) => {
      // Clear existing language relations if re-completing
      await tx.userFluentLanguage.deleteMany({ where: { userId } });
      await tx.userLearningLanguage.deleteMany({ where: { userId } });

      // Create relational language entries
      if (uniqueFluentLangs.length > 0) {
        await tx.userFluentLanguage.createMany({
          data: uniqueFluentLangs.map((code) => ({ userId, languageCode: code })),
        });
      }

      if (uniqueLearningLangs.length > 0) {
        await tx.userLearningLanguage.createMany({
          data: uniqueLearningLangs.map((code) => ({ userId, languageCode: code })),
        });
      }

      return await tx.user.update({
        where: { id: userId },
        data: {
          nativeLanguage,
          countryCode,
          usagePurposes: input.usagePurposes || [],
          onboardingCompleted: true,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          nativeLanguage: true,
          countryCode: true,
          isVerified: true,
          onboardingCompleted: true,
          usagePurposes: true,
          fluentLanguages: { select: { languageCode: true } },
          learningLanguages: { select: { languageCode: true } },
        },
      });
    });

    return updatedUser;
  }

  /**
   * Verifies email token & marks account verified.
   */
  async verifyEmail(rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      return { status: 'INVALID', message: 'This verification link is invalid.' };
    }

    if (record.usedAt) {
      if (record.user.isVerified) {
        return { status: 'ALREADY_VERIFIED', message: 'Your email address is already verified.' };
      }
      return { status: 'INVALID', message: 'This verification link has already been used.' };
    }

    if (record.expiresAt < new Date()) {
      return { status: 'EXPIRED', message: 'This verification link has expired.', email: record.user.email };
    }

    // Process verification inside transaction
    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: {
          isVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    return { status: 'SUCCESS', message: 'Email verified successfully! 🎉', email: record.user.email };
  }

  /**
   * Resends email verification link to user.
   */
  async resendVerification(emailOrUserId: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUserId.toLowerCase().trim() },
          { id: emailOrUserId },
        ],
        deletedAt: null,
      },
    });

    if (!user) {
      // Return success to avoid leaking email registration status
      return { success: true, message: 'If an account exists, a new verification link has been sent.' };
    }

    if (user.isVerified) {
      return { success: true, alreadyVerified: true, message: 'Your email address is already verified.' };
    }

    // Invalidate existing unused verification tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await emailService.sendVerificationEmail({
      to: user.email,
      displayName: user.displayName,
      rawToken,
      expiresInMinutes: 30,
    });

    return { success: true, message: 'A new verification link has been sent to your email address.' };
  }

  /**
   * Initiates forgot password workflow.
   */
  async forgotPassword(input: ForgotPasswordInput) {
    const cleanEmail = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email: cleanEmail, deletedAt: null },
    });

    // Generic response prevents account enumeration
    const genericResponse = {
      success: true,
      message: 'If an account exists for this email, password reset instructions have been sent.',
    };

    if (!user) {
      return genericResponse;
    }

    // Invalidate old unused reset tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await emailService.sendPasswordResetEmail({
      to: user.email,
      displayName: user.displayName,
      rawToken,
      expiresInMinutes: 60,
    });

    return genericResponse;
  }

  /**
   * Resets password using valid reset token & revokes active sessions.
   */
  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashToken(input.token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestError('Invalid or expired password reset link');
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.userSession.updateMany({
        where: { userId: record.userId },
        data: { isRevoked: true },
      }),
    ]);

    // Fire Security Alert Email
    emailService
      .sendSecurityAlertEmail({
        to: record.user.email,
        displayName: record.user.displayName,
        action: 'Account password was successfully reset.',
      })
      .catch(() => {});

    return { success: true, message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  /**
   * Authenticates user and issues access token + initial refresh token session.
   */
  async login(input: LoginInput, deviceInfo?: string, ipAddress?: string) {
    const user = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase().trim(),
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

    if (!user.isVerified) {
      return {
        isVerified: false,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Your FriendZone account has been created, but it is not active yet. Please verify your email to continue.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          isVerified: false,
          onboardingCompleted: user.onboardingCompleted,
        },
      };
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
        isVerified: user.isVerified,
        onboardingCompleted: user.onboardingCompleted,
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
