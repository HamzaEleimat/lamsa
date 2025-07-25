import { getSupabase } from '../../lib/supabase';
import { tokenManager } from './tokenManager';
import { APIResponse, TokenInfo } from '../core/types';
import { User, UserRole } from '../../types';

export interface AuthCredentials {
  phone: string;
  otp?: string;
}

export interface AuthResult {
  user: User;
  session: any;
}

/**
 * Authentication service abstraction layer
 */
export class AuthService {
  constructor() {
    // Set up token refresh callback
    tokenManager.setRefreshCallback(this.refreshTokens.bind(this));
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(phone: string): Promise<APIResponse<{ sent: boolean }>> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(phone)) {
        return {
          success: false,
          data: null,
          error: {
            code: 'INVALID_PHONE',
            message: 'Invalid phone number format',
            category: 'VALIDATION' as any,
            userMessage: {
              en: 'Please enter a valid phone number',
              ar: 'يرجى إدخال رقم هاتف صحيح',
            },
          },
        };
      }

      const client = await getSupabase();
      const { data, error } = await client.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        return {
          success: false,
          data: null,
          error: {
            code: 'OTP_SEND_FAILED',
            message: error.message,
            category: 'NETWORK' as any,
            userMessage: {
              en: 'Failed to send verification code. Please try again.',
              ar: 'فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.',
            },
          },
        };
      }

      return {
        success: true,
        data: { sent: true },
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: 'OTP_SEND_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          category: 'UNKNOWN' as any,
          userMessage: {
            en: 'An error occurred while sending verification code',
            ar: 'حدث خطأ أثناء إرسال رمز التحقق',
          },
        },
      };
    }
  }

  /**
   * Verify OTP and complete authentication
   */
  async verifyOTP(phone: string, otp: string): Promise<APIResponse<AuthResult>> {
    try {
      // Validate inputs
      if (!this.isValidPhoneNumber(phone)) {
        return {
          success: false,
          data: null,
          error: {
            code: 'INVALID_PHONE',
            message: 'Invalid phone number format',
            category: 'VALIDATION' as any,
            userMessage: {
              en: 'Please enter a valid phone number',
              ar: 'يرجى إدخال رقم هاتف صحيح',
            },
          },
        };
      }

      if (!this.isValidOTP(otp)) {
        return {
          success: false,
          data: null,
          error: {
            code: 'INVALID_OTP',
            message: 'Invalid OTP format',
            category: 'VALIDATION' as any,
            userMessage: {
              en: 'Please enter a valid 6-digit code',
              ar: 'يرجى إدخال رمز مكون من 6 أرقام صحيح',
            },
          },
        };
      }

      const client = await getSupabase();
      const { data, error } = await client.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        return {
          success: false,
          data: null,
          error: {
            code: 'OTP_VERIFY_FAILED',
            message: error.message,
            category: this.categorizeSupabaseError(error) as any,
            userMessage: {
              en: this.getErrorMessage(error, 'en'),
              ar: this.getErrorMessage(error, 'ar'),
            },
          },
        };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          data: null,
          error: {
            code: 'NO_SESSION',
            message: 'No session created',
            category: 'AUTHENTICATION' as any,
            userMessage: {
              en: 'Authentication failed. Please try again.',
              ar: 'فشل في التحقق. يرجى المحاولة مرة أخرى.',
            },
          },
        };
      }

      // Store tokens
      const tokenInfo: TokenInfo = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + (60 * 60 * 1000),
        type: 'Bearer',
      };

      await tokenManager.setTokens(tokenInfo);

      // Get or create user profile
      const userProfile = await this.getOrCreateUserProfile(data.user, phone);

      return {
        success: true,
        data: {
          user: userProfile,
          session: data.session,
        },
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: 'OTP_VERIFY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          category: 'UNKNOWN' as any,
          userMessage: {
            en: 'An error occurred during verification',
            ar: 'حدث خطأ أثناء التحقق',
          },
        },
      };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<APIResponse<{ success: boolean }>> {
    try {
      const client = await getSupabase();
      const { error } = await client.auth.signOut();

      // Clear tokens regardless of Supabase result
      await tokenManager.clearTokens();

      if (error) {
        console.warn('Supabase signout error:', error);
        // Don't fail the entire operation if Supabase signout fails
      }

      return {
        success: true,
        data: { success: true },
        error: null,
      };
    } catch (error) {
      // Clear tokens even if there's an error
      await tokenManager.clearTokens();

      return {
        success: false,
        data: null,
        error: {
          code: 'SIGNOUT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          category: 'UNKNOWN' as any,
          userMessage: {
            en: 'An error occurred while signing out',
            ar: 'حدث خطأ أثناء تسجيل الخروج',
          },
        },
      };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<APIResponse<User | null>> {
    try {
      const client = await getSupabase();
      const { data: { user }, error } = await client.auth.getUser();

      if (error) {
        return {
          success: false,
          data: null,
          error: {
            code: 'GET_USER_FAILED',
            message: error.message,
            category: 'AUTHENTICATION' as any,
            userMessage: {
              en: 'Failed to get user information',
              ar: 'فشل في الحصول على معلومات المستخدم',
            },
          },
        };
      }

      if (!user) {
        return {
          success: true,
          data: null,
          error: null,
        };
      }

      // Get user profile from database
      const userProfile = await this.getUserProfile(user.id);

      return {
        success: true,
        data: userProfile,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: 'GET_USER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          category: 'UNKNOWN' as any,
          userMessage: {
            en: 'An error occurred while getting user information',
            ar: 'حدث خطأ أثناء الحصول على معلومات المستخدم',
          },
        },
      };
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<TokenInfo | null> {
    try {
      const client = await getSupabase();
      const { data, error } = await client.auth.refreshSession();

      if (error || !data.session) {
        console.error('Token refresh failed:', error);
        return null;
      }

      const tokenInfo: TokenInfo = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + (60 * 60 * 1000),
        type: 'Bearer',
      };

      return tokenInfo;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const hasValidTokens = tokenManager.hasValidTokens();
      if (!hasValidTokens) {
        return false;
      }

      const client = await getSupabase();
      const { data: { session } } = await client.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<APIResponse<User>> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser.success || !currentUser.data) {
        return {
          success: false,
          data: null,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'User not authenticated',
            category: 'AUTHENTICATION' as any,
            userMessage: {
              en: 'Please log in to update your profile',
              ar: 'يرجى تسجيل الدخول لتحديث ملفك الشخصي',
            },
          },
        };
      }

      // Update user in database
      const client = await getSupabase();
      const { data, error } = await client
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.data.id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          data: null,
          error: {
            code: 'UPDATE_PROFILE_FAILED',
            message: error.message,
            category: 'SERVER_ERROR' as any,
            userMessage: {
              en: 'Failed to update profile. Please try again.',
              ar: 'فشل في تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.',
            },
          },
        };
      }

      const updatedUser = this.mapDatabaseUserToUser(data);

      return {
        success: true,
        data: updatedUser,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: 'UPDATE_PROFILE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          category: 'UNKNOWN' as any,
          userMessage: {
            en: 'An error occurred while updating profile',
            ar: 'حدث خطأ أثناء تحديث الملف الشخصي',
          },
        },
      };
    }
  }

  // Private helper methods

  private isValidPhoneNumber(phone: string): boolean {
    // Jordan phone number validation (should start with +962 and be followed by valid prefixes)
    const jordanPhoneRegex = /^\+962(77|78|79)\d{7}$/;
    return jordanPhoneRegex.test(phone);
  }

  private isValidOTP(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }

  private categorizeSupabaseError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('invalid') || message.includes('expired')) {
      return 'VALIDATION';
    }
    if (message.includes('rate') || message.includes('limit')) {
      return 'RATE_LIMITED';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK';
    }
    
    return 'AUTHENTICATION';
  }

  private getErrorMessage(error: any, language: 'en' | 'ar'): string {
    const message = error.message?.toLowerCase() || '';
    
    const errorMessages = {
      en: {
        invalid: 'Invalid verification code. Please try again.',
        expired: 'Verification code has expired. Please request a new one.',
        rate_limit: 'Too many attempts. Please wait before trying again.',
        network: 'Network error. Please check your connection and try again.',
        default: 'Authentication failed. Please try again.',
      },
      ar: {
        invalid: 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.',
        expired: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
        rate_limit: 'محاولات كثيرة جداً. يرجى الانتظار قبل المحاولة مرة أخرى.',
        network: 'خطأ في الشبكة. يرجى التحقق من الاتصال والمحاولة مرة أخرى.',
        default: 'فشل في التحقق. يرجى المحاولة مرة أخرى.',
      },
    };

    if (message.includes('invalid')) return errorMessages[language].invalid;
    if (message.includes('expired')) return errorMessages[language].expired;
    if (message.includes('rate') || message.includes('limit')) return errorMessages[language].rate_limit;
    if (message.includes('network')) return errorMessages[language].network;
    
    return errorMessages[language].default;
  }

  private async getOrCreateUserProfile(supabaseUser: any, phone: string): Promise<User> {
    try {
      // Try to get existing user
      const client = await getSupabase();
      const { data: existingUser, error: fetchError } = await client
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (existingUser && !fetchError) {
        return this.mapDatabaseUserToUser(existingUser);
      }

      // Create new user profile
      const newUser = {
        id: supabaseUser.id,
        phone: phone,
        name: supabaseUser.user_metadata?.name || '',
        email: supabaseUser.email || '',
        role: UserRole.CUSTOMER, // Default role
        language_preference: 'ar', // Default language for Jordan
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdUser, error: createError } = await client
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError || !createdUser) {
        console.error('Failed to create user profile:', createError);
        // Return a minimal user object if database creation fails
        return {
          id: supabaseUser.id,
          phone: phone,
          name: '',
          role: UserRole.CUSTOMER,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return this.mapDatabaseUserToUser(createdUser);
    } catch (error) {
      console.error('Error in getOrCreateUserProfile:', error);
      // Return minimal user object as fallback
      return {
        id: supabaseUser.id,
        phone: phone,
        name: '',
        role: UserRole.CUSTOMER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  private async getUserProfile(userId: string): Promise<User | null> {
    try {
      const client = await getSupabase();
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseUserToUser(data);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  private mapDatabaseUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      phone: dbUser.phone,
      name: dbUser.name || '',
      email: dbUser.email || '',
      role: dbUser.role || UserRole.CUSTOMER,
      languagePreference: dbUser.language_preference,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
