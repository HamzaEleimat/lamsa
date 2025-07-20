// Two-Phase Authentication Type Definitions for Lamsa

import { Request, Response, NextFunction } from 'express';

export enum AuthState {
  IDENTITY_VERIFICATION = 'identity_verification',
  ACCOUNT_COMPLETION = 'account_completion', 
  ACTIVE_SESSION = 'active_session'
}

export enum UserType {
  CUSTOMER = 'customer',
  PROVIDER = 'provider'
}

export enum TokenType {
  VERIFICATION = 'verification',
  TEMPORARY = 'temporary',
  ACCESS = 'access',
  REFRESH = 'refresh'
}

export enum AuthAction {
  REQUEST_VERIFICATION = 'request_verification',
  VERIFY_IDENTITY = 'verify_identity',
  COMPLETE_SIGNUP = 'complete_signup',
  COMPLETE_LOGIN = 'complete_login',
  REFRESH_TOKEN = 'refresh_token',
  LOGOUT = 'logout'
}

export enum AuthResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  BLOCKED = 'blocked',
  RATE_LIMITED = 'rate_limited'
}

// Request/Response Interfaces

export interface VerificationRequest {
  phone: string;
}

export interface VerificationResponse {
  success: boolean;
  data?: {
    verificationId: string;
    expiresAt: string;
    attemptsRemaining: number;
  };
  error?: AuthError;
}

export interface IdentityVerificationRequest {
  verificationId: string;
  otp: string;
}

export interface IdentityVerificationResponse {
  success: boolean;
  data?: {
    tempToken: string;
    isNewUser: boolean;
    userType: UserType;
    expiresAt: string;
  };
  error?: AuthError;
}

export interface CustomerSignupRequest {
  tempToken: string;
  name: string;
  language?: 'ar' | 'en';
  preferences?: CustomerPreferences;
}

export interface ProviderSignupRequest {
  tempToken: string;
  businessProfile: ProviderBusinessProfile;
}

export interface AccountCompletionResponse {
  success: boolean;
  data?: {
    user?: CustomerAccount;
    provider?: ProviderAccount;
    token: string;
    refreshToken: string;
    expiresAt: string;
  };
  error?: AuthError;
}

export interface LoginCompletionRequest {
  tempToken: string;
}

// User Profile Interfaces

export interface CustomerPreferences {
  notifications: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
  language: 'ar' | 'en';
  currency: 'JOD';
}

export interface ProviderBusinessProfile {
  business_name_ar: string;
  business_name_en: string;
  owner_name: string;
  latitude: number;
  longitude: number;
  address: {
    street: string;
    city: string;
    district: string;
    country: string;
  };
  license_number?: string;
  services: string[];
  working_hours: WorkingHours;
  description_ar?: string;
  description_en?: string;
}

export interface WorkingHours {
  [key: string]: {
    open: string;
    close: string;
    is_closed: boolean;
  };
}

// Account Interfaces

export interface CustomerAccount {
  id: string;
  phone: string;
  name: string;
  email?: string;
  language: 'ar' | 'en';
  preferences: CustomerPreferences;
  verified: boolean;
  created_at: string;
  last_login: string;
}

export interface ProviderAccount {
  id: string;
  phone: string;
  business_name_ar: string;
  business_name_en: string;
  owner_name: string;
  email?: string;
  latitude: number;
  longitude: number;
  address: any;
  license_number?: string;
  verified: boolean;
  status: 'active' | 'pending' | 'suspended';
  rating?: number;
  total_reviews?: number;
  created_at: string;
  last_login: string;
}

// Session Management Interfaces

export interface VerificationSession {
  id: string;
  phone: string;
  verification_code: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  expires_at: string;
  verified_at?: string;
  ip_address: string;
  user_agent: string;
}

export interface TempSession {
  id: string;
  phone: string;
  token_hash: string;
  is_new_user: boolean;
  user_type: UserType;
  created_at: string;
  expires_at: string;
  used_at?: string;
  ip_address: string;
  fingerprint_hash: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  user_type: UserType;
  token_hash: string;
  refresh_token_hash: string;
  expires_at: string;
  refresh_expires_at: string;
  created_at: string;
  last_used: string;
  ip_address: string;
  user_agent: string;
  fingerprint_hash: string;
  is_active: boolean;
}

// Security Interfaces

export interface DeviceFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
  hash: string;
}

export interface SecurityContext {
  ip_address: string;
  user_agent: string;
  fingerprint: DeviceFingerprint;
  risk_score: number;
  is_suspicious: boolean;
  country_code?: string;
  city?: string;
}

export interface RateLimitCounter {
  id: string;
  key_type: 'phone' | 'ip' | 'fingerprint' | 'user_id';
  key_value: string;
  counter: number;
  window_start: string;
  expires_at: string;
}

// Error Handling

export interface AuthError {
  code: string;
  message: string;
  messageAr?: string;
  details?: any;
  retryAfter?: number;
  supportedActions?: string[];
}

export enum AuthErrorCode {
  // Validation Errors
  INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT',
  INVALID_OTP_FORMAT = 'INVALID_OTP_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Rate Limiting Errors
  TOO_MANY_OTP_REQUESTS = 'TOO_MANY_OTP_REQUESTS',
  TOO_MANY_VERIFICATION_ATTEMPTS = 'TOO_MANY_VERIFICATION_ATTEMPTS',
  IP_RATE_LIMITED = 'IP_RATE_LIMITED',
  PROGRESSIVE_PENALTY = 'PROGRESSIVE_PENALTY',
  
  // Verification Errors
  INVALID_OTP = 'INVALID_OTP',
  EXPIRED_OTP = 'EXPIRED_OTP',
  VERIFICATION_SESSION_NOT_FOUND = 'VERIFICATION_SESSION_NOT_FOUND',
  PHONE_NOT_VERIFIED = 'PHONE_NOT_VERIFIED',
  
  // Session Errors
  INVALID_VERIFICATION_ID = 'INVALID_VERIFICATION_ID',
  EXPIRED_TEMP_TOKEN = 'EXPIRED_TEMP_TOKEN',
  TEMP_SESSION_NOT_FOUND = 'TEMP_SESSION_NOT_FOUND',
  SESSION_ALREADY_USED = 'SESSION_ALREADY_USED',
  
  // Account Errors
  PHONE_ALREADY_REGISTERED = 'PHONE_ALREADY_REGISTERED',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  INCOMPLETE_PROFILE = 'INCOMPLETE_PROFILE',
  
  // Security Errors
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DEVICE_BLOCKED = 'DEVICE_BLOCKED',
  GEOGRAPHIC_ANOMALY = 'GEOGRAPHIC_ANOMALY',
  CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID',
  
  // System Errors
  SMS_DELIVERY_FAILED = 'SMS_DELIVERY_FAILED',
  SMS_PROVIDER_ERROR = 'SMS_PROVIDER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

// Audit Logging

export interface AuthAuditLog {
  id: string;
  user_id?: string;
  phone?: string;
  action: AuthAction;
  result: AuthResult;
  ip_address: string;
  user_agent: string;
  risk_score: number;
  details: Record<string, any>;
  created_at: string;
}

// JWT Token Payloads

export interface VerificationTokenPayload {
  type: TokenType.VERIFICATION;
  verificationId: string;
  phone: string;
  iat: number;
  exp: number;
}

export interface TempTokenPayload {
  type: TokenType.TEMPORARY;
  sessionId: string;
  phone: string;
  isNewUser: boolean;
  userType: UserType;
  iat: number;
  exp: number;
}

export interface AccessTokenPayload {
  type: TokenType.ACCESS;
  userId: string;
  userType: UserType;
  phone?: string;
  email?: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  type: TokenType.REFRESH;
  userId: string;
  userType: UserType;
  sessionId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

// Configuration Interfaces

export interface AuthConfig {
  otp: {
    length: number;
    expiry_minutes: number;
    max_attempts: number;
  };
  tokens: {
    temp_token_expiry_minutes: number;
    access_token_expiry_days: number;
    refresh_token_expiry_days: number;
  };
  rate_limits: {
    otp_per_phone: { requests: number; window_minutes: number };
    otp_per_ip: { requests: number; window_minutes: number };
    verification_per_session: { attempts: number; block_hours: number };
    signup_per_ip: { requests: number; window_hours: number };
  };
  security: {
    enable_csrf: boolean;
    enable_fingerprinting: boolean;
    enable_geographic_validation: boolean;
    risk_score_threshold: number;
  };
}

// Utility Types

export type AuthMiddlewareRequest = {
  user?: {
    id: string;
    type: UserType;
    phone?: string;
    email?: string;
    sessionId: string;
  };
  security?: SecurityContext;
  csrfToken?: string;
} & Request;

export type AuthControllerMethod = (
  req: AuthMiddlewareRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Response wrapper type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AuthError;
  meta?: {
    timestamp: string;
    requestId: string;
    rateLimit?: {
      remaining: number;
      resetTime: string;
    };
  };
}
