import { PinnedHTTPClient } from '../core/pinnedHttpClient';
import { defaultRequestInterceptors, defaultResponseInterceptors } from '../core/interceptors';
import { getApiBaseUrl } from '../../config/api-config';

// Default API URL for initial setup (will be replaced by secure config)
const DEFAULT_API_URL = 'https://api.lamsa.com';

/**
 * Main API client with certificate pinning and all interceptors configured
 */
class APIClient extends PinnedHTTPClient {
  private configInitialized = false;

  constructor() {
    // Use default URL initially, will be updated when config loads
    super(DEFAULT_API_URL);
    
    // Setup interceptors
    this.setupInterceptors();
    
    // Set up offline queue
    this.setupOfflineQueue();
    
    // Initialize with proper config
    this.initializeConfig();
  }

  private async initializeConfig(): Promise<void> {
    try {
      const apiUrl = await getApiBaseUrl();
      if (apiUrl && apiUrl !== DEFAULT_API_URL) {
        this.baseURL = apiUrl;
      }
      this.configInitialized = true;
    } catch (error) {
      console.error('Failed to load API configuration:', error);
    }
  }

  private setupInterceptors(): void {
    // Add default request interceptors
    defaultRequestInterceptors.forEach(interceptor => {
      this.addRequestInterceptor(interceptor);
    });

    // Add default response interceptors
    defaultResponseInterceptors.forEach(interceptor => {
      this.addResponseInterceptor(interceptor);
    });
  }

  private setupOfflineQueue(): void {
    // Inject HTTP client reference into offline queue
    (this as any).offlineQueue.setHttpClient(this);
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export types for convenience
export type { APIResponse, APIError } from '../core/types';
