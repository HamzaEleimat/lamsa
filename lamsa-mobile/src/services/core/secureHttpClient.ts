/**
 * @file secureHttpClient.ts
 * @description Secure HTTP client with certificate pinning
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { initializePinning, fetch as sslFetch } from 'react-native-ssl-pinning';
import { Platform } from 'react-native';
import { tokenManager } from '../auth/tokenManager';
import { APIResponse, APIError } from './types';

// Certificate hashes for lamsa.com (these should be your actual certificate hashes)
const CERTIFICATE_HASHES = {
  production: [
    // Primary certificate hash
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    // Backup certificate hash
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  ],
  staging: [
    'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
  ],
};

// Domains to pin certificates for
const PINNED_DOMAINS = [
  'api.lamsa.com',
  'lamsa.com',
  '*.lamsa.com',
];

export class SecureHTTPClient {
  private baseURL: string;
  private headers: Record<string, string>;
  private timeout: number;
  private certificatePinningEnabled: boolean;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.timeout = 30000; // 30 seconds
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Platform': Platform.OS,
      'X-Client-Version': '1.0.0',
    };

    // Only enable certificate pinning on native platforms in production
    this.certificatePinningEnabled = 
      Platform.OS !== 'web' && 
      process.env.NODE_ENV === 'production';

    if (this.certificatePinningEnabled) {
      this.initializeCertificatePinning();
    }
  }

  /**
   * Initialize certificate pinning
   */
  private async initializeCertificatePinning(): Promise<void> {
    try {
      const environment = process.env.NODE_ENV === 'production' ? 'production' : 'staging';
      const hashes = CERTIFICATE_HASHES[environment];

      await initializePinning({
        domains: PINNED_DOMAINS.reduce((acc, domain) => {
          acc[domain] = {
            includeSubdomains: domain.startsWith('*.'),
            publicKeyHashes: hashes,
          };
          return acc;
        }, {} as any),
      });

      console.log('Certificate pinning initialized successfully');
    } catch (error) {
      console.error('Failed to initialize certificate pinning:', error);
      // In production, you might want to prevent the app from continuing
      // For now, we'll continue without pinning
      this.certificatePinningEnabled = false;
    }
  }

  /**
   * Make a secure HTTP request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      // Get auth token
      const token = await tokenManager.getAccessToken();
      
      // Prepare headers
      const headers = {
        ...this.headers,
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        ...options,
        headers,
        timeout: this.timeout,
      };

      // Use certificate pinning fetch if enabled, otherwise regular fetch
      const fetchFunction = this.certificatePinningEnabled ? sslFetch : fetch;

      // Make the request
      const response = await fetchFunction(url, requestOptions);

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.error || 'Request failed',
          code: data.code || 'UNKNOWN_ERROR',
          status: response.status,
          details: data,
        } as APIError;
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      // Handle certificate pinning errors
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        
        if (errorCode === 'certificate_error' || errorCode === 'ssl_error') {
          console.error('Certificate pinning validation failed:', error);
          
          // Log security event
          this.logSecurityEvent('CERTIFICATE_PINNING_FAILURE', {
            url,
            error: errorCode,
            timestamp: new Date().toISOString(),
          });

          // In production, we should not continue with the request
          throw {
            message: 'Security validation failed. Please update the app.',
            code: 'CERTIFICATE_PINNING_FAILED',
            status: 0,
          } as APIError;
        }
      }

      // Handle other errors
      if (this.isAPIError(error)) {
        throw error;
      }

      throw {
        message: error instanceof Error ? error.message : 'Network request failed',
        code: 'NETWORK_ERROR',
        status: 0,
      } as APIError;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<APIResponse<T>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Update base URL (for configuration changes)
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  /**
   * Update default headers
   */
  setHeader(key: string, value: string): void {
    this.headers[key] = value;
  }

  /**
   * Remove a default header
   */
  removeHeader(key: string): void {
    delete this.headers[key];
  }

  /**
   * Type guard for API errors
   */
  private isAPIError(error: unknown): error is APIError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'message' in error &&
      'code' in error
    );
  }

  /**
   * Log security events (should be sent to analytics/monitoring service)
   */
  private logSecurityEvent(event: string, details: any): void {
    console.warn(`[SECURITY_EVENT] ${event}:`, details);
    
    // In production, send this to your analytics service
    // Example: analytics.track('security_event', { event, ...details });
  }

  /**
   * Get certificate pinning status
   */
  getCertificatePinningStatus(): {
    enabled: boolean;
    platform: string;
    environment: string;
  } {
    return {
      enabled: this.certificatePinningEnabled,
      platform: Platform.OS,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

// Helper function to get certificate hashes (for setup)
export async function getCertificateHashes(domain: string): Promise<string[]> {
  try {
    // This is a helper for development to get certificate hashes
    // In production, you should pre-calculate these
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
    });
    
    // Note: This won't actually work in React Native
    // You need to use tools like openssl to get the certificate hashes:
    // openssl s_client -connect api.lamsa.com:443 -servername api.lamsa.com | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
    
    console.log('Certificate fetch response:', response.status);
    return [];
  } catch (error) {
    console.error('Failed to get certificate hashes:', error);
    return [];
  }
}

// Export a function to create a secure client
export function createSecureClient(baseURL: string): SecureHTTPClient {
  return new SecureHTTPClient(baseURL);
}