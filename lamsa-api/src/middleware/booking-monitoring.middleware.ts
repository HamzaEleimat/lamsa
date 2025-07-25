/**
 * Booking Monitoring Middleware
 * Enhanced request logging and monitoring for booking operations
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { secureLogger } from '../utils/secure-logger';

interface BookingMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  errorsByType: Record<string, number>;
}

// In-memory metrics store (in production, use Redis or persistent storage)
let bookingMetrics: BookingMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  requestsByEndpoint: {},
  requestsByUser: {},
  errorsByType: {}
};

/**
 * Request logging middleware with comprehensive booking operation tracking
 */
export const bookingRequestLogger = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to headers for tracing
  res.setHeader('X-Request-ID', requestId);
  
  // Log request details
  const logData = {
    requestId,
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
    query: req.query
  };

  console.log('📋 Booking Request:', JSON.stringify(logData, null, 2));

  // Track metrics
  bookingMetrics.totalRequests++;
  bookingMetrics.requestsByEndpoint[req.path] = (bookingMetrics.requestsByEndpoint[req.path] || 0) + 1;
  
  if (req.user?.id) {
    bookingMetrics.requestsByUser[req.user.id] = (bookingMetrics.requestsByUser[req.user.id] || 0) + 1;
  }

  // Override res.json to capture response details
  const originalJson = res.json;
  res.json = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Update metrics
    updateResponseMetrics(responseTime, res.statusCode >= 400);
    
    // Log response details
    const responseLog = {
      requestId,
      statusCode: res.statusCode,
      responseTime,
      success: res.statusCode < 400,
      dataSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Booking Response:', JSON.stringify(responseLog, null, 2));

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Error tracking middleware for booking operations
 */
export const bookingErrorTracker = (error: any, req: AuthRequest, res: Response, next: NextFunction): void => {
  const errorData = {
    requestId: res.get('X-Request-ID'),
    errorType: error.name || 'UnknownError',
    errorMessage: error.message,
    errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };

  console.error('🚨 Booking Error:', JSON.stringify(errorData, null, 2));

  // Track error metrics
  bookingMetrics.failedRequests++;
  bookingMetrics.errorsByType[error.name || 'UnknownError'] = 
    (bookingMetrics.errorsByType[error.name || 'UnknownError'] || 0) + 1;

  // Alert on critical errors
  if (error.statusCode >= 500 || error.name === 'BookingConflictError') {
    console.error('🚨 CRITICAL BOOKING ERROR:', errorData);
    // TODO: Send alert to monitoring service
  }

  next(error);
};

/**
 * Performance monitoring middleware
 */
export const bookingPerformanceMonitor = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime();
  const startUsage = process.cpuUsage();
  
  // Track memory usage
  const memoryBefore = process.memoryUsage();

  res.on('finish', () => {
    const hrDuration = process.hrtime(startTime);
    const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;
    const cpuUsage = process.cpuUsage(startUsage);
    const memoryAfter = process.memoryUsage();

    const performanceData = {
      requestId: res.get('X-Request-ID'),
      path: req.path,
      method: req.method,
      duration: Math.round(durationMs * 100) / 100,
      cpuUsage: {
        user: cpuUsage.user / 1000,
        system: cpuUsage.system / 1000
      },
      memoryUsage: {
        before: memoryBefore.heapUsed,
        after: memoryAfter.heapUsed,
        delta: memoryAfter.heapUsed - memoryBefore.heapUsed
      },
      timestamp: new Date().toISOString()
    };

    // Log slow requests
    if (durationMs > 1000) {
      secureLogger.warn('Slow Booking Request detected', performanceData);
    }

    // Log high memory usage
    if (performanceData.memoryUsage.delta > 50 * 1024 * 1024) { // 50MB
      secureLogger.warn('High Memory Usage detected', performanceData);
    }
  });

  next();
};

/**
 * Audit trail middleware for booking operations
 */
export const bookingAuditLogger = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Only log state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const auditData = {
      requestId: res.get('X-Request-ID'),
      action: getBookingAction(req.method, req.path),
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      details: {
        method: req.method,
        path: req.path,
        params: req.params,
        sanitizedBody: sanitizeRequestBody(req.body)
      }
    };

    console.log('📝 Booking Audit:', JSON.stringify(auditData, null, 2));
  }

  next();
};

/**
 * Get booking metrics for monitoring dashboard
 */
export const getBookingMetrics = (): BookingMetrics => {
  return { ...bookingMetrics };
};

/**
 * Reset booking metrics (for testing or periodic cleanup)
 */
export const resetBookingMetrics = (): void => {
  bookingMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    requestsByEndpoint: {},
    requestsByUser: {},
    errorsByType: {}
  };
};

/**
 * Health check middleware for booking system
 */
export const bookingHealthCheck = (req: Request, res: Response, next: NextFunction): void => {
  const metrics = getBookingMetrics();
  const errorRate = metrics.totalRequests > 0 ? (metrics.failedRequests / metrics.totalRequests) * 100 : 0;
  
  const health = {
    status: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'warning' : 'unhealthy',
    metrics: {
      totalRequests: metrics.totalRequests,
      successRate: metrics.totalRequests > 0 ? 
        Math.round((metrics.successfulRequests / metrics.totalRequests) * 100) : 0,
      errorRate: Math.round(errorRate),
      averageResponseTime: metrics.averageResponseTime
    },
    timestamp: new Date().toISOString()
  };

  res.json(health);
};

// Helper functions

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeRequestBody(body: any): any {
  if (!body) return body;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'otp', 'phone', 'email'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

function updateResponseMetrics(responseTime: number, isError: boolean): void {
  if (isError) {
    bookingMetrics.failedRequests++;
  } else {
    bookingMetrics.successfulRequests++;
  }
  
  // Update average response time
  const totalResponses = bookingMetrics.successfulRequests + bookingMetrics.failedRequests;
  bookingMetrics.averageResponseTime = 
    (bookingMetrics.averageResponseTime * (totalResponses - 1) + responseTime) / totalResponses;
}

function getBookingAction(method: string, path: string): string {
  const actions: Record<string, string> = {
    'POST /': 'CREATE_BOOKING',
    'POST /check-availability': 'CHECK_AVAILABILITY',
    'POST /bulk': 'BULK_OPERATION',
    'POST /:id/cancel': 'CANCEL_BOOKING',
    'POST /:id/reschedule': 'RESCHEDULE_BOOKING',
    'PATCH /:id/status': 'UPDATE_STATUS',
    'DELETE /:id': 'DELETE_BOOKING'
  };
  
  const key = `${method} ${path}`;
  return actions[key] || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
}

export default {
  bookingRequestLogger,
  bookingErrorTracker,
  bookingPerformanceMonitor,
  bookingAuditLogger,
  getBookingMetrics,
  resetBookingMetrics,
  bookingHealthCheck
};