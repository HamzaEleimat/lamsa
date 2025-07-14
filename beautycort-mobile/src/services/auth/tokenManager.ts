import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenInfo } from '../core/types';

const TOKEN_STORAGE_KEY = '@beautycort_tokens';
const REFRESH_BUFFER_TIME = 5 * 60 * 1000; // 5 minutes before expiry

/**
 * Secure token management with automatic refresh
 */
export class TokenManager {
  private tokens: TokenInfo | null = null;
  private refreshPromise: Promise<TokenInfo | null> | null = null;
  private refreshCallback?: () => Promise<TokenInfo | null>;

  constructor() {
    this.loadTokens();
  }

  /**
   * Set token refresh callback
   */
  setRefreshCallback(callback: () => Promise<TokenInfo | null>): void {
    this.refreshCallback = callback;
  }

  /**
   * Store tokens securely
   */
  async setTokens(tokens: TokenInfo): Promise<void> {
    this.tokens = tokens;
    await this.saveTokens();
  }

  /**
   * Get current access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string | null> {
    // Check if we have tokens
    if (!this.tokens) {
      await this.loadTokens();
      if (!this.tokens) {
        return null;
      }
    }

    // Check if token needs refresh
    if (this.shouldRefreshToken()) {
      const refreshedTokens = await this.refreshTokens();
      if (!refreshedTokens) {
        return null;
      }
    }

    return this.tokens?.accessToken || null;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.tokens?.refreshToken || null;
  }

  /**
   * Check if we have valid tokens
   */
  hasValidTokens(): boolean {
    if (!this.tokens) {
      return false;
    }

    // Check if token is expired (with buffer)
    const now = Date.now();
    const expiryWithBuffer = this.tokens.expiresAt - REFRESH_BUFFER_TIME;
    
    return now < expiryWithBuffer;
  }

  /**
   * Check if token should be refreshed
   */
  private shouldRefreshToken(): boolean {
    if (!this.tokens) {
      return false;
    }

    const now = Date.now();
    const expiryWithBuffer = this.tokens.expiresAt - REFRESH_BUFFER_TIME;
    
    return now >= expiryWithBuffer;
  }

  /**
   * Refresh tokens using the refresh callback
   */
  private async refreshTokens(): Promise<TokenInfo | null> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<TokenInfo | null> {
    if (!this.refreshCallback) {
      console.warn('No refresh callback set for token manager');
      return null;
    }

    try {
      console.log('Refreshing authentication tokens...');
      const newTokens = await this.refreshCallback();
      
      if (newTokens) {
        await this.setTokens(newTokens);
        console.log('Tokens refreshed successfully');
        return newTokens;
      } else {
        console.log('Token refresh failed, clearing stored tokens');
        await this.clearTokens();
        return null;
      }
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    this.tokens = null;
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  /**
   * Load tokens from storage
   */
  private async loadTokens(): Promise<void> {
    try {
      const storedTokens = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedTokens) {
        const parsed = JSON.parse(storedTokens);
        
        // Validate token structure
        if (this.isValidTokenInfo(parsed)) {
          this.tokens = parsed;
        } else {
          console.warn('Invalid token structure in storage, clearing');
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
      this.tokens = null;
    }
  }

  /**
   * Save tokens to storage
   */
  private async saveTokens(): Promise<void> {
    if (!this.tokens) {
      return;
    }

    try {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(this.tokens));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  /**
   * Validate token info structure
   */
  private isValidTokenInfo(obj: any): obj is TokenInfo {
    return (
      obj &&
      typeof obj.accessToken === 'string' &&
      typeof obj.expiresAt === 'number' &&
      typeof obj.type === 'string' &&
      (obj.refreshToken === undefined || typeof obj.refreshToken === 'string')
    );
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(): number | null {
    return this.tokens?.expiresAt || null;
  }

  /**
   * Check if tokens will expire soon
   */
  willExpireSoon(bufferMinutes: number = 5): boolean {
    if (!this.tokens) {
      return true;
    }

    const now = Date.now();
    const bufferTime = bufferMinutes * 60 * 1000;
    
    return now >= (this.tokens.expiresAt - bufferTime);
  }

  /**
   * Force token refresh
   */
  async forceRefresh(): Promise<TokenInfo | null> {
    this.refreshPromise = null; // Clear any existing refresh promise
    return this.refreshTokens();
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo(): { hasTokens: boolean; expiresAt?: number; type?: string } {
    return {
      hasTokens: !!this.tokens,
      expiresAt: this.tokens?.expiresAt,
      type: this.tokens?.type,
    };
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();
