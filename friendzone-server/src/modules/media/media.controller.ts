import { Response, NextFunction } from 'express';
import { MediaService } from './media.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const mediaService = new MediaService();

export async function initUploadHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { mediaCategory, mediaType, mimeType, originalName, size, conversationId } = req.body;
    const result = await mediaService.initUpload(req.user!.userId, {
      mediaCategory,
      mediaType,
      mimeType,
      originalName,
      size: parseInt(size, 10),
      conversationId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function completeUploadHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { mediaId } = req.params;
    const result = await mediaService.completeUpload(req.user!.userId, mediaId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMediaAccessUrlHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { mediaId } = req.params;
    const result = await mediaService.getMediaAccessUrl(req.user!.userId, mediaId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function setProfilePictureHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { mediaId } = req.body;
    const result = await mediaService.setProfilePicture(req.user!.userId, mediaId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function removeProfilePictureHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await mediaService.removeProfilePicture(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
