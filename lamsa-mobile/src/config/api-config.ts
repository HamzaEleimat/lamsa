/**
 * @file api-config.ts
 * @description Secure API configuration that fetches sensitive values from server
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const CONFIG_CACHE_KEY = 'lamsa_api_config_secure';
const CONFIG_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface ApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  environment: string;
  features: {
    enableOTP: boolean;
    enablePushNotifications: boolean;
    enableAnalytics: boolean;
  };
}

class ApiConfigService {
  private config: ApiConfig | null = null;
  private configPromise: Promise<ApiConfig> | null = null;

  /**
   * Get API configuration from server or cache
   */
  async getConfig(): Promise<ApiConfig> {
    // Return cached config if available
    if (this.config) {
      return this.config;
    }

    // Prevent multiple concurrent fetches
    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = this.fetchConfig();
    
    try {
      const config = await this.configPromise;
      this.config = config;
      return config;
    } finally {
      this.configPromise = null;
    }
  }

  /**
   * Fetch configuration from server or cache
   */
  private async fetchConfig(): Promise<ApiConfig> {
    // Try to get from secure cache first
    const cachedConfig = await this.getCachedConfig();
    if (cachedConfig) {
      return cachedConfig;
    }

    // Fetch from server
    try {
      // Use environment variable for API URL only (not sensitive)
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.lamsa.com';
      
      const response = await fetch(`${apiUrl}/api/config/mobile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': '1.0.0',
          'X-Platform': 'mobile',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }

      const config = await response.json();
      
      // Validate config structure
      if (!this.isValidConfig(config)) {
        throw new Error('Invalid config structure received');
      }

      // Cache the config securely
      await this.cacheConfig(config);

      return config;
    } catch (error) {
      console.error('Error fetching API config:', error);
      
      // Fall back to default non-sensitive config
      return this.getDefaultConfig();
    }
  }

  /**
   * Get cached configuration
   */
  private async getCachedConfig(): Promise<ApiConfig | null> {
    try {
      let cachedData: string | null = null;
      
      // Try SecureStore first (for native platforms)
      try {
        cachedData = await SecureStore.getItemAsync(CONFIG_CACHE_KEY);
      } catch (error) {
        // Fallback to AsyncStorage for web
        cachedData = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
      }

      if (!cachedData) {
        return null;
      }

      const { config, timestamp } = JSON.parse(cachedData);
      
      // Check if cache is expired
      if (Date.now() - timestamp > CONFIG_CACHE_DURATION) {
        await this.clearCache();
        return null;
      }

      return config;
    } catch (error) {
      console.error('Error reading cached config:', error);
      return null;
    }
  }

  /**
   * Cache configuration securely
   */
  private async cacheConfig(config: ApiConfig): Promise<void> {
    try {
      const cacheData = JSON.stringify({
        config,
        timestamp: Date.now(),
      });

      // Try SecureStore first (for native platforms)
      try {
        await SecureStore.setItemAsync(CONFIG_CACHE_KEY, cacheData);
      } catch (error) {
        // Fallback to AsyncStorage for web
        await AsyncStorage.setItem(CONFIG_CACHE_KEY, cacheData);
      }
    } catch (error) {
      console.error('Error caching config:', error);
    }
  }

  /**
   * Clear cached configuration
   */
  private async clearCache(): Promise<void> {
    try {
      try {
        await SecureStore.deleteItemAsync(CONFIG_CACHE_KEY);
      } catch (error) {
        await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
      }
    } catch (error) {
      console.error('Error clearing config cache:', error);
    }
  }

  /**
   * Validate configuration structure
   */
  private isValidConfig(obj: any): obj is ApiConfig {
    return (
      obj &&
      typeof obj.supabaseUrl === 'string' &&
      typeof obj.supabaseAnonKey === 'string' &&
      typeof obj.apiBaseUrl === 'string' &&
      typeof obj.environment === 'string' &&
      obj.features &&
      typeof obj.features.enableOTP === 'boolean'
    );
  }

  /**
   * Get default configuration (non-sensitive only)
   */
  private getDefaultConfig(): ApiConfig {
    return {
      supabaseUrl: '', // Will cause controlled failure
      supabaseAnonKey: '', // Will cause controlled failure
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.lamsa.com',
      environment: 'production',
      features: {
        enableOTP: true,
        enablePushNotifications: true,
        enableAnalytics: true,
      },
    };
  }

  /**
   * Force refresh configuration
   */
  async refreshConfig(): Promise<ApiConfig> {
    await this.clearCache();
    this.config = null;
    return this.getConfig();
  }

  /**
   * Get specific configuration value
   */
  async getValue<K extends keyof ApiConfig>(key: K): Promise<ApiConfig[K]> {
    const config = await this.getConfig();
    return config[key];
  }
}

// Export singleton instance
export const apiConfig = new ApiConfigService();

// Export helper functions
export const getSupabaseConfig = async () => {
  const config = await apiConfig.getConfig();
  return {
    url: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
  };
};

export const getApiBaseUrl = async () => {
  return apiConfig.getValue('apiBaseUrl');
};

export const getFeatureFlags = async () => {
  return apiConfig.getValue('features');
};