import { Router } from 'express';
import {
  sendRequestHandler,
  acceptRequestHandler,
  blockUserHandler,
  unblockUserHandler,
  getFriendsHandler,
} from './friendships.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);

router.post('/request', sendRequestHandler);
router.post('/accept', acceptRequestHandler);
router.post('/block', blockUserHandler);
router.post('/unblock', unblockUserHandler);
router.get('/', getFriendsHandler);

export default router;
