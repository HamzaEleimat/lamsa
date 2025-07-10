// Database schema types for Beauty Booking Marketplace

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PaymentMethod = 'cash' | 'card' | 'online';
export type SettlementStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type LanguageCode = 'ar' | 'en';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          name: string;
          email: string | null;
          language: LanguageCode;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          name: string;
          email?: string | null;
          language?: LanguageCode;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          name?: string;
          email?: string | null;
          language?: LanguageCode;
          created_at?: string;
          updated_at?: string;
        };
      };
      providers: {
        Row: {
          id: string;
          business_name_ar: string;
          business_name_en: string;
          owner_name: string;
          phone: string;
          email: string;
          password_hash: string;
          latitude: number;
          longitude: number;
          address: Json;
          verified: boolean;
          license_number: string | null;
          license_image_url: string | null;
          rating: number;
          total_reviews: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name_ar: string;
          business_name_en: string;
          owner_name: string;
          phone: string;
          email: string;
          password_hash: string;
          latitude: number;
          longitude: number;
          address?: Json;
          verified?: boolean;
          license_number?: string | null;
          license_image_url?: string | null;
          rating?: number;
          total_reviews?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name_ar?: string;
          business_name_en?: string;
          owner_name?: string;
          phone?: string;
          email?: string;
          password_hash?: string;
          latitude?: number;
          longitude?: number;
          address?: Json;
          verified?: boolean;
          license_number?: string | null;
          license_image_url?: string | null;
          rating?: number;
          total_reviews?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_categories: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          icon: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name_ar: string;
          name_en: string;
          icon?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          icon?: string | null;
          sort_order?: number;
        };
      };
      services: {
        Row: {
          id: string;
          provider_id: string;
          category_id: string;
          name_ar: string;
          name_en: string;
          description_ar: string | null;
          description_en: string | null;
          price: number;
          duration_minutes: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          category_id: string;
          name_ar: string;
          name_en: string;
          description_ar?: string | null;
          description_en?: string | null;
          price: number;
          duration_minutes: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          category_id?: string;
          name_ar?: string;
          name_en?: string;
          description_ar?: string | null;
          description_en?: string | null;
          price?: number;
          duration_minutes?: number;
          active?: boolean;
          created_at?: string;
        };
      };
      provider_availability: {
        Row: {
          id: string;
          provider_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available: boolean;
        };
        Insert: {
          id?: string;
          provider_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available?: boolean;
        };
        Update: {
          id?: string;
          provider_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
        };
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          provider_id: string;
          service_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          status: BookingStatus;
          payment_method: PaymentMethod | null;
          amount: number;
          provider_fee: number;
          platform_fee: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider_id: string;
          service_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          status?: BookingStatus;
          payment_method?: PaymentMethod | null;
          amount: number;
          provider_fee?: number;
          platform_fee?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider_id?: string;
          service_id?: string;
          booking_date?: string;
          start_time?: string;
          end_time?: string;
          status?: BookingStatus;
          payment_method?: PaymentMethod | null;
          amount?: number;
          provider_fee?: number;
          platform_fee?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          user_id: string;
          provider_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          user_id: string;
          provider_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          user_id?: string;
          provider_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      settlements: {
        Row: {
          id: string;
          provider_id: string;
          month: number;
          year: number;
          total_bookings: number;
          total_amount: number;
          total_fees: number;
          fee_rate: number;
          settlement_status: SettlementStatus;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id: string;
          month: number;
          year: number;
          total_bookings?: number;
          total_amount?: number;
          total_fees?: number;
          fee_rate: number;
          settlement_status?: SettlementStatus;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          provider_id?: string;
          month?: number;
          year?: number;
          total_bookings?: number;
          total_amount?: number;
          total_fees?: number;
          fee_rate?: number;
          settlement_status?: SettlementStatus;
          paid_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_providers_nearby: {
        Args: {
          user_lat: number;
          user_lng: number;
          radius_km?: number;
        };
        Returns: {
          id: string;
          business_name_ar: string;
          business_name_en: string;
          rating: number;
          total_reviews: number;
          distance_km: number;
        }[];
      };
      check_provider_availability: {
        Args: {
          p_provider_id: string;
          p_booking_date: string;
          p_start_time: string;
          p_end_time: string;
        };
        Returns: boolean;
      };
      generate_monthly_settlements: {
        Args: {
          target_month: number;
          target_year: number;
        };
        Returns: void;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      payment_method: PaymentMethod;
      settlement_status: SettlementStatus;
      language_code: LanguageCode;
    };
  };
}

// Helper types for common use cases
export type User = Database['public']['Tables']['users']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type ServiceCategory = Database['public']['Tables']['service_categories']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type ProviderAvailability = Database['public']['Tables']['provider_availability']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Settlement = Database['public']['Tables']['settlements']['Row'];

// Extended types with relations
export interface ServiceWithCategory extends Service {
  category?: ServiceCategory;
}

export interface ServiceWithProvider extends Service {
  provider?: Provider;
  category?: ServiceCategory;
}

export interface BookingWithDetails extends Booking {
  user?: User;
  provider?: Provider;
  service?: Service;
  review?: Review;
}

export interface ProviderWithServices extends Provider {
  services?: ServiceWithCategory[];
  availability?: ProviderAvailability[];
}

export interface ReviewWithDetails extends Review {
  user?: User;
  provider?: Provider;
  booking?: Booking;
}

// Address structure
export interface Address {
  street?: string;
  city?: string;
  district?: string;
  country?: string;
}

// Provider search result
export interface ProviderSearchResult {
  id: string;
  business_name_ar: string;
  business_name_en: string;
  rating: number;
  total_reviews: number;
  distance_km: number;
}