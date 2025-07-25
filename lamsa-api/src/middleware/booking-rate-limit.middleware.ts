/**
 * Booking Rate Limiting Middleware
 * Specialized rate limiting for booking operations to prevent abuse
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';

/**
 * Rate limiter for booking creation
 * Stricter limits to prevent booking spam
 */
export const bookingCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each user to 5 booking attempts per window
  keyGenerator: (req: AuthRequest) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.id || req.ip || 'anonymous';
  },
  message: {
    success: false,
    error: 'Too many booking attempts. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Booking creation rate limit exceeded`, {
      userId: (req as AuthRequest).user?.id || 'anonymous',
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      error: 'Too many booking attempts. Please try again in 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Rate limiter for booking cancellations
 * Prevent excessive cancellation abuse
 */
export const bookingCancellationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each user to 3 cancellations per hour
  keyGenerator: (req: AuthRequest) => {
    return req.user?.id || req.ip || 'anonymous';
  },
  message: {
    success: false,
    error: 'Too many cancellation attempts. Please try again in 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Booking cancellation rate limit exceeded`, {
      userId: (req as AuthRequest).user?.id || 'anonymous',
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      error: 'Too many cancellation attempts. Please try again in 1 hour.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Rate limiter for booking reschedules
 * Prevent excessive rescheduling
 */
export const bookingRescheduleLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, // Limit each user to 3 reschedules per 30 minutes
  keyGenerator: (req: AuthRequest) => {
    return req.user?.id || req.ip || 'anonymous';
  },
  message: {
    success: false,
    error: 'Too many reschedule attempts. Please try again in 30 minutes.',
    retryAfter: '30 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Booking reschedule rate limit exceeded`, {
      userId: (req as AuthRequest).user?.id || 'anonymous',
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      error: 'Too many reschedule attempts. Please try again in 30 minutes.',
      retryAfter: '30 minutes'
    });
  }
});

/**
 * Rate limiter for bulk operations
 * Very restrictive for admin/provider bulk operations
 */
export const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 bulk operations per hour
  keyGenerator: (req: AuthRequest) => {
    return req.user?.id || req.ip || 'anonymous';
  },
  message: {
    success: false,
    error: 'Too many bulk operations. Please try again in 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Bulk operation rate limit exceeded`, {
      userId: (req as AuthRequest).user?.id || 'anonymous',
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      error: 'Too many bulk operations. Please try again in 1 hour.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Rate limiter for general booking API endpoints
 * More lenient for read operations
 */
export const generalBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes for general endpoints
  keyGenerator: (req: AuthRequest) => {
    return req.user?.id || req.ip || 'anonymous';
  },
  message: {
    success: false,
    error: 'Too many requests. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for GET requests to reduce false positives
    return req.method === 'GET';
  }
});

/**
 * Suspicious activity detection middleware
 * Monitors for patterns that might indicate abuse
 */
export const suspiciousActivityDetector = (req: AuthRequest, res: Response, next: Function) => {
  const userAgent = req.get('User-Agent');
  const ip = req.ip;
  const userId = req.user?.id;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    !userAgent || userAgent.length < 10, // Very short or missing user agent
    /bot|crawler|spider|scraper/i.test(userAgent || ''), // Bot-like user agents
    req.headers['x-forwarded-for'] && (req.headers['x-forwarded-for'] as string).split(',').length > 3 // Multiple proxy hops
  ];
  
  if (suspiciousPatterns.some(pattern => pattern)) {
    logger.warn('Suspicious booking activity detected', {
      userId: userId || 'anonymous',
      ip: ip,
      userAgent: userAgent
    });
    
    // Log but don't block - just monitor
    // In production, you might want to implement additional security measures
  }
  
  next();
};

export default {
  bookingCreationLimiter,
  bookingCancellationLimiter,
  bookingRescheduleLimiter,
  bulkOperationLimiter,
  generalBookingLimiter,
  suspiciousActivityDetector
};