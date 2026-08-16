import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import {
  initUploadHandler,
  completeUploadHandler,
  getMediaAccessUrlHandler,
  setProfilePictureHandler,
  removeProfilePictureHandler,
} from './media.controller.js';

const router = Router();

router.use(authenticateJWT);

router.post('/upload/init', initUploadHandler);
router.post('/upload/:mediaId/complete', completeUploadHandler);
router.get('/:mediaId/url', getMediaAccessUrlHandler);
router.post('/profile-picture', setProfilePictureHandler);
router.delete('/profile-picture', removeProfilePictureHandler);

export default router;
