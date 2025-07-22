/**
 * @file secure-logger.ts
 * @description Secure logging utility that sanitizes sensitive data
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request } from 'express';
import { AuthRequest } from '../types';

// Sensitive field patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credit/i,
  /card/i,
  /cvv/i,
  /ssn/i,
  /pin/i,
  /otp/i,
  /mfa/i,
  /auth/i,
  /bearer/i,
  /api[-_]?key/i,
  /private/i,
  /phone/i,
  /email/i,
  /address/i,
  /birth/i,
  /social/i
];

// Fields to completely remove from logs
const FIELDS_TO_REMOVE = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'idToken',
  'id_token',
  'apiKey',
  'api_key',
  'secretKey',
  'secret_key',
  'privateKey',
  'private_key',
  'creditCard',
  'credit_card',
  'cvv',
  'pin',
  'ssn',
  'mfa_secret',
  'mfaSecret',
  'otp',
  'otpCode',
  'otp_code'
];

// Database error messages to sanitize
const DB_ERROR_PATTERNS = [
  { pattern: /relation "(\w+)" does not exist/gi, replacement: 'Database table not found' },
  { pattern: /column "(\w+)" of relation "(\w+)"/gi, replacement: 'Database column error' },
  { pattern: /duplicate key value violates unique constraint "(\w+)"/gi, replacement: 'Duplicate entry error' },
  { pattern: /violates foreign key constraint "(\w+)"/gi, replacement: 'Reference constraint error' },
  { pattern: /null value in column "(\w+)"/gi, replacement: 'Required field missing' },
  { pattern: /invalid input syntax for type (\w+)/gi, replacement: 'Invalid data format' },
  { pattern: /permission denied for (table|schema|relation) (\w+)/gi, replacement: 'Database permission error' }
];

export class SecureLogger {
  private logger: winston.Logger;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Configure Winston logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'lamsa-api',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: this.configureTransports()
    });
  }

  private configureTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport for development
    if (this.isDevelopment) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }

    // File transport for production
    if (!this.isDevelopment) {
      // Error logs
      transports.push(new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));

      // Combined logs
      transports.push(new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }

    return transports;
  }

  /**
   * Sanitize sensitive data from objects
   */
  private sanitizeObject(obj: any, depth: number = 0): any {
    if (depth > 5) return '[Max depth exceeded]'; // Prevent infinite recursion
    
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj !== 'object') {
      return this.sanitizeValue(obj);
    }

    if (obj instanceof Error) {
      return this.sanitizeError(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remove completely sensitive fields
      if (FIELDS_TO_REMOVE.includes(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Check if key matches sensitive patterns
      if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = this.sanitizeObject(value, depth + 1);
    }

    return sanitized;
  }

  /**
   * Sanitize individual values
   */
  private sanitizeValue(value: any): any {
    if (typeof value !== 'string') return value;

    // Check for JWT tokens
    if (value.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
      return '[JWT_REDACTED]';
    }

    // Check for API keys (common patterns)
    if (value.match(/^(sk|pk|api)_[a-zA-Z0-9]{20,}$/)) {
      return '[API_KEY_REDACTED]';
    }

    // Check for credit card numbers
    if (value.match(/^\d{13,19}$/)) {
      return '[POSSIBLE_CARD_NUMBER]';
    }

    // Check for phone numbers (Jordan format)
    if (value.match(/^(\+962|0)?7[789]\d{7}$/)) {
      return value.substring(0, 6) + '****';
    }

    // Check for email addresses
    if (value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      const [local, domain] = value.split('@');
      return local.substring(0, 2) + '***@' + domain;
    }

    return value;
  }

  /**
   * Sanitize error objects
   */
  private sanitizeError(error: Error): any {
    const sanitized: any = {
      name: error.name,
      message: this.sanitizeErrorMessage(error.message)
    };

    // In development, include sanitized stack trace
    if (this.isDevelopment && error.stack) {
      sanitized.stack = this.sanitizeStackTrace(error.stack);
    }

    // Handle Supabase/PostgreSQL errors
    if ((error as any).code) {
      sanitized.code = (error as any).code;
    }

    // Remove any additional properties that might contain sensitive data
    const errorObj = error as any;
    for (const key of ['detail', 'table', 'column', 'constraint']) {
      if (errorObj[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize error messages
   */
  private sanitizeErrorMessage(message: string): string {
    let sanitized = message;

    // Apply database error pattern replacements
    for (const { pattern, replacement } of DB_ERROR_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    // Remove any remaining table/column names
    sanitized = sanitized.replace(/["'][\w_]+["']/g, '[REDACTED]');

    // Remove file paths
    sanitized = sanitized.replace(/\/[\w\/\-\.]+/g, '[PATH]');

    // Remove IP addresses
    sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_ADDRESS]');

    // Remove ports
    sanitized = sanitized.replace(/:\d{2,5}\b/g, ':[PORT]');

    return sanitized;
  }

  /**
   * Sanitize stack traces
   */
  private sanitizeStackTrace(stack: string): string {
    // Remove absolute file paths but keep relative paths for debugging
    return stack.replace(/\/home\/[\w\/\-\.]+\/lamsa-api\//g, './');
  }

  /**
   * Sanitize request object for logging
   */
  private sanitizeRequest(req: Request | AuthRequest): any {
    const authReq = req as AuthRequest;
    return {
      method: req.method,
      url: req.url,
      headers: this.sanitizeObject({
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        cookie: req.headers.cookie ? '[REDACTED]' : undefined
      }),
      query: this.sanitizeObject(req.query),
      body: this.sanitizeObject(req.body),
      ip: req.ip ? req.ip.substring(0, req.ip.lastIndexOf('.')) + '.xxx' : undefined,
      user: authReq.user ? { id: authReq.user.id, type: authReq.user.type } : undefined
    };
  }

  /**
   * Log info level message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, this.sanitizeObject(meta));
  }

  /**
   * Log warning level message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, this.sanitizeObject(meta));
  }

  /**
   * Log error level message
   */
  error(message: string, error?: any, meta?: any): void {
    const sanitizedMeta = {
      ...this.sanitizeObject(meta),
      error: error ? this.sanitizeError(error) : undefined
    };
    this.logger.error(message, sanitizedMeta);
  }

  /**
   * Log debug level message (only in development)
   */
  debug(message: string, meta?: any): void {
    if (this.isDevelopment) {
      this.logger.debug(message, this.sanitizeObject(meta));
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req: Request | AuthRequest, res: any, responseTime: number): void {
    const logData = {
      request: this.sanitizeRequest(req),
      response: {
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`
      }
    };

    if (res.statusCode >= 500) {
      this.error('Server Error', undefined, logData);
    } else if (res.statusCode >= 400) {
      this.warn('Client Error', logData);
    } else {
      this.info('Request completed', logData);
    }
  }

  /**
   * Create child logger with additional context
   */
  child(meta: any): SecureLogger {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child(this.sanitizeObject(meta));
    return childLogger;
  }
}

// Export singleton instance
export const secureLogger = new SecureLogger();

// Helper function for migration from console.error
export function logError(message: string, error?: any, meta?: any): void {
  secureLogger.error(message, error, meta);
}

// Helper function for migration from console.log
export function logInfo(message: string, meta?: any): void {
  secureLogger.info(message, meta);
}

// Helper function for migration from console.warn
export function logWarn(message: string, meta?: any): void {
  secureLogger.warn(message, meta);
}

// Helper function for migration from console.debug
export function logDebug(message: string, meta?: any): void {
  secureLogger.debug(message, meta);
}