import { Router } from 'express';
import { submitReportHandler, getReportsHandler } from './moderation.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);

router.post('/report', submitReportHandler);
router.get('/reports', getReportsHandler);

export default router;
