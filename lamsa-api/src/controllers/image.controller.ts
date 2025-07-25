/**
 * Image Controller
 * Handles image upload operations with pre-signed URLs
 */

import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { imageStorageService, ImageUploadOptions } from '../services/image-storage.service';
import { AppError } from '../middleware/error.middleware';

export class ImageController {
  /**
   * Generate pre-signed URL for image upload
   * POST /api/images/upload-url
   */
  async generateUploadUrl(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileName, bucket, maxSizeInMB, sanitizedFileName } = req.body;
      
      if (!fileName || !bucket) {
        throw new AppError('File name and bucket are required', 400);
      }

      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      // Validate bucket type
      const validBuckets = ['avatars', 'services', 'reviews', 'certificates'];
      if (!validBuckets.includes(bucket)) {
        throw new AppError(`Invalid bucket. Must be one of: ${validBuckets.join(', ')}`, 400);
      }

      // Additional validation based on user type and bucket
      if (bucket === 'services' && req.user.type !== 'provider') {
        throw new AppError('Only providers can upload service images', 403);
      }

      const options: ImageUploadOptions = {
        bucket: bucket as any,
        userId: req.user.id,
        maxSizeInMB: maxSizeInMB || 5
      };

      // Use sanitized file name for storage
      const uploadData = await imageStorageService.generatePresignedUploadUrl(
        options, 
        sanitizedFileName || fileName
      );

      const response: ApiResponse = {
        success: true,
        data: uploadData,
        message: 'Upload URL generated successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm image upload and validate
   * POST /api/images/confirm-upload
   */
  async confirmUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bucket, key } = req.body;
      
      if (!bucket || !key) {
        throw new AppError('Bucket and key are required', 400);
      }

      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      // Validate that the key belongs to the user
      if (!key.startsWith(`${req.user.id}/`)) {
        throw new AppError('Invalid image key', 403);
      }

      const metadata = await imageStorageService.validateUploadedImage(bucket, key);

      const response: ApiResponse = {
        success: true,
        data: metadata,
        message: 'Image upload confirmed'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an image
   * DELETE /api/images/:bucket/:key
   */
  async deleteImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bucket, key } = req.params;
      
      if (!bucket || !key) {
        throw new AppError('Bucket and key are required', 400);
      }

      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      // Validate ownership
      if (!key.startsWith(`${req.user.id}/`)) {
        throw new AppError('You can only delete your own images', 403);
      }

      await imageStorageService.deleteImage(bucket, key);

      const response: ApiResponse = {
        success: true,
        message: 'Image deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate thumbnail URL
   * POST /api/images/thumbnail
   */
  async generateThumbnail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageUrl, width, height } = req.body;
      
      if (!imageUrl) {
        throw new AppError('Image URL is required', 400);
      }

      const thumbnailUrl = imageStorageService.generateThumbnailUrl(
        imageUrl,
        width || 200,
        height || 200
      );

      const response: ApiResponse = {
        success: true,
        data: { thumbnailUrl },
        message: 'Thumbnail URL generated'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const imageController = new ImageController();