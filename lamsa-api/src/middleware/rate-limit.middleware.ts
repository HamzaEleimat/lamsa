import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { getBilingualErrorMessage } from '../utils/error-messages';
import { getLanguageFromRequest, RequestWithLanguage } from './language-detection.middleware';

// Extended request interface for rate limiting
interface RateLimitRequest extends RequestWithLanguage {
  rateLimit?: {
    resetTime?: number;
    remaining?: number;
    used?: number;
    limit?: number;
  };
}

// OTP rate limiter - prevent SMS bombing attacks
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each phone number to 3 OTP requests per windowMs
  message: (req: RateLimitRequest) => {
    const language = getLanguageFromRequest(req);
    const bilingualMessage = getBilingualErrorMessage('TOO_MANY_OTP_REQUESTS');
    
    return {
      success: false,
      error: 'TOO_MANY_OTP_REQUESTS',
      message: bilingualMessage.en,
      messageAr: bilingualMessage.ar,
      data: {
        errorCode: 429,
        category: 'rate_limit',
        timestamp: new Date().toISOString(),
        language,
        rateLimit: {
          limit: 3,
          windowMs: 15 * 60 * 1000,
          retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now()) / 1000)
        }
      }
    };
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    // Rate limit by phone number
    const phone = req.body.phone || req.params.phone || 'unknown';
    return phone;
  },
  // Security: Rate limiting always enabled (removed development bypass)
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: (req: RateLimitRequest) => {
    const language = getLanguageFromRequest(req);
    const bilingualMessage = getBilingualErrorMessage('TOO_MANY_REQUESTS');
    
    return {
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: bilingualMessage.en,
      messageAr: bilingualMessage.ar,
      data: {
        errorCode: 429,
        category: 'rate_limit',
        timestamp: new Date().toISOString(),
        language,
        rateLimit: {
          limit: 100,
          windowMs: 15 * 60 * 1000,
          retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now()) / 1000)
        }
      }
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints rate limiter (login/signup)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: (req: RateLimitRequest) => {
    const language = getLanguageFromRequest(req);
    const bilingualMessage = getBilingualErrorMessage('TOO_MANY_AUTH_ATTEMPTS');
    
    return {
      success: false,
      error: 'TOO_MANY_AUTH_ATTEMPTS',
      message: bilingualMessage.en,
      messageAr: bilingualMessage.ar,
      data: {
        errorCode: 429,
        category: 'rate_limit',
        timestamp: new Date().toISOString(),
        language,
        rateLimit: {
          limit: 10,
          windowMs: 15 * 60 * 1000,
          retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now()) / 1000)
        }
      }
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Provider search rate limiter
export const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: (req: RateLimitRequest) => {
    const language = getLanguageFromRequest(req);
    const bilingualMessage = getBilingualErrorMessage('TOO_MANY_SEARCH_REQUESTS');
    
    return {
      success: false,
      error: 'TOO_MANY_SEARCH_REQUESTS',
      message: bilingualMessage.en,
      messageAr: bilingualMessage.ar,
      data: {
        errorCode: 429,
        category: 'rate_limit',
        timestamp: new Date().toISOString(),
        language,
        rateLimit: {
          limit: 30,
          windowMs: 1 * 60 * 1000,
          retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now()) / 1000)
        }
      }
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verification rate limiter - prevent brute force OTP attacks
export const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each phone number to 5 OTP verification attempts per windowMs
  message: (req: RateLimitRequest) => {
    const language = getLanguageFromRequest(req);
    const bilingualMessage = getBilingualErrorMessage('TOO_MANY_OTP_ATTEMPTS');
    
    return {
      success: false,
      error: 'TOO_MANY_OTP_ATTEMPTS',
      message: bilingualMessage.en,
      messageAr: bilingualMessage.ar,
      data: {
        errorCode: 429,
        category: 'rate_limit',
        timestamp: new Date().toISOString(),
        language,
        rateLimit: {
          limit: 5,
          windowMs: 15 * 60 * 1000,
          retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now()) / 1000)
        }
      }
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by phone number to prevent brute force per phone
    const phone = req.body.phone || req.params.phone || 'unknown';
    return `otp_verify:${phone}`;
  },
  skipSuccessfulRequests: true, // Only count failed verification attempts
  // Security: Rate limiting always enabled (removed development bypass)
});
