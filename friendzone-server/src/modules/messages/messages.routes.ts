import { Router } from 'express';
import { sendMessageHandler, getMessagesHandler, markReadHandler } from './messages.controller.js';
import { authenticateJWT, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);
router.use(requireVerifiedEmail);

router.post('/send', sendMessageHandler);
router.get('/conversation/:conversationId', getMessagesHandler);
router.post('/read', markReadHandler);

export default router;
