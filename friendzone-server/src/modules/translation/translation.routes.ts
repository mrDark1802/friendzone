import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { getWordBreakdownHandler } from './translation.controller.js';

const router = Router();

// Word Breakdown for optional word-level learning expansion
router.post('/word-breakdown', authenticateJWT, getWordBreakdownHandler);

export default router;
