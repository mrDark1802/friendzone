import { Router } from 'express';
import {
  createDirectHandler,
  createGroupHandler,
  getConversationsHandler,
} from './conversations.controller.js';
import { authenticateJWT, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);
router.use(requireVerifiedEmail);

router.post('/direct', createDirectHandler);
router.post('/group', createGroupHandler);
router.get('/', getConversationsHandler);

export default router;
