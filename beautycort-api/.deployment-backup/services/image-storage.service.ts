/**
 * Image Storage Service - Cloud Migration from Base64
 * Handles migration from database base64 storage to cloud storage (AWS S3/Cloudinary)
 * Provides image optimization, resizing, and CDN delivery
 */

import AWS from 'aws-sdk';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/error.middleware';

interface ImageUploadOptions {
  folder?: string;
  quality?: number;
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg' | 'png';
  generateThumbnail?: boolean;
}

interface ImageUploadResult {
  url: string;
  thumbnailUrl?: string;
  publicId: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

interface ImageMigrationResult {
  migrated: number;
  failed: number;
  totalSize: number;
  errors: string[];
}

export class ImageStorageService {
  private s3: AWS.S3;
  private useCloudinary: boolean;
  private useS3: boolean;

  constructor() {
    // Initialize AWS S3
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      
      this.s3 = new AWS.S3();
      this.useS3 = true;
      console.log('✅ AWS S3 initialized for image storage');
    } else {
      this.useS3 = false;
    }

    // Initialize Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      
      this.useCloudinary = true;
      console.log('✅ Cloudinary initialized for image storage');
    } else {
      this.useCloudinary = false;
    }

    if (!this.useS3 && !this.useCloudinary) {
      console.warn('⚠️ No cloud storage configured. Images will remain in database.');
    }
  }

  /**
   * Upload image to cloud storage with optimization
   */
  async uploadImage(
    imageBuffer: Buffer,
    filename: string,
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    if (!this.useS3 && !this.useCloudinary) {
      throw new AppError('No cloud storage service configured', 500);
    }

    try {
      // Optimize image before upload
      const optimizedImage = await this.optimizeImage(imageBuffer, options);
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}`;
      const folder = options.folder || 'beautycort';
      
      if (this.useCloudinary) {
        return await this.uploadToCloudinary(optimizedImage, uniqueFilename, folder, options);
      } else if (this.useS3) {
        return await this.uploadToS3(optimizedImage, uniqueFilename, folder, options);
      }
      
      throw new AppError('No storage service available', 500);
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new AppError('Failed to upload image', 500);
    }
  }

  /**
   * Upload to Cloudinary with transformations
   */
  private async uploadToCloudinary(
    imageBuffer: Buffer,
    filename: string,
    folder: string,
    options: ImageUploadOptions
  ): Promise<ImageUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        public_id: `${folder}/${filename}`,
        folder: folder,
        resource_type: 'image',
        format: options.format || 'webp',
        quality: options.quality || 80,
        fetch_format: 'auto',
        flags: 'progressive'
      };

      if (options.width || options.height) {
        uploadOptions.transformation = [
          {
            width: options.width,
            height: options.height,
            crop: 'fill',
            gravity: 'center'
          }
        ];
      }

      cloudinary.uploader.upload_stream(
        uploadOptions,
        async (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('Upload failed - no result'));
            return;
          }

          let thumbnailUrl;
          if (options.generateThumbnail) {
            thumbnailUrl = cloudinary.utils.url(result.public_id, {
              width: 150,
              height: 150,
              crop: 'fill',
              gravity: 'center',
              format: 'webp',
              quality: 70
            });
          }

          resolve({
            url: result.secure_url,
            thumbnailUrl,
            publicId: result.public_id,
            size: result.bytes,
            width: result.width,
            height: result.height,
            format: result.format
          });
        }
      ).end(imageBuffer);
    });
  }

  /**
   * Upload to AWS S3 with optimization
   */
  private async uploadToS3(
    imageBuffer: Buffer,
    filename: string,
    folder: string,
    options: ImageUploadOptions
  ): Promise<ImageUploadResult> {
    const bucketName = process.env.AWS_S3_BUCKET || 'beautycort-images';
    const key = `${folder}/${filename}`;
    
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: `image/${options.format || 'webp'}`,
      ACL: 'public-read',
      CacheControl: 'max-age=31536000', // 1 year cache
      Metadata: {
        originalName: filename,
        uploadedAt: new Date().toISOString()
      }
    };

    const result = await this.s3.upload(uploadParams).promise();
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    let thumbnailUrl;
    if (options.generateThumbnail) {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(150, 150, { fit: 'cover' })
        .webp({ quality: 70 })
        .toBuffer();
      
      const thumbnailKey = `${folder}/thumbnails/${filename}`;
      await this.s3.upload({
        ...uploadParams,
        Key: thumbnailKey,
        Body: thumbnailBuffer
      }).promise();
      
      thumbnailUrl = `https://${bucketName}.s3.amazonaws.com/${thumbnailKey}`;
    }

    return {
      url: result.Location,
      thumbnailUrl,
      publicId: key,
      size: imageBuffer.length,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown'
    };
  }

  /**
   * Optimize image using Sharp
   */
  private async optimizeImage(
    imageBuffer: Buffer,
    options: ImageUploadOptions
  ): Promise<Buffer> {
    let sharpInstance = sharp(imageBuffer);

    // Resize if dimensions specified
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: 'cover',
        position: 'center'
      });
    }

    // Apply format and quality settings
    const format = options.format || 'webp';
    const quality = options.quality || 80;

    switch (format) {
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
        break;
    }

    return await sharpInstance.toBuffer();
  }

  /**
   * Migrate existing base64 images to cloud storage
   */
  async migrateBase64Images(): Promise<ImageMigrationResult> {
    console.log('🚀 Starting base64 image migration to cloud storage...');
    
    const result: ImageMigrationResult = {
      migrated: 0,
      failed: 0,
      totalSize: 0,
      errors: []
    };

    try {
      // Migrate provider license images
      await this.migrateProviderImages(result);
      
      // Migrate service images
      await this.migrateServiceImages(result);
      
      // Migrate provider gallery images (if any)
      await this.migrateGalleryImages(result);
      
      console.log(`✅ Migration completed: ${result.migrated} migrated, ${result.failed} failed`);
      console.log(`📦 Total size migrated: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      return result;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      result.errors.push(`Migration failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Migrate provider license images
   */
  private async migrateProviderImages(result: ImageMigrationResult): Promise<void> {
    const { data: providers, error } = await supabase
      .from('providers')
      .select('id, license_image')
      .not('license_image', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch providers: ${error.message}`);
    }

    console.log(`📋 Found ${providers?.length || 0} providers with license images`);

    for (const provider of providers || []) {
      if (!provider.license_image) continue;

      try {
        // Convert base64 to buffer
        const base64Data = provider.license_image.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Upload to cloud storage
        const uploadResult = await this.uploadImage(
          imageBuffer,
          `license-${provider.id}.webp`,
          {
            folder: 'providers/licenses',
            quality: 85,
            format: 'webp',
            generateThumbnail: true
          }
        );

        // Update database with new URL
        const { error: updateError } = await supabase
          .from('providers')
          .update({ 
            license_image_url: uploadResult.url,
            license_thumbnail_url: uploadResult.thumbnailUrl,
            license_image: null // Remove base64 data
          })
          .eq('id', provider.id);

        if (updateError) {
          result.errors.push(`Failed to update provider ${provider.id}: ${updateError.message}`);
          result.failed++;
        } else {
          result.migrated++;
          result.totalSize += uploadResult.size;
          console.log(`✅ Migrated license image for provider ${provider.id}`);
        }
      } catch (error) {
        result.errors.push(`Failed to migrate provider ${provider.id}: ${error.message}`);
        result.failed++;
        console.error(`❌ Failed to migrate provider ${provider.id}:`, error);
      }
    }
  }

  /**
   * Migrate service images
   */
  private async migrateServiceImages(result: ImageMigrationResult): Promise<void> {
    const { data: services, error } = await supabase
      .from('services')
      .select('id, image, provider_id')
      .not('image', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch services: ${error.message}`);
    }

    console.log(`📋 Found ${services?.length || 0} services with images`);

    for (const service of services || []) {
      if (!service.image) continue;

      try {
        const base64Data = service.image.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const uploadResult = await this.uploadImage(
          imageBuffer,
          `service-${service.id}.webp`,
          {
            folder: `providers/${service.provider_id}/services`,
            quality: 85,
            format: 'webp',
            width: 800,
            height: 600,
            generateThumbnail: true
          }
        );

        const { error: updateError } = await supabase
          .from('services')
          .update({ 
            image_url: uploadResult.url,
            thumbnail_url: uploadResult.thumbnailUrl,
            image: null
          })
          .eq('id', service.id);

        if (updateError) {
          result.errors.push(`Failed to update service ${service.id}: ${updateError.message}`);
          result.failed++;
        } else {
          result.migrated++;
          result.totalSize += uploadResult.size;
          console.log(`✅ Migrated image for service ${service.id}`);
        }
      } catch (error) {
        result.errors.push(`Failed to migrate service ${service.id}: ${error.message}`);
        result.failed++;
        console.error(`❌ Failed to migrate service ${service.id}:`, error);
      }
    }
  }

  /**
   * Migrate gallery images (if table exists)
   */
  private async migrateGalleryImages(result: ImageMigrationResult): Promise<void> {
    try {
      const { data: gallery, error } = await supabase
        .from('provider_gallery')
        .select('id, image, provider_id')
        .not('image', 'is', null);

      if (error) {
        console.log('📝 No gallery table found, skipping gallery migration');
        return;
      }

      console.log(`📋 Found ${gallery?.length || 0} gallery images`);

      for (const item of gallery || []) {
        if (!item.image) continue;

        try {
          const base64Data = item.image.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          const uploadResult = await this.uploadImage(
            imageBuffer,
            `gallery-${item.id}.webp`,
            {
              folder: `providers/${item.provider_id}/gallery`,
              quality: 85,
              format: 'webp',
              width: 1200,
              height: 800,
              generateThumbnail: true
            }
          );

          const { error: updateError } = await supabase
            .from('provider_gallery')
            .update({ 
              image_url: uploadResult.url,
              thumbnail_url: uploadResult.thumbnailUrl,
              image: null
            })
            .eq('id', item.id);

          if (updateError) {
            result.errors.push(`Failed to update gallery ${item.id}: ${updateError.message}`);
            result.failed++;
          } else {
            result.migrated++;
            result.totalSize += uploadResult.size;
          }
        } catch (error) {
          result.errors.push(`Failed to migrate gallery ${item.id}: ${error.message}`);
          result.failed++;
        }
      }
    } catch (error) {
      console.log('📝 Gallery migration skipped:', error.message);
    }
  }

  /**
   * Delete image from cloud storage
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      if (this.useCloudinary) {
        await cloudinary.uploader.destroy(publicId);
      } else if (this.useS3) {
        await this.s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET || 'beautycort-images',
          Key: publicId
        }).promise();
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw new AppError('Failed to delete image', 500);
    }
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedImageUrl(
    publicId: string,
    transformations: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    } = {}
  ): string {
    if (this.useCloudinary) {
      return cloudinary.utils.url(publicId, {
        width: transformations.width,
        height: transformations.height,
        quality: transformations.quality || 'auto',
        format: transformations.format || 'auto',
        crop: 'fill',
        gravity: 'center'
      });
    }

    // For S3, return original URL (would need CloudFront + Lambda@Edge for transformations)
    return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${publicId}`;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    provider: string;
    totalImages: number;
    totalSize: string;
    avgImageSize: string;
  }> {
    let stats = {
      provider: 'none',
      totalImages: 0,
      totalSize: '0 MB',
      avgImageSize: '0 KB'
    };

    try {
      if (this.useCloudinary) {
        const result = await cloudinary.api.resources({
          resource_type: 'image',
          max_results: 500
        });

        const totalBytes = result.resources.reduce((sum: number, resource: any) => sum + resource.bytes, 0);
        
        stats = {
          provider: 'Cloudinary',
          totalImages: result.resources.length,
          totalSize: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
          avgImageSize: `${(totalBytes / result.resources.length / 1024).toFixed(2)} KB`
        };
      } else if (this.useS3) {
        const result = await this.s3.listObjectsV2({
          Bucket: process.env.AWS_S3_BUCKET || 'beautycort-images'
        }).promise();

        const totalBytes = result.Contents?.reduce((sum, obj) => sum + (obj.Size || 0), 0) || 0;
        const count = result.Contents?.length || 0;

        stats = {
          provider: 'AWS S3',
          totalImages: count,
          totalSize: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
          avgImageSize: count > 0 ? `${(totalBytes / count / 1024).toFixed(2)} KB` : '0 KB'
        };
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error);
    }

    return stats;
  }
}

// Export singleton instance
export const imageStorageService = new ImageStorageService();