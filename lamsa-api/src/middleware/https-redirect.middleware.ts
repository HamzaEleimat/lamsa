/**
 * @file https-redirect.middleware.ts
 * @description Middleware to enforce HTTPS in production
 * @author Lamsa Development Team
 * @date Created: 2025-07-22
 * @copyright Lamsa 2025
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Enforce HTTPS redirect in production
 * Checks for various proxy headers to determine if request was originally HTTPS
 */
export function enforceHTTPS(req: Request, res: Response, next: NextFunction): void {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check various headers that proxies might set
  const isHttps = 
    req.secure || // Express native check
    req.headers['x-forwarded-proto'] === 'https' || // Common proxy header
    req.headers['x-forwarded-protocol'] === 'https' || // Alternative proxy header
    req.headers['x-url-scheme'] === 'https' || // nginx
    req.headers['front-end-https'] === 'on' || // Microsoft
    req.protocol === 'https'; // Express protocol check

  // If not HTTPS, redirect
  if (!isHttps) {
    // Build the secure URL
    const host = req.headers.host || req.hostname;
    const secureUrl = `https://${host}${req.originalUrl}`;
    
    // Use 301 for permanent redirect
    return res.redirect(301, secureUrl);
  }

  // Add Strict-Transport-Security header for HTTPS requests
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  next();
}

/**
 * Middleware to add security headers for API responses
 */
export function addSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent browsers from MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent download of files that could be executed
  res.setHeader('X-Download-Options', 'noopen');
  
  // Disable client-side caching for sensitive data
  if (_req.path.includes('/api/auth') || _req.path.includes('/api/payment')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}