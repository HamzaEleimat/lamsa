// Supabase Auth Types
export interface AuthResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface SessionResponse {
  success: boolean;
  session: Session | null;
  error: string | null;
}

export interface UserResponse {
  success: boolean;
  user: User | null;
  error: string | null;
}

// Re-export Supabase types
export type { Session, User, AuthError } from '@supabase/supabase-js';

// App-specific types
export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  avatar_url?: string;
  language: 'ar' | 'en';
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  id: string;
  business_name_ar: string;
  business_name_en: string;
  owner_name: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  address: {
    street: string;
    city: string;
    district: string;
    country: string;
  };
  verified: boolean;
  active: boolean;
  rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

// OTP specific types
export interface SendOTPRequest {
  phone: string;
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface OTPResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Database operation types
export interface DatabaseResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// Error handling types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}