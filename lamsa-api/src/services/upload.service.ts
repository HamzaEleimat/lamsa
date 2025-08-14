import { supabase } from '../config/supabase';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';
import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';  // TODO: Install @types/uuid
const uuidv4 = () => Math.random().toString(36).substring(2) + Date.now().toString(36); // Temporary UUID replacement

/**
 * Upload an image to Supabase Storage
 * @param buffer - Image buffer
 * @param bucket - Storage bucket name
 * @param folder - Optional folder within bucket
 * @returns Public URL of uploaded image
 */
export async function uploadImage(
  buffer: Buffer,
  bucket: string,
  folder?: string
): Promise<string> {
  try {
    // Process image with sharp for optimization
    const processedImage = await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Generate unique filename
    const filename = `${folder ? folder + '/' : ''}${uuidv4()}.jpg`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, processedImage, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw new BilingualAppError('Failed to upload image', 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Image processing error:', error);
    throw new BilingualAppError('Failed to process image', 500);
  }
}

/**
 * Upload multiple images
 * @param buffers - Array of image buffers
 * @param bucket - Storage bucket name
 * @param folder - Optional folder within bucket
 * @returns Array of public URLs
 */
export async function uploadMultipleImages(
  buffers: Buffer[],
  bucket: string,
  folder?: string
): Promise<string[]> {
  const uploadPromises = buffers.map(buffer => 
    uploadImage(buffer, bucket, folder)
  );
  
  return Promise.all(uploadPromises);
}

/**
 * Delete an image from Supabase Storage
 * @param url - Public URL of the image
 * @param bucket - Storage bucket name
 */
export async function deleteImage(
  url: string,
  bucket: string
): Promise<void> {
  try {
    // Extract path from URL
    const urlParts = url.split('/');
    const path = urlParts.slice(-2).join('/'); // Get folder/filename

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      // Don't throw error for deletion failures
      // Image might already be deleted or URL might be invalid
    }
  } catch (error) {
    console.error('Image deletion error:', error);
    // Don't throw error for deletion failures
  }
}

/**
 * Validate image file
 * @param file - Multer file object
 * @param maxSizeMB - Maximum file size in MB
 */
export function validateImageFile(
  file: Express.Multer.File,
  maxSizeMB: number = 5
): void {
  // Check file type
  if (!file.mimetype.startsWith('image/')) {
    throw new BilingualAppError('File must be an image', 400);
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new BilingualAppError(`Image size must be less than ${maxSizeMB}MB`, 400);
  }

  // Check specific image types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new BilingualAppError('Image must be JPEG, PNG, or WebP format', 400);
  }
}

/**
 * Generate thumbnail from image
 * @param buffer - Original image buffer
 * @param size - Thumbnail size (square)
 * @returns Thumbnail buffer
 */
export async function generateThumbnail(
  buffer: Buffer,
  size: number = 200
): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Convert image to base64
 * @param buffer - Image buffer
 * @returns Base64 encoded string with data URI prefix
 */
export function imageToBase64(buffer: Buffer): string {
  const base64 = buffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Process and optimize avatar image
 * @param buffer - Original image buffer
 * @returns Optimized avatar buffer
 */
export async function processAvatar(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 90, progressive: true })
    .toBuffer();
}

/**
 * Process and optimize cover image
 * @param buffer - Original image buffer
 * @returns Optimized cover image buffer
 */
export async function processCoverImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1200, 400, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}