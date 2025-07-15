/**
 * Enhanced Error Response Middleware
 * Provides detailed validation error messages and structured error responses
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, Result, ValidationError } from 'express-validator';
import { AppError } from './error.middleware';
import { AuthRequest, ApiResponse } from '../types';

/**
 * Enhanced validation middleware that provides detailed error messages
 */
export const enhancedValidate = (req: Request, res: Response, next: NextFunction): void => {
  const errors: Result<ValidationError> = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Group errors by field for better organization
    const fieldErrors: Record<string, string[]> = {};
    const generalErrors: string[] = [];
    
    errors.array().forEach(error => {
      if (error.type === 'field') {
        const field = error.path;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(error.msg);
      } else {
        generalErrors.push(error.msg);
      }
    });

    // Create a structured error response
    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      message: 'Please check the provided data and try again',
      data: {
        validationErrors: {
          fields: fieldErrors,
          general: generalErrors
        },
        errorCount: errors.array().length,
        timestamp: new Date().toISOString()
      }
    };

    res.status(400).json(response);
    return;
  }
  
  next();
};

/**
 * Booking-specific error formatter
 */
export const formatBookingError = (error: any): ApiResponse => {
  if (error.name === 'BookingError') {
    return {
      success: false,
      error: error.constructor.name,
      message: error.message,
      data: {
        errorCode: error.statusCode || 500,
        category: 'booking',
        timestamp: new Date().toISOString(),
        ...(error.details && { details: error.details })
      }
    };
  }

  // Handle specific booking error types
  if (error.name === 'BookingConflictError') {
    return {
      success: false,
      error: 'Booking Conflict',
      message: 'The selected time slot is no longer available',
      data: {
        errorCode: 409,
        category: 'booking_conflict',
        suggestion: 'Please select a different time slot',
        timestamp: new Date().toISOString()
      }
    };
  }

  if (error.name === 'BookingNotFoundError') {
    return {
      success: false,
      error: 'Booking Not Found',
      message: 'The requested booking could not be found',
      data: {
        errorCode: 404,
        category: 'booking_not_found',
        suggestion: 'Please check the booking ID and try again',
        timestamp: new Date().toISOString()
      }
    };
  }

  if (error.name === 'InvalidBookingStatusError') {
    return {
      success: false,
      error: 'Invalid Status Transition',
      message: error.message,
      data: {
        errorCode: 400,
        category: 'invalid_status',
        suggestion: 'Check the current booking status and valid transitions',
        timestamp: new Date().toISOString()
      }
    };
  }

  if (error.name === 'InsufficientPermissionError') {
    return {
      success: false,
      error: 'Insufficient Permissions',
      message: 'You do not have permission to perform this action',
      data: {
        errorCode: 403,
        category: 'permission_denied',
        suggestion: 'Contact support if you believe this is an error',
        timestamp: new Date().toISOString()
      }
    };
  }

  // Default booking error format
  return {
    success: false,
    error: 'Booking Operation Failed',
    message: error.message || 'An error occurred while processing your booking',
    data: {
      errorCode: 500,
      category: 'booking_error',
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Rate limiting error formatter
 */
export const formatRateLimitError = (retryAfter: string): ApiResponse => {
  return {
    success: false,
    error: 'Rate Limit Exceeded',
    message: `Too many requests. Please try again ${retryAfter}`,
    data: {
      errorCode: 429,
      category: 'rate_limit',
      retryAfter,
      suggestion: 'Wait for the specified time period before making another request',
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Business rule violation error formatter
 */
export const formatBusinessRuleError = (rule: string, details?: any): ApiResponse => {
  const businessRuleMessages: Record<string, string> = {
    'booking_advance_limit': 'Bookings can only be made up to 90 days in advance',
    'minimum_advance_time': 'Bookings must be made at least 2 hours in advance',
    'business_hours': 'Bookings can only be made during business hours (8:00 AM - 10:00 PM)',
    'provider_unavailable': 'The selected provider is not available at this time',
    'service_inactive': 'The selected service is currently unavailable',
    'payment_required': 'Online payment is required for bookings over 100 JOD',
    'booking_limit_exceeded': 'You have reached the maximum number of bookings allowed'
  };

  return {
    success: false,
    error: 'Business Rule Violation',
    message: businessRuleMessages[rule] || 'A business rule has been violated',
    data: {
      errorCode: 400,
      category: 'business_rule',
      rule,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
  };
};

/**
 * Authentication error formatter
 */
export const formatAuthError = (type: 'missing_token' | 'invalid_token' | 'expired_token' | 'insufficient_role'): ApiResponse => {
  const authErrorMessages = {
    'missing_token': 'Authentication token is required',
    'invalid_token': 'Invalid authentication token',
    'expired_token': 'Authentication token has expired',
    'insufficient_role': 'Insufficient permissions for this operation'
  };

  const statusCodes = {
    'missing_token': 401,
    'invalid_token': 401,
    'expired_token': 401,
    'insufficient_role': 403
  };

  return {
    success: false,
    error: 'Authentication Error',
    message: authErrorMessages[type],
    data: {
      errorCode: statusCodes[type],
      category: 'authentication',
      type,
      suggestion: type === 'expired_token' ? 'Please log in again' : 'Check your authentication credentials',
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Database error formatter
 */
export const formatDatabaseError = (error: any): ApiResponse => {
  // Don't expose sensitive database details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let message = 'A database error occurred';
  let suggestion = 'Please try again later';
  
  // Handle common PostgreSQL/Supabase errors
  if (error.code === '23505') { // Unique constraint violation
    message = 'A record with this information already exists';
    suggestion = 'Please check your data and try again with different values';
  } else if (error.code === '23503') { // Foreign key constraint violation
    message = 'Referenced record does not exist';
    suggestion = 'Please check that all referenced IDs are valid';
  } else if (error.code === '23514') { // Check constraint violation
    message = 'Data does not meet the required constraints';
    suggestion = 'Please check your input data';
  }

  return {
    success: false,
    error: 'Database Error',
    message,
    data: {
      errorCode: 500,
      category: 'database',
      suggestion,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && { details: error.message })
    }
  };
};

/**
 * Comprehensive error response middleware
 */
export const enhancedErrorHandler = (error: any, req: AuthRequest, res: Response, next: NextFunction): void => {
  console.error('Enhanced Error Handler:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  let response: ApiResponse;

  // Handle different types of errors
  if (error.name && error.name.includes('Booking')) {
    response = formatBookingError(error);
  } else if (error.code && error.code.startsWith('23')) { // PostgreSQL constraint errors
    response = formatDatabaseError(error);
  } else if (error instanceof AppError) {
    response = {
      success: false,
      error: error.name,
      message: error.message,
      data: {
        errorCode: error.statusCode,
        category: 'application',
        timestamp: new Date().toISOString()
      }
    };
  } else {
    // Generic error handling
    response = {
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      data: {
        errorCode: 500,
        category: 'internal',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    };
  }

  const statusCode = response.data?.errorCode || 500;
  res.status(statusCode).json(response);
};

export default {
  enhancedValidate,
  formatBookingError,
  formatRateLimitError,
  formatBusinessRuleError,
  formatAuthError,
  formatDatabaseError,
  enhancedErrorHandler
};