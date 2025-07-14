import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { validateJordanPhoneNumber, validateTestPhoneNumber } from '../utils/phone-validation';
import { 
  PhoneAuthResult, 
  PhoneAuthErrorCode,
  OtpConfig,
  VerifyOtpConfig,
  PhoneAuthSession,
  OtpResponse,
  mapSupabaseError,
  OtpAttemptTracker
} from '../utils/auth-types';

dotenv.config();

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Create Supabase clients
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Initialize OTP attempt tracker for security
const otpAttemptTracker = new OtpAttemptTracker();

// Export auth helpers
export const auth = {
  async signOut() {
    return supabase.auth.signOut();
  },
  
  async getSession() {
    return supabase.auth.getSession();
  },
  
  async getUser() {
    return supabase.auth.getUser();
  },
  
  async signUpProvider(providerData: any) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: providerData.email,
        password: providerData.password,
      });
      
      if (authError || !authData.user) {
        return { data: null, error: authError };
      }
      
      // Create provider profile
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .insert({
          id: authData.user.id,
          email: providerData.email,
          phone: providerData.phone,
          business_name_ar: providerData.business_name_ar,
          business_name_en: providerData.business_name_en,
          owner_name: providerData.owner_name,
          latitude: providerData.latitude,
          longitude: providerData.longitude,
          address: providerData.address,
          license_number: providerData.license_number,
        })
        .select()
        .single();
      
      if (providerError) {
        // Rollback auth user if provider creation fails
        if (supabaseAdmin) {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        }
        return { data: null, error: providerError };
      }
      
      return { data: { user: authData.user, provider }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async signInProvider(email: string, password: string) {
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError || !authData.user) {
        return { data: null, error: authError };
      }
      
      // Get provider profile
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (providerError || !provider) {
        return { data: null, error: providerError || new Error('Provider profile not found') };
      }
      
      return { data: { user: authData.user, provider }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async signInWithOtp(config: OtpConfig): Promise<PhoneAuthResult<OtpResponse>> {
    try {
      // Validate phone number
      const validation = process.env.NODE_ENV === 'development' 
        ? validateTestPhoneNumber(config.phone)
        : validateJordanPhoneNumber(config.phone);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: PhoneAuthErrorCode.INVALID_PHONE_NUMBER,
            message: validation.error || 'Invalid phone number'
          }
        };
      }

      const normalizedPhone = validation.normalizedPhone!;
      
      // Check rate limiting
      const attemptResult = otpAttemptTracker.recordAttempt(normalizedPhone);
      if (!attemptResult.allowed) {
        return {
          success: false,
          error: {
            code: PhoneAuthErrorCode.TOO_MANY_ATTEMPTS,
            message: `Too many attempts. Please try again after ${attemptResult.blockedUntil?.toLocaleTimeString()}`,
            status: 429
          }
        };
      }
      
      // Send OTP via Supabase
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          channel: config.channel || 'sms',
          ...(config.captchaToken && { captchaToken: config.captchaToken })
        }
      });
      
      if (error) {
        return {
          success: false,
          error: mapSupabaseError(error)
        };
      }
      
      // Check if SMS was actually sent
      const response: OtpResponse = {
        messageId: data?.messageId,
        user: data?.user,
        session: data?.session
      };
      
      // Log for monitoring (without exposing phone numbers in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 OTP sent to:', normalizedPhone);
        if (response.messageId) {
          console.log('✅ SMS delivered, message ID:', response.messageId);
        } else {
          console.log('⚠️  OTP created but SMS delivery status unknown');
        }
      }
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: mapSupabaseError(error)
      };
    }
  },
  
  async verifyOtp(config: VerifyOtpConfig): Promise<PhoneAuthResult<PhoneAuthSession>> {
    try {
      // Validate phone number
      const validation = process.env.NODE_ENV === 'development' 
        ? validateTestPhoneNumber(config.phone)
        : validateJordanPhoneNumber(config.phone);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: PhoneAuthErrorCode.INVALID_PHONE_NUMBER,
            message: validation.error || 'Invalid phone number'
          }
        };
      }

      const normalizedPhone = validation.normalizedPhone!;
      
      // Validate OTP format (6 digits)
      if (!/^\d{6}$/.test(config.token)) {
        return {
          success: false,
          error: {
            code: PhoneAuthErrorCode.INVALID_OTP,
            message: 'Verification code must be 6 digits'
          }
        };
      }
      
      // Verify OTP via Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: config.token,
        type: config.type || 'sms',
        options: config.captchaToken ? { captchaToken: config.captchaToken } : undefined
      });
      
      if (error) {
        // Map specific OTP errors
        const mappedError = mapSupabaseError(error);
        
        // Special handling for invalid OTP - track failed attempts
        if (mappedError.code === PhoneAuthErrorCode.INVALID_OTP || 
            mappedError.code === PhoneAuthErrorCode.EXPIRED_OTP) {
          const attemptResult = otpAttemptTracker.recordAttempt(normalizedPhone);
          if (!attemptResult.allowed) {
            mappedError.code = PhoneAuthErrorCode.TOO_MANY_ATTEMPTS;
            mappedError.message = `Too many failed attempts. Account locked until ${attemptResult.blockedUntil?.toLocaleTimeString()}`;
          } else if (attemptResult.remainingAttempts > 0) {
            mappedError.message += ` (${attemptResult.remainingAttempts} attempts remaining)`;
          }
        }
        
        return {
          success: false,
          error: mappedError
        };
      }
      
      if (!data.session) {
        return {
          success: false,
          error: {
            code: PhoneAuthErrorCode.INTERNAL_ERROR,
            message: 'Verification succeeded but no session was created'
          }
        };
      }
      
      // Reset attempt tracker on successful verification
      otpAttemptTracker.resetAttempts(normalizedPhone);
      
      // Return session data
      const session: PhoneAuthSession = {
        access_token: data.session.access_token,
        token_type: data.session.token_type || 'bearer',
        expires_in: data.session.expires_in || 3600,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.user?.id || data.session.user.id,
          phone: data.user?.phone || data.session.user.phone || null,
          phone_confirmed_at: data.user?.phone_confirmed_at || data.session.user.phone_confirmed_at || null,
          created_at: data.user?.created_at || data.session.user.created_at || new Date().toISOString(),
          updated_at: data.user?.updated_at || data.session.user.updated_at || new Date().toISOString()
        }
      };
      
      return {
        success: true,
        data: session
      };
    } catch (error) {
      return {
        success: false,
        error: mapSupabaseError(error)
      };
    }
  },
  
  async createCustomerAfterOtp(phone: string, additionalData?: any) {
    try {
      // Validate phone is provided
      if (!phone) {
        throw new Error('Phone number is required');
      }
      
      // First check if user already exists
      const { data: existingUser } = await db.users.findByPhone(phone);
      
      if (existingUser) {
        return { data: existingUser, error: null };
      }
      
      // Create new user - ensure phone is string
      const userPhone = phone as string; // We've already validated it's not undefined
      const result = await db.users.create({
        phone: userPhone,
        name: additionalData?.name || 'User',
        language: additionalData?.language || 'ar',
        ...additionalData
      });
      
      // If database is not set up, return mock user for testing
      if (result.error && process.env.NODE_ENV === 'development') {
        console.log('⚠️  Database not configured, returning mock user for testing');
        const mockUser = {
          id: 'mock-' + Date.now(),
          phone: userPhone,
          name: additionalData?.name || 'User',
          language: additionalData?.language || 'ar',
          created_at: new Date().toISOString(),
        };
        return { data: mockUser, error: null };
      }
      
      return result;
    } catch (error) {
      // In development, return mock user if database fails
      // At this point, we know phone is defined because we checked at the beginning
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  Database error, returning mock user for testing');
        const mockUser = {
          id: 'mock-' + Date.now(),
          phone: phone as string, // Safe cast because we validated at the beginning
          name: additionalData?.name || 'User',
          language: additionalData?.language || 'ar',
          created_at: new Date().toISOString(),
        };
        return { data: mockUser, error: null };
      }
      return { data: null, error };
    }
  },
};

// Helper function to handle Supabase operations
export async function handleSupabaseOperation<T>(
  queryBuilder: any
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryBuilder;
    return result;
  } catch (error) {
    return { data: null, error };
  }
}

// Simple database helpers
export const db = {
  users: {
    async findByPhone(phone: string) {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .select('*')
          .eq('phone', phone)
          .single()
      );
    },
    
    async findById(id: string) {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single()
      );
    },
    
    async create(userData: any) {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .insert(userData)
          .select()
          .single()
      );
    },
  },
  
  providers: {
    async findByEmail(email: string) {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select('*')
          .eq('email', email)
          .single()
      );
    },
    
    async findByPhone(phone: string) {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select('*')
          .eq('phone', phone)
          .single()
      );
    },
    
    async findById(id: string) {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select('*')
          .eq('id', id)
          .single()
      );
    },
  },
};
