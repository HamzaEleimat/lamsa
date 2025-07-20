/**
 * @file csrf.middleware.ts
 * @description CSRF protection middleware using double-submit cookie pattern
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRF token cookie name
const CSRF_COOKIE_NAME = 'lamsa-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Paths that are exempt from CSRF protection (e.g., auth endpoints)
const EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/provider/login',
  '/api/auth/otp/request',
  '/api/auth/otp/verify',
  '/api/auth/refresh',
  '/api/webhooks', // External webhooks
];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token in response cookie
 */
export function setCSRFCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * CSRF token generation middleware
 * Generates and sets a CSRF token for GET requests
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
  // Only generate token for GET requests to pages that need forms
  if (req.method === 'GET' && !req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateCSRFToken();
    setCSRFCookie(res, token);
    
    // Also add to response locals for template rendering
    res.locals.csrfToken = token;
  }
  
  next();
}

/**
 * CSRF protection middleware
 * Validates CSRF token for state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void | Response {
  // Skip CSRF check for non-protected methods
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }

  // Skip CSRF check for exempt paths
  const isExempt = EXEMPT_PATHS.some(path => req.path.startsWith(path));
  if (isExempt) {
    return next();
  }

  // Skip for API calls from mobile apps (they use JWT auth instead)
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('Lamsa-Mobile')) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  
  // Get token from request (header or body)
  const requestToken = req.headers[CSRF_HEADER_NAME] as string || 
                      req.body?._csrf ||
                      req.query?._csrf as string;

  // Validate tokens
  if (!cookieToken || !requestToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      error_ar: 'رمز الحماية مفقود',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Compare tokens (prevent timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(requestToken))) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      error_ar: 'رمز الحماية غير صالح',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
}

/**
 * Middleware to add CSRF token to all responses
 * Useful for SPAs to get the token
 */
export function addCSRFTokenToResponse(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Add CSRF token to successful responses
    if (data && typeof data === 'object' && data.success !== false) {
      const token = generateCSRFToken();
      setCSRFCookie(res, token);
      data.csrfToken = token;
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Get CSRF token endpoint
 * Allows clients to request a fresh CSRF token
 */
export function getCSRFToken(_req: Request, res: Response): Response {
  const token = generateCSRFToken();
  setCSRFCookie(res, token);
  
  return res.json({
    success: true,
    csrfToken: token
  });
}

// Export all middleware functions
export default {
  generateCSRFToken,
  setCSRFCookie,
  csrfTokenGenerator,
  csrfProtection,
  addCSRFTokenToResponse,
  getCSRFToken
};