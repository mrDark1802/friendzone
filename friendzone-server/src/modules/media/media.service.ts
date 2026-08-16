import crypto from 'crypto';
import path from 'path';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { prisma } from '../../config/database.js';
import { r2Service } from '../../services/storage/r2.service.js';
import {
  MEDIA_LIMITS,
  ALLOWED_MIME_TYPES,
  RETENTION_CONFIG,
  getMediaTypeFromMime,
  isForbiddenExtension,
} from '../../config/media.config.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.utils.js';
import { logger } from '../../config/logger.js';
import { nsfwModerationService } from '../../services/moderation/nsfwModeration.service.js';

export interface InitUploadInput {
  mediaCategory: 'PROFILE' | 'CHAT';
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  mimeType: string;
  originalName: string;
  size: number;
  conversationId?: string;
}

export class MediaService {
  /**
   * Initializes direct presigned upload to Cloudflare R2.
   */
  async initUpload(userId: string, input: InitUploadInput) {
    const { mediaCategory, mediaType, mimeType, originalName, size, conversationId } = input;

    // 1. Extension & MIME Validation
    if (isForbiddenExtension(originalName)) {
      throw new BadRequestError('Forbidden file extension. Executable files are prohibited.');
    }

    const detectedCategoryType = getMediaTypeFromMime(mimeType);
    if (!detectedCategoryType || detectedCategoryType !== mediaType) {
      throw new BadRequestError(`Unsupported or mismatched MIME type: ${mimeType}`);
    }

    // 2. Size Validation
    const maxSize = MEDIA_LIMITS[mediaType];
    if (size > maxSize) {
      throw new BadRequestError(
        `File size exceeds maximum allowed limit of ${Math.round(maxSize / (1024 * 1024))} MB`
      );
    }

    // 3. Authorization Check for CHAT Media
    if (mediaCategory === 'CHAT') {
      if (!conversationId) {
        throw new BadRequestError('conversationId is required for chat media uploads');
      }

      const membership = await prisma.conversationMember.findUnique({
        where: { uk_conv_user: { conversationId, userId } },
      });

      if (!membership || membership.status !== 'ACTIVE') {
        throw new ForbiddenError('You are not an active member of this conversation');
      }
    }

    // 4. Generate Storage Key & Retention Expiration
    const fileUuid = crypto.randomUUID();
    const ext = path.extname(originalName) || `.${mimeType.split('/')[1] || 'bin'}`;
    let storageKey = '';

    if (mediaCategory === 'PROFILE') {
      storageKey = `profiles/originals/${userId}/${fileUuid}${ext}`;
    } else {
      const typeFolder = mediaType.toLowerCase() + 's'; // images, videos, audio, documents
      storageKey = `messages/${typeFolder}/${userId}/${fileUuid}${ext}`;
    }

    const expiresAt =
      mediaCategory === 'CHAT'
        ? new Date(Date.now() + RETENTION_CONFIG.RETENTION_DAYS * 86400 * 1000)
        : null;

    // 5. Create PENDING MediaAsset DB Record
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        ownerId: userId,
        conversationId: mediaCategory === 'CHAT' ? conversationId : null,
        mediaCategory,
        mediaType,
        mimeType,
        originalName: path.basename(originalName),
        storageKey,
        size,
        uploadStatus: 'PENDING',
        moderationStatus: 'PENDING',
        expiresAt,
      },
    });

    // 6. Generate Direct Presigned PUT Upload URL
    const uploadUrl = await r2Service.generateUploadUrl(
      storageKey,
      mimeType,
      RETENTION_CONFIG.SIGNED_URL_EXPIRATION_SECONDS
    );

    return {
      mediaId: mediaAsset.id,
      uploadUrl,
      expiresAt: mediaAsset.expiresAt,
    };
  }

  /**
   * Completes upload after client uploads directly to Cloudflare R2.
   * Performs magic bytes inspection, sharp image metadata & thumbnail processing, and adult content moderation.
   */
  async completeUpload(userId: string, mediaId: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
    });

    if (!asset) {
      throw new NotFoundError('Media asset not found');
    }

    if (asset.ownerId !== userId) {
      throw new ForbiddenError('You do not own this media asset');
    }

    // Idempotent return if already completed
    if (asset.uploadStatus === 'READY') {
      return { mediaAsset: asset, isAlreadyComplete: true };
    }

    // 1. Verify Storage Object Exists in R2 via HeadObject (Memory efficient, zero payload download)
    const head = await r2Service.headObject(asset.storageKey);
    if (!head || head.contentLength === 0) {
      await prisma.mediaAsset.update({
        where: { id: mediaId },
        data: { uploadStatus: 'FAILED' },
      });
      throw new BadRequestError('Upload missing or empty in storage');
    }

    try {
      let thumbnailKey: string | null = null;
      let width: number | null = null;
      let height: number | null = null;
      let isApproved = true;

      // 2. Image Processing, Thumbnails & Moderation (Only for IMAGE assets)
      if (asset.mediaType === 'IMAGE') {
        const bufferSnippet = await r2Service.getObjectBuffer(asset.storageKey);

        // Server-side Magic Byte Inspection
        const fileTypeResult = await fileTypeFromBuffer(bufferSnippet);
        if (fileTypeResult) {
          const allowedTypes = ALLOWED_MIME_TYPES.IMAGE;
          if (!allowedTypes.includes(fileTypeResult.mime)) {
            logger.warn(
              { mediaId, detectedMime: fileTypeResult.mime, declaredMime: asset.mimeType },
              'Magic byte signature mismatch'
            );
            await r2Service.deleteObject(asset.storageKey);
            await prisma.mediaAsset.update({
              where: { id: mediaId },
              data: { uploadStatus: 'FAILED', moderationStatus: 'BLOCKED' },
            });
            throw new BadRequestError('File content magic bytes signature mismatch');
          }
        }

        // Image Metadata & Thumbnail Generation
        const imageMetadata = await sharp(bufferSnippet).metadata();
        width = imageMetadata.width || null;
        height = imageMetadata.height || null;

        const thumbUuid = crypto.randomUUID();
        if (asset.mediaCategory === 'PROFILE') {
          thumbnailKey = `profiles/thumbnails/${userId}/${thumbUuid}.webp`;
          const thumbBuffer = await sharp(bufferSnippet)
            .resize(256, 256, { fit: 'cover' })
            .webp({ quality: 85 })
            .toBuffer();

          await r2Service.putObjectBuffer(thumbnailKey, thumbBuffer, 'image/webp');
        } else {
          thumbnailKey = `messages/thumbnails/${userId}/${thumbUuid}.webp`;
          const thumbBuffer = await sharp(bufferSnippet)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          await r2Service.putObjectBuffer(thumbnailKey, thumbBuffer, 'image/webp');
        }

        // Content Moderation Check (NSFW / Sexual Content / Nudity Detection)
        const modResult = await nsfwModerationService.analyzeImageBuffer(bufferSnippet);
        if (!modResult.isApproved) {
          logger.warn(
            { mediaId, classification: modResult.classification, reason: modResult.reason },
            'Media upload blocked by adult content moderation filter'
          );
          await r2Service.deleteObject(asset.storageKey);
          if (thumbnailKey) {
            await r2Service.deleteObject(thumbnailKey);
          }
          await prisma.mediaAsset.update({
            where: { id: mediaId },
            data: { uploadStatus: 'BLOCKED', moderationStatus: 'BLOCKED' },
          });
          throw new BadRequestError('Media upload blocked: Explicit adult content or nudity detected');
        }
        isApproved = modResult.isApproved;
      }

      const updatedAsset = await prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          uploadStatus: isApproved ? 'READY' : 'BLOCKED',
          moderationStatus: isApproved ? 'APPROVED' : 'BLOCKED',
          thumbnailKey,
          width,
          height,
          size: head.contentLength || asset.size,
        },
      });

      return { success: true, mediaAsset: updatedAsset };
    } catch (err: any) {
      logger.error({ err, mediaId }, 'Error processing uploaded media asset');
      await prisma.mediaAsset.update({
        where: { id: mediaId },
        data: { uploadStatus: 'FAILED' },
      });
      throw err;
    }
  }

  /**
   * Generates short-lived presigned GET URLs for authorized users.
   */
  async getMediaAccessUrl(userId: string, mediaId: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      include: {
        conversation: {
          include: {
            members: { where: { userId, status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundError('Media asset not found or has expired');
    }

    if (asset.uploadStatus !== 'READY' || asset.moderationStatus === 'BLOCKED') {
      throw new ForbiddenError('Media asset is not available or blocked');
    }

    // Authorization Check
    const isOwner = asset.ownerId === userId;
    const isProfileMedia = asset.mediaCategory === 'PROFILE';
    const isConversationMember = asset.conversation && asset.conversation.members.length > 0;

    if (!isOwner && !isProfileMedia && !isConversationMember) {
      throw new ForbiddenError('You are not authorized to view this media asset');
    }

    const downloadUrl = await r2Service.generateDownloadUrl(
      asset.storageKey,
      RETENTION_CONFIG.SIGNED_URL_EXPIRATION_SECONDS
    );

    let thumbnailUrl: string | null = null;
    if (asset.thumbnailKey) {
      thumbnailUrl = await r2Service.generateDownloadUrl(
        asset.thumbnailKey,
        RETENTION_CONFIG.SIGNED_URL_EXPIRATION_SECONDS
      );
    }

    return {
      mediaAsset: asset,
      downloadUrl,
      thumbnailUrl,
    };
  }

  /**
   * Sets active profile picture for user and cleans up previous custom avatar.
   */
  async setProfilePicture(userId: string, mediaId: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
    });

    if (!asset || asset.ownerId !== userId || asset.mediaCategory !== 'PROFILE') {
      throw new BadRequestError('Invalid profile media asset');
    }

    if (asset.uploadStatus !== 'READY') {
      // Complete upload if not yet completed
      await this.completeUpload(userId, mediaId);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profileMedia: true },
    });

    const oldProfileMedia = user?.profileMedia;

    // Update User.profileMediaId
    await prisma.user.update({
      where: { id: userId },
      data: { profileMediaId: mediaId },
    });

    // Delete old custom profile media assets from R2 if replaced
    if (oldProfileMedia && oldProfileMedia.id !== mediaId) {
      await r2Service.deleteObject(oldProfileMedia.storageKey);
      if (oldProfileMedia.thumbnailKey) {
        await r2Service.deleteObject(oldProfileMedia.thumbnailKey);
      }
      await prisma.mediaAsset.update({
        where: { id: oldProfileMedia.id },
        data: { uploadStatus: 'DELETED', deletedAt: new Date() },
      });
    }

    return { success: true, profileMediaId: mediaId };
  }

  /**
   * Removes custom profile picture and resets user to default avatar.
   */
  async removeProfilePicture(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profileMedia: true },
    });

    if (user?.profileMedia) {
      const oldMedia = user.profileMedia;
      await prisma.user.update({
        where: { id: userId },
        data: { profileMediaId: null },
      });

      await r2Service.deleteObject(oldMedia.storageKey);
      if (oldMedia.thumbnailKey) {
        await r2Service.deleteObject(oldMedia.thumbnailKey);
      }
      await prisma.mediaAsset.update({
        where: { id: oldMedia.id },
        data: { uploadStatus: 'DELETED', deletedAt: new Date() },
      });
    }

    return { success: true };
  }
}

export const mediaService = new MediaService();
