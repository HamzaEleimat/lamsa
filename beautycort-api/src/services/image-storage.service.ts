// Image storage service temporarily disabled for deployment
export class ImageStorageService {
  async uploadImage(): Promise<any> {
    throw new Error('Image upload feature coming soon');
  }
}
export const imageStorageService = new ImageStorageService();
