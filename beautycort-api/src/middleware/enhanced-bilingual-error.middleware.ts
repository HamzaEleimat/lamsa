/**
 * Enhanced Bilingual Error Middleware
 * Provides comprehensive error handling with Arabic/English support
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import { 
  getErrorMessage, 
  getBilingualErrorMessage, 
  BilingualMessage,
  ErrorCode,
  ALL_ERROR_MESSAGES 
} from '../utils/error-messages';
import { getLanguageFromRequest, RequestWithLanguage } from './language-detection.middleware';

// Enhanced AppError class with bilingual support
export class BilingualAppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly messageEn: string;
  public readonly messageAr: string;
  public readonly data?: any;
  public readonly timestamp: string;

  constructor(
    errorCode: string,
    statusCode: number = 500,
    customMessage?: Partial<BilingualMessage>,
    data?: any
  ) {
    const bilingualMessage = getBilingualErrorMessage(errorCode);
    
    // Use custom message if provided, otherwise use default
    const finalMessage = {
      en: customMessage?.en || bilingualMessage.en,
      ar: customMessage?.ar || bilingualMessage.ar
    };

    super(finalMessage.en);
    
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.messageEn = finalMessage.en;
    this.messageAr = finalMessage.ar;
    this.data = data;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  // Get message in specific language
  getMessage(language: 'en' | 'ar' = 'en'): string {
    return language === 'ar' ? this.messageAr : this.messageEn;
  }

  // Get both messages
  getBilingualMessage(): BilingualMessage {
    return {
      en: this.messageEn,
      ar: this.messageAr
    };
  }

  // Convert to API response format
  toResponse(language: 'en' | 'ar' = 'en'): ErrorResponse {
    return {
      success: false,
      error: this.errorCode,
      message: this.messageEn,
      messageAr: this.messageAr,
      data: {
        errorCode: this.statusCode,
        category: this.getErrorCategory(),
        timestamp: this.timestamp,
        language,
        ...this.data
      }
    };
  }

  // Get error category based on error code
  private getErrorCategory(): string {
    if (this.errorCode.includes('AUTH') || this.errorCode.includes('TOKEN') || this.errorCode.includes('OTP')) {
      return 'authentication';
    }
    if (this.errorCode.includes('VALIDATION') || this.errorCode.includes('INVALID') || this.errorCode.includes('REQUIRED')) {
      return 'validation';
    }
    if (this.errorCode.includes('BOOKING')) {
      return 'booking';
    }
    if (this.errorCode.includes('PROVIDER')) {
      return 'provider';
    }
    if (this.errorCode.includes('SERVICE')) {
      return 'service';
    }
    if (this.errorCode.includes('PAYMENT')) {
      return 'payment';
    }
    if (this.errorCode.includes('RATE_LIMIT') || this.errorCode.includes('TOO_MANY')) {
      return 'rate_limit';
    }
    if (this.errorCode.includes('SYSTEM') || this.errorCode.includes('DATABASE') || this.errorCode.includes('NETWORK')) {
      return 'system';
    }
    return 'general';
  }
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  messageAr: string;
  data: {
    errorCode: number;
    category: string;
    timestamp: string;
    language: string;
    [key: string]: any;
  };
}

// Validation error response interface
export interface ValidationErrorResponse extends ErrorResponse {
  validationErrors: {
    field: string;
    message: string;
    messageAr: string;
    value?: any;
  }[];
}

/**
 * Enhanced error handler middleware with bilingual support
 */
export const enhancedBilingualErrorHandler = (
  err: Error | BilingualAppError | ValidationError[],
  req: RequestWithLanguage,
  res: Response,
  next: NextFunction
): void => {
  const language = getLanguageFromRequest(req);
  
  // Handle validation errors from express-validator
  if (Array.isArray(err)) {
    handleValidationErrors(err, req, res);
    return;
  }

  // Handle BilingualAppError
  if (err instanceof BilingualAppError) {
    const response = err.toResponse(language);
    
    // Log error for monitoring
    logError(err, req, response);
    
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle standard errors
  if (err instanceof Error) {
    const bilingualError = convertStandardError(err, language);
    const response = bilingualError.toResponse(language);
    
    // Log error for monitoring
    logError(err, req, response);
    
    res.status(bilingualError.statusCode).json(response);
    return;
  }

  // Fallback for unknown errors
  const unknownError = new BilingualAppError('INTERNAL_SERVER_ERROR', 500);
  const response = unknownError.toResponse(language);
  
  logError(new Error('Unknown error type'), req, response);
  
  res.status(500).json(response);
};

/**
 * Handle validation errors from express-validator
 */
function handleValidationErrors(
  errors: ValidationError[],
  req: RequestWithLanguage,
  res: Response
): void {
  const language = getLanguageFromRequest(req);
  
  // Map validation errors to bilingual format
  const validationErrors = errors.map(error => {
    const fieldName = error.type === 'field' ? error.path : 'unknown';
    const errorMessage = error.msg || 'Invalid input';
    
    // Try to get bilingual message for common validation errors
    const bilingualMessage = getBilingualValidationMessage(fieldName, errorMessage);
    
    return {
      field: fieldName,
      message: bilingualMessage.en,
      messageAr: bilingualMessage.ar,
      value: error.type === 'field' ? error.value : undefined
    };
  });

  const response: ValidationErrorResponse = {
    success: false,
    error: 'VALIDATION_ERROR',
    message: 'Validation failed',
    messageAr: 'فشل التحقق من صحة البيانات',
    validationErrors,
    data: {
      errorCode: 400,
      category: 'validation',
      timestamp: new Date().toISOString(),
      language,
      validationCount: validationErrors.length
    }
  };

  // Log validation errors
  console.error('Validation errors:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    language,
    errors: validationErrors
  });

  res.status(400).json(response);
}

/**
 * Convert standard Error to BilingualAppError
 */
function convertStandardError(error: Error, language: 'en' | 'ar'): BilingualAppError {
  // Database errors
  if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
    return new BilingualAppError('VALIDATION_ERROR', 400, {
      en: 'Duplicate entry found',
      ar: 'البيانات موجودة بالفعل'
    });
  }

  // Network/timeout errors
  if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    return new BilingualAppError('NETWORK_ERROR', 408);
  }

  // Permission errors
  if (error.message.includes('permission') || error.message.includes('forbidden')) {
    return new BilingualAppError('INSUFFICIENT_PERMISSIONS', 403);
  }

  // Not found errors
  if (error.message.includes('not found') || error.message.includes('does not exist')) {
    return new BilingualAppError('NOT_FOUND', 404, {
      en: 'Resource not found',
      ar: 'المورد غير موجود'
    });
  }

  // Default to internal server error
  return new BilingualAppError('INTERNAL_SERVER_ERROR', 500);
}

/**
 * Get bilingual validation message for common field errors
 */
function getBilingualValidationMessage(field: string, message: string): BilingualMessage {
  // Common field-specific messages
  const fieldMessages: { [key: string]: BilingualMessage } = {
    phone: {
      en: 'Invalid phone number format',
      ar: 'رقم الهاتف غير صحيح'
    },
    email: {
      en: 'Invalid email format',
      ar: 'تنسيق البريد الإلكتروني غير صحيح'
    },
    name: {
      en: 'Invalid name format',
      ar: 'تنسيق الاسم غير صحيح'
    },
    password: {
      en: 'Invalid password format',
      ar: 'تنسيق كلمة المرور غير صحيح'
    },
    price: {
      en: 'Invalid price format',
      ar: 'تنسيق السعر غير صحيح'
    },
    date: {
      en: 'Invalid date format',
      ar: 'تنسيق التاريخ غير صحيح'
    },
    time: {
      en: 'Invalid time format',
      ar: 'تنسيق الوقت غير صحيح'
    }
  };

  // Check for field-specific message
  if (fieldMessages[field]) {
    return fieldMessages[field];
  }

  // Common validation patterns
  if (message.includes('required')) {
    return {
      en: `${field} is required`,
      ar: `${field} مطلوب`
    };
  }

  if (message.includes('too short')) {
    return {
      en: `${field} is too short`,
      ar: `${field} قصير جداً`
    };
  }

  if (message.includes('too long')) {
    return {
      en: `${field} is too long`,
      ar: `${field} طويل جداً`
    };
  }

  if (message.includes('invalid')) {
    return {
      en: `Invalid ${field}`,
      ar: `${field} غير صحيح`
    };
  }

  // Default validation message
  return {
    en: message,
    ar: 'قيمة غير صحيحة'
  };
}

/**
 * Log error for monitoring and debugging
 */
function logError(error: Error, req: Request, response: ErrorResponse): void {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    language: getLanguageFromRequest(req),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: response.error,
      statusCode: response.data.errorCode
    },
    response: {
      error: response.error,
      message: response.message,
      messageAr: response.messageAr,
      category: response.data.category
    }
  };

  // Log to console (in production, this would go to logging service)
  if (response.data.errorCode >= 500) {
    console.error('Server Error:', logData);
  } else {
    console.warn('Client Error:', logData);
  }

  // In production, send to monitoring service
  // await sendToMonitoringService(logData);
}

/**
 * Helper function to create BilingualAppError instances
 */
export function createBilingualError(
  errorCode: string,
  statusCode: number = 500,
  customMessage?: Partial<BilingualMessage>,
  data?: any
): BilingualAppError {
  return new BilingualAppError(errorCode, statusCode, customMessage, data);
}

/**
 * Helper function to throw BilingualAppError
 */
export function throwBilingualError(
  errorCode: string,
  statusCode: number = 500,
  customMessage?: Partial<BilingualMessage>,
  data?: any
): never {
  throw new BilingualAppError(errorCode, statusCode, customMessage, data);
}

/**
 * Async error handler wrapper
 */
export function asyncErrorHandler(
  fn: (req: RequestWithLanguage, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: RequestWithLanguage, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler with bilingual support
 */
export const notFoundHandler = (req: RequestWithLanguage, res: Response): void => {
  const language = getLanguageFromRequest(req);
  const error = new BilingualAppError('NOT_FOUND', 404, {
    en: `Route ${req.originalUrl} not found`,
    ar: `الرابط ${req.originalUrl} غير موجود`
  });

  res.status(404).json(error.toResponse(language));
};

/**
 * Rate limit error handler
 */
export function createRateLimitError(
  limitType: string,
  retryAfter: number,
  limit: number,
  windowMs: number
): BilingualAppError {
  const errorCode = `TOO_MANY_${limitType.toUpperCase()}_REQUESTS`;
  const data = {
    rateLimit: {
      limit,
      windowMs,
      retryAfter
    }
  };

  return new BilingualAppError(errorCode, 429, undefined, data);
}

// Export types for TypeScript support
export type { BilingualMessage, ErrorResponse, ValidationErrorResponse };