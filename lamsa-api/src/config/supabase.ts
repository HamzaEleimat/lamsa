import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Database } from '../types/database';
import { 
  User, 
  Provider, 
  Service, 
  Booking, 
  Review,
  ServiceCategory,
  ProviderSearchResult,
  BookingWithDetails,
  ProviderWithServices
} from '../types/database';
import { secureLogger } from '../utils/secure-logger';

dotenv.config();

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Create typed Supabase clients
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'lamsa-api',
      },
    },
  }
);

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin: SupabaseClient<Database> | null = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    })
  : null;

// Helper type for Supabase responses
export type SupabaseResponse<T> = {
  data: T | null;
  error: Error | null;
};

// Common error handling wrapper
export async function handleSupabaseOperation<T>(
  operation: PromiseLike<{ data: T | null; error: any }>
): Promise<SupabaseResponse<T>> {
  try {
    const { data, error } = await operation;
    
    if (error) {
      secureLogger.error('Supabase operation error', error);
      return { data: null, error: new Error(error.message || 'Database operation failed') };
    }
    
    return { data, error: null };
  } catch (err) {
    secureLogger.error('Unexpected error in Supabase operation', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unexpected error occurred') 
    };
  }
}

// Database helper functions
export const db = {
  // User operations
  users: {
    async findByPhone(phone: string): Promise<SupabaseResponse<User>> {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .select('*')
          .eq('phone', phone)
          .single()
      );
    },

    async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseResponse<User>> {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .insert(userData)
          .select()
          .single()
      );
    },

    async update(userId: string, updates: Partial<User>): Promise<SupabaseResponse<User>> {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .update(updates)
          .eq('id', userId)
          .select()
          .single()
      );
    },
  },

  // Provider operations
  providers: {
    async findByEmail(email: string): Promise<SupabaseResponse<Provider>> {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select('*')
          .eq('email', email)
          .single()
      );
    },

    async findByPhone(phone: string): Promise<SupabaseResponse<Provider>> {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select('*')
          .eq('phone', phone)
          .single()
      );
    },

    async searchNearby(lat: number, lng: number, radiusKm: number = 10): Promise<SupabaseResponse<ProviderSearchResult[]>> {
      return handleSupabaseOperation(
        supabase.rpc('search_providers_nearby', {
          user_lat: lat,
          user_lng: lng,
          radius_km: radiusKm,
        })
      );
    },

    async getWithServices(providerId: string): Promise<SupabaseResponse<ProviderWithServices>> {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select(`
            *,
            services (
              *,
              category:service_categories (*)
            ),
            availability:provider_availability (*)
          `)
          .eq('id', providerId)
          .single()
      );
    },

    async updateRating(providerId: string): Promise<SupabaseResponse<Provider>> {
      // This is handled by trigger, but can be called manually if needed
      return handleSupabaseOperation(
        supabase.rpc('update_provider_rating', { provider_id: providerId })
      );
    },
  },

  // Service operations
  services: {
    async getByProvider(providerId: string, activeOnly: boolean = true): Promise<SupabaseResponse<Service[]>> {
      let query = supabase
        .from('services')
        .select(`
          *,
          category:service_categories (*)
        `)
        .eq('provider_id', providerId);

      if (activeOnly) {
        query = query.eq('active', true);
      }

      return handleSupabaseOperation(query);
    },

    async getByCategory(categoryId: string): Promise<SupabaseResponse<Service[]>> {
      return handleSupabaseOperation(
        supabase
          .from('services')
          .select(`
            *,
            provider:providers (
              id,
              business_name_ar,
              business_name_en,
              rating,
              total_reviews,
              latitude,
              longitude
            )
          `)
          .eq('category_id', categoryId)
          .eq('active', true)
      );
    },
  },

  // Booking operations
  bookings: {
    async checkAvailability(
      providerId: string,
      bookingDate: string,
      startTime: string,
      endTime: string
    ): Promise<SupabaseResponse<boolean>> {
      return handleSupabaseOperation(
        supabase.rpc('check_provider_availability', {
          p_provider_id: providerId,
          p_booking_date: bookingDate,
          p_start_time: startTime,
          p_end_time: endTime,
        })
      );
    },

    async create(bookingData: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'provider_fee' | 'platform_fee'>): Promise<SupabaseResponse<Booking>> {
      return handleSupabaseOperation(
        supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single()
      );
    },

    async getWithDetails(bookingId: string): Promise<SupabaseResponse<BookingWithDetails>> {
      return handleSupabaseOperation(
        supabase
          .from('bookings')
          .select(`
            *,
            user:users (*),
            provider:providers (*),
            service:services (*),
            review:reviews (*)
          `)
          .eq('id', bookingId)
          .single()
      );
    },

    async updateStatus(
      bookingId: string, 
      status: Database['public']['Enums']['booking_status']
    ): Promise<SupabaseResponse<Booking>> {
      return handleSupabaseOperation(
        supabase
          .from('bookings')
          .update({ status })
          .eq('id', bookingId)
          .select()
          .single()
      );
    },

    async getUserBookings(
      userId: string,
      options?: {
        status?: Database['public']['Enums']['booking_status'];
        limit?: number;
        offset?: number;
      }
    ): Promise<SupabaseResponse<BookingWithDetails[]>> {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          provider:providers (*),
          service:services (*),
          review:reviews (*)
        `)
        .eq('user_id', userId)
        .order('booking_date', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      return handleSupabaseOperation(query);
    },
  },

  // Review operations
  reviews: {
    async create(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<SupabaseResponse<Review>> {
      return handleSupabaseOperation(
        supabase
          .from('reviews')
          .insert(reviewData)
          .select()
          .single()
      );
    },

    async getProviderReviews(
      providerId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<SupabaseResponse<Review[]>> {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          user:users (name, phone),
          booking:bookings (
            service:services (name_ar, name_en)
          )
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      return handleSupabaseOperation(query);
    },
  },

  // Service category operations
  categories: {
    async getAll(): Promise<SupabaseResponse<ServiceCategory[]>> {
      return handleSupabaseOperation(
        supabase
          .from('service_categories')
          .select('*')
          .order('sort_order')
      );
    },
  },

  // Settlement operations
  settlements: {
    async generateMonthly(month: number, year: number): Promise<SupabaseResponse<void>> {
      return handleSupabaseOperation(
        supabase.rpc('generate_monthly_settlements', {
          target_month: month,
          target_year: year,
        })
      );
    },

    async getProviderSettlements(
      providerId: string,
      year?: number
    ): Promise<SupabaseResponse<any[]>> {
      let query = supabase
        .from('settlements')
        .select('*')
        .eq('provider_id', providerId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      return handleSupabaseOperation(query);
    },
  },
};

// Auth helper functions
export const auth = {
  async signUpUser(phone: string, name: string, email?: string): Promise<SupabaseResponse<User>> {
    // Create user in our users table
    return db.users.create({ phone, name, email: email || null, language: 'ar' });
  },

  async signUpProvider(providerData: {
    email: string;
    password: string;
    phone: string;
    business_name_ar: string;
    business_name_en: string;
    owner_name: string;
    latitude: number;
    longitude: number;
    address: any;
    license_number?: string;
  }): Promise<SupabaseResponse<{ provider: Provider; auth: any }>> {
    if (!supabaseAdmin) {
      return { 
        data: null, 
        error: new Error('Admin client not initialized. Service key required for provider signup.') 
      };
    }

    // First create auth user with auto-confirmed email in development
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: providerData.email,
      password: providerData.password,
      email_confirm: true, // Always confirm in admin mode
      user_metadata: {
        type: 'provider'
      }
    });

    if (authError) {
      return { data: null, error: new Error(authError.message) };
    }

    // Then create provider profile
    const { password, ...profileData } = providerData;
    const { data: provider, error: profileError } = await supabaseAdmin
      .from('providers')
      .insert({
        ...profileData,
        id: authData.user.id,
        password_hash: 'handled_by_supabase_auth',
      })
      .select()
      .single();

    if (profileError) {
      // Rollback auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (rollbackError) {
        // Critical: Log orphaned auth user for manual cleanup
        console.error('CRITICAL: Failed to rollback auth user after profile creation failure', {
          userId: authData.user.id,
          profileError: profileError.message,
          rollbackError: rollbackError
        });
        // Return both errors
        return { 
          data: null, 
          error: new Error(`Profile creation failed: ${profileError.message}. Rollback also failed - manual cleanup required for user ${authData.user.id}`) 
        };
      }
      return { data: null, error: new Error(profileError.message) };
    }

    return { 
      data: { provider, auth: authData }, 
      error: null 
    };
  },

  async signInProvider(email: string, password: string): Promise<SupabaseResponse<{ provider: Provider; session: any }>> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { data: null, error: new Error(authError.message) };
    }

    const { data: provider, error: profileError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      return { data: null, error: new Error(profileError.message) };
    }

    return { 
      data: { provider, session: authData.session }, 
      error: null 
    };
  },

  async signOut(): Promise<SupabaseResponse<void>> {
    const { error } = await supabase.auth.signOut();
    return { data: null, error: error ? new Error(error.message) : null };
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  async getUser() {
    return supabase.auth.getUser();
  },
};