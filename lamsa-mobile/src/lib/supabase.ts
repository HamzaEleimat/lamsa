import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { getSupabaseConfig } from '../config/api-config';

// Supabase client instance (initialized lazily)
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 * Lazy initialization to ensure config is loaded first
 */
export const getSupabase = async (): Promise<SupabaseClient> => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    // Get config from secure service
    const { url, anonKey } = await getSupabaseConfig();
    
    if (!url || !anonKey) {
      throw new Error('Supabase configuration not available');
    }

    // Create Supabase client with AsyncStorage for session persistence
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw new Error('Unable to connect to services. Please try again later.');
  }
};

// For backward compatibility - will be initialized on first use
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    console.warn('Direct supabase access is deprecated. Use getSupabase() instead.');
    if (!supabaseInstance) {
      throw new Error('Supabase not initialized. Use getSupabase() for async initialization.');
    }
    return (supabaseInstance as any)[prop];
  },
});

// Handle app state changes to refresh session
AppState.addEventListener('change', async (state) => {
  if (supabaseInstance) {
    if (state === 'active') {
      supabaseInstance.auth.startAutoRefresh();
    } else {
      supabaseInstance.auth.stopAutoRefresh();
    }
  }
});

// Auth functions with error handling
export const auth = {
  /**
   * Send OTP to phone number
   * @param phone - Phone number in international format (e.g., +962777123456)
   * @returns Promise with success status and error if any
   */
  async sendOTP(phone: string) {
    try {
      // Validate phone number format
      if (!phone || !phone.startsWith('+')) {
        throw new Error('Phone number must be in international format (e.g., +962777123456)');
      }

      const client = await getSupabase();
      const { data, error } = await client.auth.signInWithOtp({
        phone,
        options: {
          // For Jordan, you might want to set specific channel
          channel: 'sms',
        },
      });

      if (error) {
        console.error('Error sending OTP:', error);
        throw error;
      }

      return {
        success: true,
        data,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  },

  /**
   * Verify OTP code
   * @param phone - Phone number in international format
   * @param otp - 6-digit OTP code
   * @returns Promise with session data and error if any
   */
  async verifyOTP(phone: string, otp: string) {
    try {
      // Validate inputs
      if (!phone || !phone.startsWith('+')) {
        throw new Error('Phone number must be in international format');
      }

      if (!otp || otp.length !== 6) {
        throw new Error('OTP must be 6 digits');
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        throw error;
      }

      // Store session in AsyncStorage (Supabase handles this automatically)
      if (data.session) {
        // You can perform additional actions here if needed
        console.log('User authenticated successfully');
      }

      return {
        success: true,
        data,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  },

  /**
   * Get current session
   * @returns Promise with session data
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        throw error;
      }

      return {
        success: true,
        session,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get session';
      return {
        success: false,
        session: null,
        error: errorMessage,
      };
    }
  },

  /**
   * Sign out user
   * @returns Promise with success status
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }

      // Clear any additional app-specific data from AsyncStorage
      const keysToRemove = ['user_profile', 'user_preferences'];
      await AsyncStorage.multiRemove(keysToRemove);

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Get current user
   * @returns Current user object or null
   */
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Error getting user:', error);
        throw error;
      }

      return {
        success: true,
        user,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user';
      return {
        success: false,
        user: null,
        error: errorMessage,
      };
    }
  },

  /**
   * Listen to auth state changes
   * @param callback - Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return subscription.unsubscribe;
  },

  /**
   * Update user profile
   * @param updates - Profile updates (e.g., { name: 'New Name' })
   * @returns Promise with updated user data
   */
  async updateProfile(updates: { name?: string; avatar_url?: string }) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      return {
        success: true,
        data,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  },
};

// Database helper functions
export const db = {
  /**
   * Get user profile from database
   * @param userId - User ID
   * @returns User profile data
   */
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user profile';
      return { success: false, data: null, error: errorMessage };
    }
  },

  /**
   * Update user profile in database
   * @param userId - User ID
   * @param updates - Profile updates
   * @returns Updated profile data
   */
  async updateUserProfile(userId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user profile';
      return { success: false, data: null, error: errorMessage };
    }
  },
};

// Export types
export type { Session, User } from '@supabase/supabase-js';

// Helper to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { session } = await auth.getSession();
  return !!session;
};

// Helper to get auth token
export const getAuthToken = async (): Promise<string | null> => {
  const { session } = await auth.getSession();
  return session?.access_token || null;
};

// Error types for better error handling
export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  OTP_EXPIRED = 'OTP_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Helper to categorize auth errors
export const categorizeAuthError = (error: any): AuthErrorType => {
  if (!error) return AuthErrorType.UNKNOWN_ERROR;
  
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch')) {
    return AuthErrorType.NETWORK_ERROR;
  }
  if (message.includes('invalid') || message.includes('incorrect')) {
    return AuthErrorType.INVALID_CREDENTIALS;
  }
  if (message.includes('expired')) {
    return AuthErrorType.OTP_EXPIRED;
  }
  if (message.includes('rate') || message.includes('limit')) {
    return AuthErrorType.RATE_LIMITED;
  }
  
  return AuthErrorType.UNKNOWN_ERROR;
};

export default supabase;