import { Request, Response, NextFunction } from 'express';
import { secureLogger } from '../utils/secure-logger';

/**
 * TODO: Future Enhancement Options
 * 
 * This is the basic error middleware currently used throughout the application.
 * For MVP, we're keeping this simple implementation.
 * 
 * Additional error handling capabilities are available in:
 * - enhanced-error.middleware.ts: Provides detailed validation errors, specialized formatters
 *   for booking/auth/database errors, and structured error responses
 * - enhanced-bilingual-error.middleware.ts: Adds full Arabic/English bilingual support
 *   with comprehensive error categorization
 * 
 * Post-MVP considerations:
 * - Gradually migrate to enhanced error handling on specific routes
 * - Add bilingual support based on actual user needs
 * - Consider performance impact before enabling globally
 */

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Redact sensitive data from error logs
  const sanitizedError = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: (req as any).user?.id,
    // Do not log request body to prevent payment data exposure
    timestamp: new Date().toISOString()
  };
  
  secureLogger.error('Request error', sanitizedError);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};