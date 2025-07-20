/**
 * @file biometricAuth.ts
 * @description Biometric authentication service for Face ID/Touch ID
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'lamsa_biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'lamsa_biometric_token_secure';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: BiometricErrorCode;
}

export enum BiometricErrorCode {
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  NOT_ENROLLED = 'NOT_ENROLLED',
  USER_CANCEL = 'USER_CANCEL',
  SYSTEM_CANCEL = 'SYSTEM_CANCEL',
  LOCKOUT = 'LOCKOUT',
  UNKNOWN = 'UNKNOWN',
}

export enum BiometricType {
  FINGERPRINT = 'FINGERPRINT',
  FACE_ID = 'FACE_ID',
  IRIS = 'IRIS',
}

class BiometricAuthService {
  /**
   * Check if biometric authentication is available on device
   */
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return false;

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get available biometric types on device
   */
  async getAvailableTypes(): Promise<BiometricType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      return types.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return BiometricType.FINGERPRINT;
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return BiometricType.FACE_ID;
          case LocalAuthentication.AuthenticationType.IRIS:
            return BiometricType.IRIS;
          default:
            return BiometricType.FINGERPRINT;
        }
      });
    } catch (error) {
      console.error('Error getting biometric types:', error);
      return [];
    }
  }

  /**
   * Check if biometric authentication is enabled for the app
   */
  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enable(): Promise<BiometricAuthResult> {
    try {
      // Check availability first
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication not available',
          errorCode: BiometricErrorCode.NOT_AVAILABLE,
        };
      }

      // Authenticate to enable
      const authResult = await this.authenticate('Enable biometric authentication for Lamsa');
      if (!authResult.success) {
        return authResult;
      }

      // Save enabled status
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

      // Generate and store a biometric token for faster future auth
      const biometricToken = this.generateBiometricToken();
      await this.storeBiometricToken(biometricToken);

      return { success: true };
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return {
        success: false,
        error: 'Failed to enable biometric authentication',
        errorCode: BiometricErrorCode.UNKNOWN,
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disable(): Promise<void> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
      await this.clearBiometricToken();
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(reason?: string): Promise<BiometricAuthResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        return { success: true };
      }

      // Map error types
      let errorCode = BiometricErrorCode.UNKNOWN;
      let errorMessage = 'Authentication failed';

      switch (result.error) {
        case 'UserCancel':
          errorCode = BiometricErrorCode.USER_CANCEL;
          errorMessage = 'Authentication cancelled';
          break;
        case 'SystemCancel':
          errorCode = BiometricErrorCode.SYSTEM_CANCEL;
          errorMessage = 'Authentication cancelled by system';
          break;
        case 'Lockout':
          errorCode = BiometricErrorCode.LOCKOUT;
          errorMessage = 'Too many failed attempts';
          break;
        case 'NotEnrolled':
          errorCode = BiometricErrorCode.NOT_ENROLLED;
          errorMessage = 'No biometric credentials enrolled';
          break;
        default:
          errorMessage = result.error || 'Authentication failed';
      }

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Biometric authentication failed',
        errorCode: BiometricErrorCode.UNKNOWN,
      };
    }
  }

  /**
   * Authenticate for app access (used on app launch)
   */
  async authenticateForAppAccess(): Promise<BiometricAuthResult> {
    const isEnabled = await this.isEnabled();
    if (!isEnabled) {
      return { success: true }; // Biometric not enabled, allow access
    }

    return this.authenticate('Unlock Lamsa');
  }

  /**
   * Authenticate for sensitive operations
   */
  async authenticateForSensitiveOperation(operation: string): Promise<BiometricAuthResult> {
    const isEnabled = await this.isEnabled();
    if (!isEnabled) {
      // For sensitive operations, we might want to require authentication
      // even if biometric is not enabled (use password/PIN)
      return { success: true };
    }

    return this.authenticate(`Authenticate to ${operation}`);
  }

  /**
   * Generate a unique biometric token
   */
  private generateBiometricToken(): string {
    return `bio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store biometric token securely
   */
  private async storeBiometricToken(token: string): Promise<void> {
    try {
      // Use SecureStore for native platforms
      try {
        await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
      } catch (error) {
        // Fallback to AsyncStorage for web
        await AsyncStorage.setItem(BIOMETRIC_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error storing biometric token:', error);
    }
  }

  /**
   * Get stored biometric token
   */
  async getBiometricToken(): Promise<string | null> {
    try {
      let token: string | null = null;
      
      // Try SecureStore first
      try {
        token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
      } catch (error) {
        // Fallback to AsyncStorage
        token = await AsyncStorage.getItem(BIOMETRIC_TOKEN_KEY);
      }

      return token;
    } catch (error) {
      console.error('Error getting biometric token:', error);
      return null;
    }
  }

  /**
   * Clear biometric token
   */
  private async clearBiometricToken(): Promise<void> {
    try {
      try {
        await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      } catch (error) {
        await AsyncStorage.removeItem(BIOMETRIC_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error clearing biometric token:', error);
    }
  }

  /**
   * Get biometric authentication status
   */
  async getStatus(): Promise<{
    available: boolean;
    enabled: boolean;
    types: BiometricType[];
    platform: string;
  }> {
    const [available, enabled, types] = await Promise.all([
      this.isAvailable(),
      this.isEnabled(),
      this.getAvailableTypes(),
    ]);

    return {
      available,
      enabled,
      types,
      platform: Platform.OS,
    };
  }

  /**
   * Request biometric permissions (iOS specific)
   */
  async requestPermissions(): Promise<void> {
    // On iOS, Face ID requires permission
    if (Platform.OS === 'ios') {
      try {
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Lamsa would like to use Face ID',
        });
      } catch (error) {
        console.log('Face ID permission request:', error);
      }
    }
  }
}

// Export singleton instance
export const biometricAuth = new BiometricAuthService();

// Export types
export { BiometricAuthService };