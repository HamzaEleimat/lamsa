/**
 * @file pinnedHttpClient.ts
 * @description HTTP client wrapper with certificate pinning support
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { Platform } from 'react-native';
import { fetch as sslFetch } from 'react-native-ssl-pinning';
import { HTTPClient } from './httpClient';
import { RequestConfig } from './types';

// Certificate configuration
const CERTIFICATE_CONFIG = {
  'api.lamsa.com': {
    certs: ['cert1', 'cert2'], // Base64 encoded certificates
  },
  'lamsa.com': {
    certs: ['cert3', 'cert4'],
  },
};

/**
 * Extended HTTP client with certificate pinning
 */
export class PinnedHTTPClient extends HTTPClient {
  private pinningEnabled: boolean;
  private certificateConfig: typeof CERTIFICATE_CONFIG;

  constructor(baseURL: string = '') {
    super(baseURL);
    
    // Enable pinning only on native platforms in production
    this.pinningEnabled = 
      Platform.OS !== 'web' && 
      process.env.NODE_ENV === 'production';
      
    this.certificateConfig = CERTIFICATE_CONFIG;
    
    if (this.pinningEnabled) {
      console.log('Certificate pinning enabled for secure connections');
    }
  }

  /**
   * Override the request method to use certificate pinning
   */
  protected async makeRequest<T>(config: RequestConfig): Promise<Response> {
    const { url, ...requestConfig } = config;
    
    // Check if we should use certificate pinning
    if (this.shouldUsePinning(url)) {
      try {
        // Extract hostname from URL
        const hostname = new URL(url).hostname;
        const certConfig = this.certificateConfig[hostname];
        
        if (certConfig) {
          // Use SSL pinning fetch
          return await sslFetch(url, {
            ...requestConfig,
            sslPinning: {
              certs: certConfig.certs,
            },
            timeoutInterval: requestConfig.timeout || 30000,
          });
        }
      } catch (error) {
        // Log certificate pinning errors
        console.error('Certificate pinning error:', error);
        
        // Check if it's a certificate validation failure
        if (this.isCertificateError(error)) {
          throw new Error('Certificate validation failed. Connection refused for security reasons.');
        }
        
        throw error;
      }
    }
    
    // Fall back to regular fetch
    return super.makeRequest(config);
  }

  /**
   * Determine if certificate pinning should be used for this URL
   */
  private shouldUsePinning(url: string): boolean {
    if (!this.pinningEnabled) {
      return false;
    }
    
    try {
      const hostname = new URL(url).hostname;
      return hostname in this.certificateConfig;
    } catch {
      return false;
    }
  }

  /**
   * Check if an error is related to certificate validation
   */
  private isCertificateError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    
    return (
      errorMessage.includes('certificate') ||
      errorMessage.includes('ssl') ||
      errorMessage.includes('pinning') ||
      errorCode.includes('cert') ||
      errorCode.includes('ssl')
    );
  }

  /**
   * Update certificate configuration
   */
  public updateCertificates(hostname: string, certs: string[]): void {
    this.certificateConfig[hostname] = { certs };
  }

  /**
   * Enable or disable certificate pinning
   */
  public setPinningEnabled(enabled: boolean): void {
    this.pinningEnabled = enabled && Platform.OS !== 'web';
  }

  /**
   * Get certificate pinning status
   */
  public getPinningStatus(): {
    enabled: boolean;
    platform: string;
    configuredHosts: string[];
  } {
    return {
      enabled: this.pinningEnabled,
      platform: Platform.OS,
      configuredHosts: Object.keys(this.certificateConfig),
    };
  }
}

// Create a singleton instance with certificate pinning
export const pinnedHttpClient = new PinnedHTTPClient();