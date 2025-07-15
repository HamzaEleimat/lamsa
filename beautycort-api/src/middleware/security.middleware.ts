/**
 * @file security.middleware.ts
 * @description Security middleware for setting security headers and protections
 * @author BeautyCort Development Team
 * @date Created: 2025-01-14
 * @copyright BeautyCort 2025
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

// Custom security headers middleware
export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
};

// Configure Helmet with custom options for BeautyCort
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.beautycort.com', 'wss://api.beautycort.com'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some image CDNs
});

// CORS origin validator
export const corsOriginValidator = (origin: string | undefined, callback: Function): void => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:19000',
    'http://localhost:19001',
    'http://localhost:19002',
    'https://beautycort.com',
    'https://www.beautycort.com',
    'https://app.beautycort.com',
    'https://admin.beautycort.com'
  ];

  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void | Response => {
  // Sanitize common injection patterns in query parameters
  const dangerousPatterns = [
    /<script/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onload, etc.
    /\.\.\//, // Path traversal
    /\0/, // Null bytes
  ];

  // Check query parameters
  for (const [_key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid characters in request',
            error_ar: 'حروف غير صالحة في الطلب'
          });
        }
      }
    }
  }

  // Check body parameters (for JSON requests)
  if (req.body && typeof req.body === 'object') {
    const checkObject = (obj: any): boolean => {
      for (const [_key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          for (const pattern of dangerousPatterns) {
            if (pattern.test(value)) {
              return false;
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          if (!checkObject(value)) {
            return false;
          }
        }
      }
      return true;
    };

    if (!checkObject(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid characters in request body',
        error_ar: 'حروف غير صالحة في محتوى الطلب'
      });
    }
  }

  next();
};

// API key validation middleware (for external integrations)
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void | Response => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      error_ar: 'مفتاح API مطلوب'
    });
  }

  // In production, validate against stored API keys in database
  // For now, we'll use environment variable
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      error_ar: 'مفتاح API غير صالح'
    });
  }

  next();
};