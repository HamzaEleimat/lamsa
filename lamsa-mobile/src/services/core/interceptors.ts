import { RequestConfig, RequestInterceptor, ResponseInterceptor, APIResponse, ErrorCategory } from './types';
import { tokenManager } from '../auth/tokenManager';

/**
 * Request interceptor to add authentication token
 */
export const authRequestInterceptor: RequestInterceptor = async (config: RequestConfig): Promise<RequestConfig> => {
  // Skip auth for endpoints that don't require it
  if (!config.requiresAuth) {
    return config;
  }

  try {
    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
  } catch (error) {
    console.warn('Failed to get access token for request:', error);
  }

  return config;
};

/**
 * Request interceptor to add common headers
 */
export const commonHeadersInterceptor: RequestInterceptor = async (config: RequestConfig): Promise<RequestConfig> => {
  const commonHeaders = {
    'X-Client-Version': '1.0.0', // Could be from app config
    'X-Platform': 'mobile',
    'X-Timestamp': Date.now().toString(),
  };

  config.headers = {
    ...commonHeaders,
    ...config.headers,
  };

  return config;
};

/**
 * Request interceptor for request deduplication
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<APIResponse>>();

  generateKey(config: RequestConfig): string {
    const { method, url, data, params } = config;
    return `${method}:${url}:${JSON.stringify(data || {})}:${JSON.stringify(params || {})}`;
  }

  async interceptor(config: RequestConfig): Promise<RequestConfig> {
    // Only deduplicate GET requests (safe, idempotent method)
    if (config.method !== 'GET') {
      return config;
    }

    const key = this.generateKey(config);
    
    // Mark request as deduplicated for tracking
    config.headers = {
      ...config.headers,
      'X-Deduplicated': this.pendingRequests.has(key) ? 'true' : 'false',
    };

    return config;
  }

  setPendingRequest(key: string, promise: Promise<APIResponse>): void {
    this.pendingRequests.set(key, promise);
    
    // Clean up after request completes
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  getPendingRequest(key: string): Promise<APIResponse> | undefined {
    return this.pendingRequests.get(key);
  }
}

export const requestDeduplicator = new RequestDeduplicator();
export const deduplicationInterceptor: RequestInterceptor = requestDeduplicator.interceptor.bind(requestDeduplicator);

/**
 * Response interceptor to handle token refresh on 401
 */
export const authResponseInterceptor: ResponseInterceptor = async (response: APIResponse): Promise<APIResponse> => {
  // Check if this is an authentication error
  if (!response.success && response.error?.category === ErrorCategory.AUTHENTICATION) {
    try {
      // Attempt to refresh token
      const newToken = await tokenManager.forceRefresh();
      
      if (newToken) {
        // Token was refreshed successfully
        // The original request will be retried by the retry logic
        console.log('Token refreshed due to 401 response');
      } else {
        // Token refresh failed, user needs to re-authenticate
        console.log('Token refresh failed, user needs to log in again');
        
        // Could emit an event here for the app to handle logout
        // EventEmitter.emit('auth:logout-required');
      }
    } catch (error) {
      console.error('Error during token refresh:', error);
    }
  }

  return response;
};

/**
 * Response interceptor for caching
 */
class ResponseCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  generateKey(url: string, params?: Record<string, any>): string {
    return `${url}:${JSON.stringify(params || {})}`;
  }

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up expired entries periodically
    this.cleanupExpired();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      expired,
    };
  }
}

export const responseCache = new ResponseCache();

export const cacheResponseInterceptor: ResponseInterceptor = async (response: APIResponse): Promise<APIResponse> => {
  // Only cache successful GET responses
  if (response.success && response.metadata?.cached !== true) {
    // Mark as cached in metadata
    response.metadata = {
      ...response.metadata,
      cached: true,
      timestamp: Date.now(),
    };
  }

  return response;
};

/**
 * Response interceptor for performance monitoring
 */
export const performanceInterceptor: ResponseInterceptor = async (response: APIResponse): Promise<APIResponse> => {
  if (response.metadata?.performance) {
    const { duration, requestTime } = response.metadata.performance;
    
    // Log slow requests (over 3 seconds)
    if (duration > 3000) {
      console.warn(`Slow API request detected: ${duration}ms`);
    }

    // Log to analytics or monitoring service
    // Analytics.track('api_request_performance', {
    //   duration,
    //   requestTime,
    //   success: response.success,
    // });
  }

  return response;
};

/**
 * Response interceptor for error logging
 */
export const errorLoggingInterceptor: ResponseInterceptor = async (response: APIResponse): Promise<APIResponse> => {
  if (!response.success && response.error) {
    // Log error details for debugging
    console.error('API Error:', {
      code: response.error.code,
      message: response.error.message,
      category: response.error.category,
      details: response.error.details,
    });

    // Send to error reporting service in production
    // if (!__DEV__) {
    //   ErrorReporting.captureError(response.error);
    // }
  }

  return response;
};

// Export all interceptors for easy registration
export const defaultRequestInterceptors = [
  commonHeadersInterceptor,
  authRequestInterceptor,
  deduplicationInterceptor,
];

export const defaultResponseInterceptors = [
  authResponseInterceptor,
  cacheResponseInterceptor,
  performanceInterceptor,
  errorLoggingInterceptor,
];
