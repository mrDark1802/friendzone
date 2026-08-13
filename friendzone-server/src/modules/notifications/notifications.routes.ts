import { Router } from 'express';
import { getNotificationsHandler, markReadHandler } from './notifications.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getNotificationsHandler);
router.patch('/read', markReadHandler);

export default router;
