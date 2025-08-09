/**
 * Image Storage Service
 * Handles image uploads using Supabase Storage with pre-signed URLs
 * Replaces the previous base64 database storage approach
 */

import { supabase } from '../config/supabase';
import { AppError } from '../middleware/error.middleware';
import crypto from 'crypto';
import path from 'path';

export interface ImageUploadOptions {
  bucket: 'avatars' | 'services' | 'reviews' | 'certificates';
  userId: string;
  maxSizeInMB?: number;
  allowedFormats?: string[];
}

export interface PresignedUploadUrl {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: Date;
}

export interface ImageMetadata {
  url: string;
  key: string;
  bucket: string;
  size?: number;
  uploadedAt: Date;
}

export class ImageStorageService {
  private readonly DEFAULT_MAX_SIZE_MB = 5;
  private readonly DEFAULT_ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
  private readonly UPLOAD_URL_EXPIRY_SECONDS = 300; // 5 minutes

  /**
   * Generate a pre-signed URL for direct client upload
   */
  async generatePresignedUploadUrl(
    options: ImageUploadOptions,
    fileName: string
  ): Promise<PresignedUploadUrl> {
    try {
      const { bucket, userId, maxSizeInMB, allowedFormats } = options;
      
      // Validate file extension
      const ext = path.extname(fileName).toLowerCase().replace('.', '');
      const formats = allowedFormats || this.DEFAULT_ALLOWED_FORMATS;
      
      if (!formats.includes(ext)) {
        throw new AppError(
          `Invalid file format. Allowed formats: ${formats.join(', ')}`,
          400
        );
      }

      // Generate unique key for the file
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const key = `${userId}/${timestamp}-${randomString}.${ext}`;

      // Create signed upload URL
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(key);

      if (error || !data) {
        throw new AppError('Failed to generate upload URL', 500);
      }

      // Construct the public URL (will be accessible after upload)
      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;

      return {
        uploadUrl: data.signedUrl,
        publicUrl,
        key,
        expiresAt: new Date(Date.now() + this.UPLOAD_URL_EXPIRY_SECONDS * 1000)
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error generating presigned URL:', error);
      throw new AppError('Failed to generate upload URL', 500);
    }
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(bucket: string, key: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([key]);

      if (error) {
        console.error('Error deleting image:', error);
        throw new AppError('Failed to delete image', 500);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error in deleteImage:', error);
      throw new AppError('Failed to delete image', 500);
    }
  }

  /**
   * Validate uploaded image (to be called after client upload)
   */
  async validateUploadedImage(
    bucket: string,
    key: string,
    maxSizeInMB?: number
  ): Promise<ImageMetadata> {
    try {
      // Get file metadata
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.dirname(key), {
          limit: 1,
          offset: 0,
          search: path.basename(key)
        });

      if (error || !data || data.length === 0) {
        throw new AppError('Image not found or upload failed', 404);
      }

      const file = data[0];
      const maxSize = (maxSizeInMB || this.DEFAULT_MAX_SIZE_MB) * 1024 * 1024;

      // Validate file size
      if (file.metadata?.size && file.metadata.size > maxSize) {
        // Delete the oversized file
        await this.deleteImage(bucket, key);
        throw new AppError(
          `Image size exceeds ${maxSizeInMB || this.DEFAULT_MAX_SIZE_MB}MB limit`,
          400
        );
      }

      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;

      return {
        url: publicUrl,
        key,
        bucket,
        size: file.metadata?.size,
        uploadedAt: new Date()
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error validating image:', error);
      throw new AppError('Failed to validate uploaded image', 500);
    }
  }

  /**
   * Batch delete images
   */
  async deleteImages(bucket: string, keys: string[]): Promise<void> {
    try {
      if (keys.length === 0) return;

      const { error } = await supabase.storage
        .from(bucket)
        .remove(keys);

      if (error) {
        console.error('Error batch deleting images:', error);
        throw new AppError('Failed to delete images', 500);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error in deleteImages:', error);
      throw new AppError('Failed to delete images', 500);
    }
  }

  /**
   * Copy image to a new location (useful for backups)
   */
  async copyImage(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<string> {
    try {
      // Download from source
      const { data, error } = await supabase.storage
        .from(sourceBucket)
        .download(sourceKey);

      if (error || !data) {
        throw new AppError('Failed to download source image', 404);
      }

      // Upload to destination
      const { error: uploadError } = await supabase.storage
        .from(destBucket)
        .upload(destKey, data, {
          contentType: data.type,
          upsert: false
        });

      if (uploadError) {
        throw new AppError('Failed to copy image', 500);
      }

      return `${process.env.SUPABASE_URL}/storage/v1/object/public/${destBucket}/${destKey}`;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error copying image:', error);
      throw new AppError('Failed to copy image', 500);
    }
  }

  /**
   * Generate thumbnail URL (if Supabase has image transformation enabled)
   */
  generateThumbnailUrl(
    publicUrl: string,
    width: number = 200,
    height: number = 200
  ): string {
    // Supabase supports image transformations with query parameters
    return `${publicUrl}?width=${width}&height=${height}&resize=cover`;
  }
}

export const imageStorageService = new ImageStorageService();
