import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  logoutAllDevicesHandler,
} from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.dto.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authLimiter, validateRequest(registerSchema), registerHandler);
router.post('/login', authLimiter, validateRequest(loginSchema), loginHandler);
router.post('/refresh', authLimiter, refreshHandler);
router.post('/logout', logoutHandler);
router.post('/logout-all', authenticateJWT, logoutAllDevicesHandler);

export default router;
