import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { 
  APIResponse, 
  APIError, 
  RequestConfig, 
  ErrorCategory, 
  NetworkState,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorHandler
} from './types';
import { ErrorHandler as ErrorHandlerClass } from './errorHandler';
import { OfflineQueue } from './offlineQueue';

/**
 * Core HTTP client with interceptors, offline support, and error handling
 */
export class HTTPClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorHandler: ErrorHandlerClass;
  private offlineQueue: OfflineQueue;
  private networkState: NetworkState = { isConnected: true };

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    this.errorHandler = new ErrorHandlerClass();
    this.offlineQueue = new OfflineQueue();
    
    this.initializeNetworkListener();
  }

  /**
   * Initialize network state listener
   */
  private initializeNetworkListener(): void {
    NetInfo.addEventListener((state: any) => {
      const wasOffline = !this.networkState.isConnected;
      this.networkState = {
        isConnected: state.isConnected ?? false,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable ?? false,
      };

      // Process offline queue when connection is restored
      if (wasOffline && this.networkState.isConnected) {
        this.offlineQueue.processQueue();
      }
    });
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Execute HTTP request
   */
  async request<T = any>(config: RequestConfig): Promise<APIResponse<T>> {
    const startTime = Date.now();

    try {
      // Check network connectivity
      if (!this.networkState.isConnected && !config.skipQueue) {
        // Queue request for later if offline
        return this.offlineQueue.enqueue<T>(config);
      }

      // Apply request interceptors
      let processedConfig = { ...config };
      for (const interceptor of this.requestInterceptors) {
        processedConfig = await interceptor(processedConfig);
      }

      // Build request
      const url = this.buildURL(processedConfig.url, processedConfig.params);
      const headers = { ...this.defaultHeaders, ...processedConfig.headers };
      
      // Execute request with timeout
      const response = await this.executeRequest(url, {
        method: processedConfig.method,
        headers,
        body: processedConfig.data ? JSON.stringify(processedConfig.data) : undefined,
        signal: this.createAbortSignal(processedConfig.timeout || 30000),
      });

      // Parse response
      let responseData: any = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Create API response
      let apiResponse: APIResponse<T>;
      
      if (response.ok) {
        apiResponse = {
          success: true,
          data: responseData,
          error: null,
          metadata: {
            performance: {
              requestTime: startTime,
              responseTime: Date.now(),
              duration: Date.now() - startTime,
            },
          },
        };
      } else {
        const error = this.errorHandler.handleError(
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          processedConfig,
          responseData
        );
        
        apiResponse = {
          success: false,
          data: null,
          error,
          metadata: {
            performance: {
              requestTime: startTime,
              responseTime: Date.now(),
              duration: Date.now() - startTime,
            },
          },
        };
      }

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        apiResponse = await interceptor(apiResponse);
      }

      return apiResponse;

    } catch (error) {
      const apiError = this.errorHandler.handleError(error, config);
      
      return {
        success: false,
        data: null,
        error: apiError,
        metadata: {
          performance: {
            requestTime: startTime,
            responseTime: Date.now(),
            duration: Date.now() - startTime,
          },
        },
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, params?: Record<string, any>, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: 'GET',
      params,
      ...config,
    });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      data,
      ...config,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: 'PUT',
      data,
      ...config,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: 'DELETE',
      ...config,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.request<T>({
      url,
      method: 'PATCH',
      data,
      ...config,
    });
  }

  /**
   * Build complete URL with query parameters
   */
  private buildURL(url: string, params?: Record<string, any>): string {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    if (!params || Object.keys(params).length === 0) {
      return fullURL;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${fullURL}?${queryString}` : fullURL;
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, init);
  }

  /**
   * Create abort signal for request timeout
   */
  private createAbortSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return this.networkState;
  }

  /**
   * Check if client is online
   */
  isOnline(): boolean {
    return this.networkState.isConnected;
  }

  /**
   * Force process offline queue
   */
  processOfflineQueue(): Promise<void> {
    return this.offlineQueue.processQueue();
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue(): Promise<void> {
    return this.offlineQueue.clear();
  }

  /**
   * Get offline queue size
   */
  getOfflineQueueSize(): Promise<number> {
    return this.offlineQueue.getSize();
  }
}

// Export singleton instance
export const httpClient = new HTTPClient();
