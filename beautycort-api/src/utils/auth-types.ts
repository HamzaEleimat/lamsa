/**
 * Authentication types and error handling for phone auth
 */

export interface PhoneAuthResult<T = any> {
  success: boolean;
  data?: T;
  error?: PhoneAuthError;
}

export interface PhoneAuthError {
  code: PhoneAuthErrorCode;
  message: string;
  status?: number;
  originalError?: any;
}

export enum PhoneAuthErrorCode {
  // Rate limiting errors
  SMS_SEND_RATE_LIMIT = 'sms_send_rate_limit_exceeded',
  OTP_DISABLED = 'otp_disabled',
  
  // Validation errors
  INVALID_PHONE_NUMBER = 'invalid_phone_number',
  INVALID_OTP = 'invalid_otp',
  EXPIRED_OTP = 'expired_token',
  
  // Provider errors
  SMS_PROVIDER_ERROR = 'sms_provider_error',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  
  // Security errors
  PHONE_NOT_VERIFIED = 'phone_not_confirmed',
  TOO_MANY_ATTEMPTS = 'too_many_requests',
  CAPTCHA_REQUIRED = 'captcha_required',
  
  // Configuration errors
  SMS_PROVIDER_NOT_CONFIGURED = 'sms_provider_not_configured',
  
  // User errors
  USER_ALREADY_EXISTS = 'user_already_exists',
  USER_NOT_FOUND = 'user_not_found',
  
  // Generic errors
  UNKNOWN_ERROR = 'unknown_error',
  NETWORK_ERROR = 'network_error',
  INTERNAL_ERROR = 'internal_error'
}

export interface OtpConfig {
  phone: string;
  channel?: 'sms' | 'whatsapp';
  captchaToken?: string;
}

export interface VerifyOtpConfig {
  phone: string;
  token: string;
  type?: 'sms' | 'phone_change';
  captchaToken?: string;
}

export interface PhoneAuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    phone?: string | null;
    phone_confirmed_at?: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface OtpResponse {
  messageId?: string | null;
  user?: any;
  session?: any;
}

/**
 * Map Supabase auth errors to our error codes
 */
export function mapSupabaseError(error: any): PhoneAuthError {
  if (!error) {
    return {
      code: PhoneAuthErrorCode.UNKNOWN_ERROR,
      message: 'An unknown error occurred'
    };
  }

  const message = error.message || error.msg || 'Unknown error';
  const status = error.status || error.code || 500;

  // Map common Supabase error messages to our error codes
  const errorMappings: Record<string, PhoneAuthErrorCode> = {
    'SMS rate limit exceeded': PhoneAuthErrorCode.SMS_SEND_RATE_LIMIT,
    'rate limit exceeded': PhoneAuthErrorCode.SMS_SEND_RATE_LIMIT,
    'Phone Auth is disabled': PhoneAuthErrorCode.OTP_DISABLED,
    'Invalid phone number': PhoneAuthErrorCode.INVALID_PHONE_NUMBER,
    'Token has expired or is invalid': PhoneAuthErrorCode.EXPIRED_OTP,
    'Invalid token': PhoneAuthErrorCode.INVALID_OTP,
    'Invalid verification code': PhoneAuthErrorCode.INVALID_OTP,
    'Phone not confirmed': PhoneAuthErrorCode.PHONE_NOT_VERIFIED,
    'Too many requests': PhoneAuthErrorCode.TOO_MANY_ATTEMPTS,
    'Captcha verification required': PhoneAuthErrorCode.CAPTCHA_REQUIRED,
    'SMS provider error': PhoneAuthErrorCode.SMS_PROVIDER_ERROR,
    'User already registered': PhoneAuthErrorCode.USER_ALREADY_EXISTS,
    'User not found': PhoneAuthErrorCode.USER_NOT_FOUND
  };

  // Find matching error code
  let errorCode = PhoneAuthErrorCode.UNKNOWN_ERROR;
  for (const [pattern, code] of Object.entries(errorMappings)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      errorCode = code;
      break;
    }
  }

  // Special handling for network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    errorCode = PhoneAuthErrorCode.NETWORK_ERROR;
  }

  // Check for provider configuration issues
  if (message.includes('provider') && message.includes('configured')) {
    errorCode = PhoneAuthErrorCode.SMS_PROVIDER_NOT_CONFIGURED;
  }

  return {
    code: errorCode,
    message: message,
    status: status,
    originalError: error
  };
}

/**
 * Get user-friendly error message based on error code
 */
export function getErrorMessage(error: PhoneAuthError, language: 'en' | 'ar' = 'en'): string {
  const messages = {
    en: {
      [PhoneAuthErrorCode.SMS_SEND_RATE_LIMIT]: 'Too many SMS requests. Please wait a minute before trying again.',
      [PhoneAuthErrorCode.OTP_DISABLED]: 'Phone authentication is currently disabled. Please contact support.',
      [PhoneAuthErrorCode.INVALID_PHONE_NUMBER]: 'Please enter a valid Jordanian mobile number.',
      [PhoneAuthErrorCode.INVALID_OTP]: 'Invalid verification code. Please check and try again.',
      [PhoneAuthErrorCode.EXPIRED_OTP]: 'Verification code has expired. Please request a new one.',
      [PhoneAuthErrorCode.SMS_PROVIDER_ERROR]: 'Unable to send SMS. Please try again later.',
      [PhoneAuthErrorCode.INSUFFICIENT_FUNDS]: 'SMS service temporarily unavailable. Please contact support.',
      [PhoneAuthErrorCode.PHONE_NOT_VERIFIED]: 'Phone number not verified. Please complete verification first.',
      [PhoneAuthErrorCode.TOO_MANY_ATTEMPTS]: 'Too many attempts. Please wait before trying again.',
      [PhoneAuthErrorCode.CAPTCHA_REQUIRED]: 'Please complete the CAPTCHA verification.',
      [PhoneAuthErrorCode.SMS_PROVIDER_NOT_CONFIGURED]: 'SMS service not configured. Please contact support.',
      [PhoneAuthErrorCode.USER_ALREADY_EXISTS]: 'An account with this phone number already exists.',
      [PhoneAuthErrorCode.USER_NOT_FOUND]: 'No account found with this phone number.',
      [PhoneAuthErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
      [PhoneAuthErrorCode.INTERNAL_ERROR]: 'An internal error occurred. Please try again later.',
      [PhoneAuthErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
    },
    ar: {
      [PhoneAuthErrorCode.SMS_SEND_RATE_LIMIT]: 'طلبات كثيرة جداً. يرجى الانتظار دقيقة قبل المحاولة مرة أخرى.',
      [PhoneAuthErrorCode.OTP_DISABLED]: 'المصادقة عبر الهاتف معطلة حالياً. يرجى الاتصال بالدعم.',
      [PhoneAuthErrorCode.INVALID_PHONE_NUMBER]: 'يرجى إدخال رقم هاتف أردني صحيح.',
      [PhoneAuthErrorCode.INVALID_OTP]: 'رمز التحقق غير صحيح. يرجى التحقق والمحاولة مرة أخرى.',
      [PhoneAuthErrorCode.EXPIRED_OTP]: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
      [PhoneAuthErrorCode.SMS_PROVIDER_ERROR]: 'تعذر إرسال الرسالة النصية. يرجى المحاولة لاحقاً.',
      [PhoneAuthErrorCode.INSUFFICIENT_FUNDS]: 'خدمة الرسائل النصية غير متاحة مؤقتاً. يرجى الاتصال بالدعم.',
      [PhoneAuthErrorCode.PHONE_NOT_VERIFIED]: 'رقم الهاتف غير مؤكد. يرجى إكمال التحقق أولاً.',
      [PhoneAuthErrorCode.TOO_MANY_ATTEMPTS]: 'محاولات كثيرة جداً. يرجى الانتظار قبل المحاولة مرة أخرى.',
      [PhoneAuthErrorCode.CAPTCHA_REQUIRED]: 'يرجى إكمال التحقق من CAPTCHA.',
      [PhoneAuthErrorCode.SMS_PROVIDER_NOT_CONFIGURED]: 'خدمة الرسائل النصية غير مكونة. يرجى الاتصال بالدعم.',
      [PhoneAuthErrorCode.USER_ALREADY_EXISTS]: 'يوجد حساب مسجل بهذا الرقم بالفعل.',
      [PhoneAuthErrorCode.USER_NOT_FOUND]: 'لا يوجد حساب مسجل بهذا الرقم.',
      [PhoneAuthErrorCode.NETWORK_ERROR]: 'خطأ في الشبكة. يرجى التحقق من الاتصال والمحاولة مرة أخرى.',
      [PhoneAuthErrorCode.INTERNAL_ERROR]: 'حدث خطأ داخلي. يرجى المحاولة لاحقاً.',
      [PhoneAuthErrorCode.UNKNOWN_ERROR]: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
    }
  };

  return messages[language][error.code] || messages[language][PhoneAuthErrorCode.UNKNOWN_ERROR];
}

/**
 * OTP attempt tracking for security
 */
export interface OtpAttempt {
  phone: string;
  attempts: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  blockedUntil?: Date;
}

export class OtpAttemptTracker {
  private attempts: Map<string, OtpAttempt> = new Map();
  private readonly MAX_ATTEMPTS = 3;
  private readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Periodically clean up old attempts
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
  }

  recordAttempt(phone: string): { allowed: boolean; remainingAttempts: number; blockedUntil?: Date } {
    const now = new Date();
    const attempt = this.attempts.get(phone);

    if (attempt) {
      // Check if currently blocked
      if (attempt.blockedUntil && attempt.blockedUntil > now) {
        return {
          allowed: false,
          remainingAttempts: 0,
          blockedUntil: attempt.blockedUntil
        };
      }

      // Reset if last attempt was more than 1 hour ago
      if (now.getTime() - attempt.lastAttemptAt.getTime() > 3600000) {
        this.attempts.delete(phone);
        return this.recordAttempt(phone);
      }

      // Increment attempts
      attempt.attempts++;
      attempt.lastAttemptAt = now;

      if (attempt.attempts >= this.MAX_ATTEMPTS) {
        attempt.blockedUntil = new Date(now.getTime() + this.BLOCK_DURATION_MS);
        this.attempts.set(phone, attempt);
        
        return {
          allowed: false,
          remainingAttempts: 0,
          blockedUntil: attempt.blockedUntil
        };
      }

      this.attempts.set(phone, attempt);
      return {
        allowed: true,
        remainingAttempts: this.MAX_ATTEMPTS - attempt.attempts
      };
    } else {
      // First attempt
      this.attempts.set(phone, {
        phone,
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now
      });

      return {
        allowed: true,
        remainingAttempts: this.MAX_ATTEMPTS - 1
      };
    }
  }

  resetAttempts(phone: string): void {
    this.attempts.delete(phone);
  }

  private cleanup(): void {
    const now = new Date();
    for (const [phone, attempt] of this.attempts.entries()) {
      // Remove entries older than 24 hours
      if (now.getTime() - attempt.lastAttemptAt.getTime() > 86400000) {
        this.attempts.delete(phone);
      }
    }
  }
}
