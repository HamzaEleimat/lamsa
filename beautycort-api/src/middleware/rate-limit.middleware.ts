import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// OTP rate limiter - prevent SMS bombing attacks
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each phone number to 3 OTP requests per windowMs
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    // Rate limit by phone number
    const phone = req.body.phone || req.params.phone || 'unknown';
    return phone;
  },
  skip: (_req: Request) => {
    // Skip rate limiting in development for testing
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  },
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints rate limiter (login/signup)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Provider search rate limiter
export const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: {
    success: false,
    error: 'Too many search requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
