import { Router } from 'express';
import { getNotificationsHandler, markReadHandler } from './notifications.controller.js';
import { authenticateJWT, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);
router.use(requireVerifiedEmail);

router.get('/', getNotificationsHandler);
router.patch('/read', markReadHandler);

export default router;
