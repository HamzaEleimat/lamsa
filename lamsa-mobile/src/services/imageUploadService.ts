import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface UploadResult {
  url: string;
  path: string;
}

export class ImageUploadService {
  private readonly PROFILE_BUCKET = 'profile-images';
  private readonly SERVICE_BUCKET = 'service-images';
  private readonly MAX_SIZE = 1024; // Maximum dimension in pixels
  private readonly QUALITY = 0.8; // Image compression quality

  /**
   * Request camera/gallery permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return cameraStatus === 'granted' && libraryStatus === 'granted';
    }
    return true;
  }

  /**
   * Pick image from gallery
   */
  async pickImageFromGallery(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  /**
   * Take photo with camera
   */
  async takePhoto(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  }

  /**
   * Compress and resize image
   */
  private async processImage(uri: string): Promise<string> {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: this.MAX_SIZE } }],
        { compress: this.QUALITY, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Error processing image:', error);
      return uri;
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(
    userId: string,
    imageUri: string,
    userType: 'customer' | 'provider' = 'customer'
  ): Promise<UploadResult> {
    try {
      // Process image
      const processedUri = await this.processImage(imageUri);
      
      // Convert to blob
      const response = await fetch(processedUri);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileExt = 'jpg';
      const fileName = `${userType}_${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${userType}s/${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.PROFILE_BUCKET)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.PROFILE_BUCKET)
        .getPublicUrl(data.path);

      // Update user profile with new image URL
      const table = userType === 'provider' ? 'providers' : 'users';
      await supabase
        .from(table)
        .update({ 
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }

  /**
   * Upload service image
   */
  async uploadServiceImage(
    serviceId: string,
    providerId: string,
    imageUri: string,
    isMainImage: boolean = false
  ): Promise<UploadResult> {
    try {
      // Process image
      const processedUri = await this.processImage(imageUri);
      
      // Convert to blob
      const response = await fetch(processedUri);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileExt = 'jpg';
      const fileName = `service_${serviceId}_${Date.now()}.${fileExt}`;
      const filePath = `providers/${providerId}/services/${serviceId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.SERVICE_BUCKET)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.SERVICE_BUCKET)
        .getPublicUrl(data.path);

      // Create service image record
      const { error: dbError } = await supabase
        .from('service_images')
        .insert({
          service_id: serviceId,
          image_url: publicUrl,
          is_main: isMainImage,
          display_order: isMainImage ? 0 : 999,
          created_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // If main image, update service record
      if (isMainImage) {
        await supabase
          .from('services')
          .update({ 
            main_image_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', serviceId);
      }

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Error uploading service image:', error);
      throw error;
    }
  }

  /**
   * Upload multiple service images
   */
  async uploadMultipleServiceImages(
    serviceId: string,
    providerId: string,
    imageUris: string[]
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (let i = 0; i < imageUris.length; i++) {
      try {
        const result = await this.uploadServiceImage(
          serviceId,
          providerId,
          imageUris[i],
          i === 0 // First image is main
        );
        results.push(result);
      } catch (error) {
        console.error(`Error uploading image ${i + 1}:`, error);
      }
    }

    return results;
  }

  /**
   * Delete image from storage
   */
  async deleteImage(
    bucket: 'profile' | 'service',
    path: string
  ): Promise<boolean> {
    try {
      const bucketName = bucket === 'profile' ? this.PROFILE_BUCKET : this.SERVICE_BUCKET;
      
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Get service images
   */
  async getServiceImages(serviceId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('service_images')
        .select('image_url')
        .eq('service_id', serviceId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data?.map(img => img.image_url) || [];
    } catch (error) {
      console.error('Error fetching service images:', error);
      return [];
    }
  }

  /**
   * Convert base64 to blob for web compatibility
   */
  private async base64ToBlob(base64: string, contentType: string): Promise<Blob> {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /**
   * Upload base64 image (for web support)
   */
  async uploadBase64Image(
    base64: string,
    type: 'profile' | 'service',
    id: string,
    additionalId?: string
  ): Promise<UploadResult> {
    try {
      const blob = await this.base64ToBlob(base64, 'image/jpeg');
      
      // Generate filename based on type
      const fileName = type === 'profile' 
        ? `profile_${id}_${Date.now()}.jpg`
        : `service_${id}_${Date.now()}.jpg`;
      
      const filePath = type === 'profile'
        ? `${additionalId || 'customers'}/${id}/${fileName}`
        : `providers/${additionalId}/services/${id}/${fileName}`;

      const bucket = type === 'profile' ? this.PROFILE_BUCKET : this.SERVICE_BUCKET;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: type === 'profile',
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Error uploading base64 image:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const imageUploadService = new ImageUploadService();