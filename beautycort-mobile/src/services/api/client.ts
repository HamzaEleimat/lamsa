import { HTTPClient } from '../core/httpClient';
import { defaultRequestInterceptors, defaultResponseInterceptors } from '../core/interceptors';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Main API client with all interceptors configured
 */
class APIClient extends HTTPClient {
  constructor() {
    super(API_BASE_URL);
    
    // Setup interceptors
    this.setupInterceptors();
    
    // Set up offline queue
    this.setupOfflineQueue();
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
