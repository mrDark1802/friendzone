import { Router } from 'express';
import { getMeHandler, updateSettingsHandler, changePasswordHandler, searchUsersHandler } from './users.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);

router.get('/me', getMeHandler);
router.patch('/me', updateSettingsHandler);
router.patch('/me/settings', updateSettingsHandler);
router.post('/me/password', changePasswordHandler);
router.get('/search', searchUsersHandler);

export default router;
