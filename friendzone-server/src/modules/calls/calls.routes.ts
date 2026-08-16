import { Router } from 'express';
import { CallsController } from './calls.controller.js';
import { authenticateJWT, requireVerifiedEmail } from '../../middleware/auth.middleware.js';
import { apiLimiter } from '../../middleware/rateLimit.js';

const router = Router();
const callsController = new CallsController();

router.post(
  '/ice-servers',
  apiLimiter,
  authenticateJWT,
  requireVerifiedEmail,
  callsController.getIceServers.bind(callsController)
);

router.get(
  '/history',
  apiLimiter,
  authenticateJWT,
  requireVerifiedEmail,
  callsController.getCallHistory.bind(callsController)
);

export default router;
