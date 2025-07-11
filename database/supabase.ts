import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Database Types
export interface User {
  id: string
  phone: string
  name?: string
  email?: string
  avatar_url?: string
  preferred_language: 'ar' | 'en'
  notification_preferences: {
    sms: boolean
    push: boolean
    email: boolean
  }
  created_at: string
  updated_at: string
}

export interface Provider {
  id: string
  business_name: string
  business_name_ar?: string
  phone: string
  email?: string
  password_hash?: string
  avatar_url?: string
  cover_image_url?: string
  bio?: string
  bio_ar?: string
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  address?: string
  address_ar?: string
  city?: string
  rating: number
  total_reviews: number
  is_mobile: boolean
  travel_radius_km: number
  verified: boolean
  active: boolean
  google_maps_url?: string
  business_hours: Array<{
    day: string
    open: string
    close: string
    is_closed: boolean
  }>
  social_media: {
    instagram?: string
    facebook?: string
    tiktok?: string
  }
  created_at: string
  updated_at: string
}

export interface ServiceCategory {
  id: string
  name_en: string
  name_ar: string
  icon?: string
  display_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  provider_id: string
  category_id: string
  name_en: string
  name_ar: string
  description_en?: string
  description_ar?: string
  price: number
  duration_minutes: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ProviderAvailability {
  id: string
  provider_id: string
  day_of_week: number // 0-6 (Sunday-Saturday)
  start_time: string // HH:MM:SS
  end_time: string // HH:MM:SS
  is_available: boolean
  created_at: string
  updated_at: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type PaymentMethod = 'cash' | 'card' | 'wallet'

export interface Booking {
  id: string
  user_id: string
  provider_id: string
  service_id: string
  booking_date: string // YYYY-MM-DD
  start_time: string // HH:MM:SS
  end_time: string // HH:MM:SS
  status: BookingStatus
  total_price: number
  platform_fee: number
  provider_earnings: number
  payment_method?: PaymentMethod
  payment_status: string
  user_notes?: string
  provider_notes?: string
  cancellation_reason?: string
  cancelled_by?: string
  cancelled_at?: string
  completed_at?: string
  location_type: 'salon' | 'home'
  user_location?: {
    type: 'Point'
    coordinates: [number, number]
  }
  user_address?: string
  created_at: string
  updated_at: string
}

// Database type mappings
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
      }
      providers: {
        Row: Provider
        Insert: Omit<Provider, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews'> & {
          id?: string
          created_at?: string
          updated_at?: string
          rating?: number
          total_reviews?: number
        }
        Update: Partial<Omit<Provider, 'id' | 'created_at' | 'updated_at'>>
      }
      service_categories: {
        Row: ServiceCategory
        Insert: Omit<ServiceCategory, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<ServiceCategory, 'id' | 'created_at' | 'updated_at'>>
      }
      services: {
        Row: Service
        Insert: Omit<Service, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Service, 'id' | 'created_at' | 'updated_at'>>
      }
      provider_availability: {
        Row: ProviderAvailability
        Insert: Omit<ProviderAvailability, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<ProviderAvailability, 'id' | 'created_at' | 'updated_at'>>
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'platform_fee' | 'provider_earnings'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Booking, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client initialization
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper types
export interface AuthResponse {
  success: boolean
  data?: any
  error?: string
}

// Helper functions
export const auth = {
  // Create user with phone
  async createUserWithPhone(phone: string, name?: string): Promise<AuthResponse> {
    try {
      // First, sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        phone,
        options: {
          data: {
            name,
            role: 'user'
          }
        }
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      // Create user profile
      if (authData.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            phone,
            name,
            preferred_language: 'ar',
            notification_preferences: {
              sms: true,
              push: true,
              email: false
            }
          })
          .select()
          .single()

        if (userError) {
          return { success: false, error: userError.message }
        }

        return { success: true, data: { auth: authData, user: userData } }
      }

      return { success: false, error: 'Failed to create user' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Create provider with email
  async createProviderWithEmail(
    email: string, 
    password: string, 
    providerData: {
      business_name: string
      business_name_ar?: string
      phone: string
      location: [number, number]
      address?: string
      city?: string
    }
  ): Promise<AuthResponse> {
    try {
      // Sign up provider with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'provider',
            business_name: providerData.business_name
          }
        }
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      // Create provider profile
      if (authData.user) {
        const { data: provider, error: providerError } = await supabase
          .from('providers')
          .insert({
            id: authData.user.id,
            email,
            business_name: providerData.business_name,
            business_name_ar: providerData.business_name_ar,
            phone: providerData.phone,
            location: {
              type: 'Point',
              coordinates: providerData.location
            },
            address: providerData.address,
            city: providerData.city,
            is_mobile: false,
            travel_radius_km: 5,
            verified: false,
            active: true,
            rating: 0,
            total_reviews: 0,
            business_hours: [],
            social_media: {}
          })
          .select()
          .single()

        if (providerError) {
          return { success: false, error: providerError.message }
        }

        return { success: true, data: { auth: authData, provider } }
      }

      return { success: false, error: 'Failed to create provider' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Verify OTP
  async verifyOTP(phone: string, token: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms'
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Get user by ID
  async getUserById(userId: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Get provider by ID
  async getProviderById(providerId: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', providerId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Sign in with phone
  async signInWithPhone(phone: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: false
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Sign in provider with email
  async signInProviderWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Sign out
  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Get current session
  async getSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Export typed client
export type TypedSupabaseClient = SupabaseClient<Database>