import { Router } from 'express';
import {
  registerHandler,
  checkUsernameHandler,
  onboardingHandler,
  loginHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  refreshHandler,
  logoutHandler,
  logoutAllDevicesHandler,
} from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  registerSchema,
  onboardingSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.dto.js';
import { authLimiter, createRateLimiter } from '../../middleware/rateLimit.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

const verificationResendLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
  keyPrefix: 'resend_ver',
  isSecurityCritical: true,
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'pwd_reset',
  isSecurityCritical: true,
});

router.get('/check-username', checkUsernameHandler);
router.post('/register', authLimiter, validateRequest(registerSchema), registerHandler);
router.post('/onboarding', authenticateJWT, validateRequest(onboardingSchema), onboardingHandler);
router.post('/login', authLimiter, validateRequest(loginSchema), loginHandler);

router.get('/verify-email', validateRequest(verifyEmailSchema, 'query'), verifyEmailHandler);
router.post('/verify-email', validateRequest(verifyEmailSchema), verifyEmailHandler);
router.post('/resend-verification', verificationResendLimiter, validateRequest(resendVerificationSchema), resendVerificationHandler);

router.post('/forgot-password', passwordResetLimiter, validateRequest(forgotPasswordSchema), forgotPasswordHandler);
router.post('/reset-password', passwordResetLimiter, validateRequest(resetPasswordSchema), resetPasswordHandler);

router.post('/refresh', authLimiter, refreshHandler);
router.post('/logout', logoutHandler);
router.post('/logout-all', authenticateJWT, logoutAllDevicesHandler);

export default router;
