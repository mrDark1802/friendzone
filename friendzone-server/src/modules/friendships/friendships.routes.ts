import { Router } from 'express';
import {
  sendRequestHandler,
  acceptRequestHandler,
  rejectRequestHandler,
  blockUserHandler,
  unblockUserHandler,
  getFriendsHandler,
} from './friendships.controller.js';
import { authenticateJWT, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);
router.use(requireVerifiedEmail);

router.post('/request', sendRequestHandler);
router.post('/accept', acceptRequestHandler);
router.post('/reject', rejectRequestHandler);
router.post('/cancel', rejectRequestHandler);
router.post('/block', blockUserHandler);
router.post('/unblock', unblockUserHandler);
router.get('/', getFriendsHandler);

export default router;
