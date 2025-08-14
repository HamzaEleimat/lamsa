import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
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

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_KEY not configured - some admin operations will not be available');
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

// Log configuration status on startup
console.log('Supabase Configuration:', {
  url: supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  hasAdminClient: !!supabaseAdmin,
  isCloudInstance: supabaseUrl.includes('supabase.co')
});

// Initialize OTP attempt tracker for security
const otpAttemptTracker = new OtpAttemptTracker();

// Helper function to create SHA-256 hash
function createHash(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

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
      console.log('=== Provider Signup Debug ===');
      console.log('Input data:', JSON.stringify(providerData, null, 2));
      
      // For development/testing, use admin client to create user with confirmed email
      if (supabaseAdmin && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
        console.log('Using admin client for provider signup (dev/test mode)');
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: providerData.email,
          password: providerData.password,
          email_confirm: true, // Auto-confirm email in development
          user_metadata: {
            type: 'provider'
          }
        });
        
        console.log('Admin auth creation result:', { authData, authError });
        
        if (authError || !authData.user) {
          console.error('Admin auth creation failed:', authError);
          return { data: null, error: authError };
        }
        
        // Continue with the same flow but use authData.user
        const transformedAddress = {
          street_ar: providerData.address.street,
          street_en: providerData.address.street,
          area_ar: providerData.address.district,
          area_en: providerData.address.district,
          city_ar: providerData.address.city,
          city_en: providerData.address.city,
          building_no: ''
        };

        const insertData: any = {
          id: authData.user.id,
          email: providerData.email,
          phone: providerData.phone,
          email_hash: createHash(providerData.email),
          phone_hash: createHash(providerData.phone),
          business_name_ar: providerData.business_name_ar,
          business_name_en: providerData.business_name_en,
          owner_name: providerData.owner_name,
          address: transformedAddress,
          license_number: providerData.license_number,
          password_hash: null,
        };

        if (providerData.latitude !== undefined && providerData.longitude !== undefined) {
          insertData.latitude = providerData.latitude;
          insertData.longitude = providerData.longitude;
        }

        console.log('Inserting provider data:', JSON.stringify(insertData, null, 2));
        
        const { data: provider, error: providerError } = await supabaseAdmin
          .from('providers')
          .insert(insertData)
          .select()
          .single();
        
        console.log('Provider insert result:', { provider, providerError });
        
        if (providerError) {
          console.error('Provider creation failed:', {
            error: providerError,
            message: providerError.message,
            details: providerError.details,
            hint: providerError.hint,
            code: providerError.code,
            insertData: insertData
          });
          
          // Rollback auth user if provider creation fails
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.log('Auth user rolled back successfully');
          } catch (rollbackError) {
            console.error('Failed to rollback auth user:', rollbackError);
          }
          
          return { data: null, error: providerError };
        }
        
        return { data: { user: authData.user, provider }, error: null };
      }
      
      // Production mode or no admin client - use regular signup
      console.log('Using regular client for provider signup');
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: providerData.email,
        password: providerData.password,
      });
      
      console.log('Auth signup result:', { authData, authError });
      
      if (authError || !authData.user) {
        console.error('Auth signup failed:', authError);
        return { data: null, error: authError };
      }
      
      // Transform address to match database schema
      const transformedAddress = {
        street_ar: providerData.address.street, // Use English for Arabic temporarily
        street_en: providerData.address.street,
        area_ar: providerData.address.district,
        area_en: providerData.address.district,
        city_ar: providerData.address.city,
        city_en: providerData.address.city,
        building_no: '' // Optional field
      };

      // Create provider profile
      const insertData: any = {
        id: authData.user.id,
        email: providerData.email,
        phone: providerData.phone,
        email_hash: createHash(providerData.email), // Add hash for encrypted lookups
        phone_hash: createHash(providerData.phone), // Add hash for encrypted lookups
        business_name_ar: providerData.business_name_ar,
        business_name_en: providerData.business_name_en,
        owner_name: providerData.owner_name,
        address: transformedAddress,
        license_number: providerData.license_number,
        password_hash: null, // Null since we use Supabase Auth
      };

      // Only include location fields if both are provided
      if (providerData.latitude !== undefined && providerData.longitude !== undefined) {
        insertData.latitude = providerData.latitude;
        insertData.longitude = providerData.longitude;
        // Don't set location directly - let database trigger handle it
      }

      console.log('Inserting provider data:', JSON.stringify(insertData, null, 2));
      
      // Use supabaseAdmin for provider creation to bypass RLS
      if (!supabaseAdmin) {
        console.error('supabaseAdmin not configured - falling back to regular client');
        const { data: provider, error: providerError } = await supabase
          .from('providers')
          .insert(insertData)
          .select()
          .single();
        
        console.log('Provider insert result:', { provider, providerError });
        
        if (providerError) {
          throw providerError;
        }
        
        return { data: { user: authData.user, provider }, error: null };
      }
      
      const { data: provider, error: providerError } = await supabaseAdmin
        .from('providers')
        .insert(insertData)
        .select()
        .single();
      
      console.log('Provider insert result:', { provider, providerError });
      
      if (providerError) {
        console.error('Provider creation failed:', {
          error: providerError,
          message: providerError.message,
          details: providerError.details,
          hint: providerError.hint,
          code: providerError.code,
          insertData: insertData // Log the data we tried to insert for debugging
        });
        
        // Rollback auth user if provider creation fails
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.log('Auth user rolled back successfully');
          } catch (rollbackError) {
            console.error('Failed to rollback auth user:', rollbackError);
          }
        } else {
          console.warn('Cannot rollback auth user - supabaseAdmin not configured');
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
      console.log('[signInProvider] Called with email:', email);
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('[signInProvider] Auth result:', {
        hasUser: !!authData?.user,
        hasSession: !!authData?.session,
        error: authError?.message || null
      });
      
      if (authError || !authData.user) {
        console.log('[signInProvider] Returning error:', authError);
        return { data: null, error: authError };
      }
      
      // Get provider profile
      console.log('[signInProvider] Fetching provider with ID:', authData.user.id);
      
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      console.log('[signInProvider] Provider query result:', {
        hasProvider: !!provider,
        error: providerError?.message || null
      });
      
      if (providerError || !provider) {
        console.log('[signInProvider] Provider error, returning:', providerError);
        return { data: null, error: providerError || new Error('Provider profile not found') };
      }
      
      console.log('[signInProvider] Success! Returning provider:', provider.email);
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
      console.log('createCustomerAfterOtp called with:', { phone, additionalData });
      
      // Validate phone is provided
      if (!phone) {
        throw new Error('Phone number is required');
      }
      
      // First check if user already exists
      console.log('Checking for existing user with phone:', phone);
      const { data: existingUser, error: findError } = await db.users.findByPhone(phone);
      
      if (findError) {
        console.error('Error finding user by phone:', findError);
      }
      
      if (existingUser) {
        console.log('Found existing user:', existingUser);
        return { data: existingUser, error: null };
      }
      
      // Create new user - ensure phone is string
      console.log('Creating new user...');
      const userPhone = phone as string; // We've already validated it's not undefined
      
      const userData = {
        phone: userPhone,
        name: additionalData?.name || 'User',
        email: additionalData?.email,
        language: additionalData?.language || 'ar'
      };
      console.log('User data to create:', userData);
      
      const result = await db.users.create(userData);
      
      console.log('Create user result:', { 
        data: result.data, 
        error: result.error 
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
    
    async findByEmail(email: string) {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .select('*')
          .eq('email', email)
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
      // Use admin client to bypass RLS policies for user creation
      const client = supabaseAdmin || supabase;
      return handleSupabaseOperation(
        client
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
          .maybeSingle()
      );
    },
    
    async findByPhone(phone: string) {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select('*')
          .eq('phone', phone)
          .maybeSingle()
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
