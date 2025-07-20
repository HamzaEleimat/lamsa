/**
 * Structured Logging Configuration for Lamsa API
 * Supports multiple log levels and destinations
 */

'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { format } = winston;

class LamsaLogger {
  constructor() {
    this.logger = null;
    this.init();
  }

  init() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logFormat = process.env.LOG_FORMAT || 'json';
    const environment = process.env.NODE_ENV || 'development';

    // Define log format
    const logFormatters = {
      json: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
      ),
      
      console: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      )
    };

    // Configure transports
    const transports = [];

    // Console transport for development
    if (environment === 'development') {
      transports.push(new winston.transports.Console({
        format: logFormatters.console
      }));
    }

    // File transports for production
    if (environment === 'production' || environment === 'staging') {
      // General application logs
      transports.push(new DailyRotateFile({
        filename: 'logs/lamsa-api-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormatters.json
      }));

      // Error logs
      transports.push(new DailyRotateFile({
        filename: 'logs/lamsa-api-error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: logFormatters.json
      }));

      // Audit logs for security events
      transports.push(new DailyRotateFile({
        filename: 'logs/lamsa-api-audit-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '90d',
        format: logFormatters.json
      }));
    }

    // DataDog integration
    if (process.env.DD_API_KEY) {
      try {
        const datadogTransport = require('datadog-winston');
        transports.push(new datadogTransport({
          apiKey: process.env.DD_API_KEY,
          hostname: process.env.DD_HOSTNAME || 'lamsa-api',
          service: 'lamsa-api',
          ddsource: 'nodejs',
          ddtags: `env:${environment},version:${process.env.npm_package_version || '1.0.0'},region:jordan`
        }));
      } catch (e) {
        // DataDog integration is optional
      }
    }

    // CloudWatch integration
    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
      try {
        const CloudWatchTransport = require('winston-cloudwatch');
        transports.push(new CloudWatchTransport({
          logGroupName: `/aws/lamsa-api/${environment}`,
          logStreamName: `api-${new Date().toISOString().split('T')[0]}`,
          awsRegion: process.env.AWS_REGION,
          awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
          awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
          jsonMessage: true
        }));
      } catch (e) {
        // CloudWatch integration is optional
      }
    }

    // Create logger instance
    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormatters.json,
      defaultMeta: {
        service: 'lamsa-api',
        version: process.env.npm_package_version || '1.0.0',
        environment,
        region: 'jordan',
        currency: 'JOD'
      },
      transports
    });

    // Handle uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );

    this.logger.rejections.handle(
      new winston.transports.File({ filename: 'logs/rejections.log' })
    );
  }

  // Standard logging methods
  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
  }

  info(message, meta = {}) {
    this.logger.info(message, { ...meta, timestamp: new Date().toISOString() });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
  }

  error(message, error = null, meta = {}) {
    const logData = {
      ...meta,
      timestamp: new Date().toISOString()
    };

    if (error) {
      logData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    this.logger.error(message, logData);
  }

  // Business-specific logging methods
  logUserAction(userId, action, metadata = {}) {
    this.info(`User action: ${action}`, {
      userId,
      action,
      category: 'user_action',
      ...metadata
    });
  }

  logProviderAction(providerId, action, metadata = {}) {
    this.info(`Provider action: ${action}`, {
      providerId,
      action,
      category: 'provider_action',
      ...metadata
    });
  }

  logBookingEvent(bookingId, event, metadata = {}) {
    this.info(`Booking event: ${event}`, {
      bookingId,
      event,
      category: 'booking_event',
      ...metadata
    });
  }

  logPaymentEvent(paymentId, event, amount = null, metadata = {}) {
    // Redact sensitive payment data for security compliance
    const safeMetadata = this.redactSensitiveData(metadata);
    const redactedPaymentId = paymentId ? paymentId.substring(0, 8) + '...' : null;
    
    this.info(`Payment event: ${event}`, {
      paymentId: redactedPaymentId,
      event,
      amount: amount ? '[REDACTED]' : null,
      currency: 'JOD',
      category: 'payment_event',
      ...safeMetadata
    });
  }

  // Helper method to redact sensitive data from objects
  redactSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = [
      'cardNumber', 'cvv', 'cardholderName', 'expiryDate',
      'iban', 'accountNumber', 'amount', 'transactionId',
      'paymentMethod', 'billingAddress', 'customerEmail'
    ];
    
    const redacted = { ...data };
    
    for (const field of sensitiveFields) {
      if (redacted[field] !== undefined) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    return redacted;
  }

  logSMSEvent(messageId, event, phoneNumber = null, metadata = {}) {
    this.info(`SMS event: ${event}`, {
      messageId,
      event,
      phoneNumber: phoneNumber ? this.anonymizePhoneNumber(phoneNumber) : null,
      category: 'sms_event',
      ...metadata
    });
  }

  logSecurityEvent(event, severity = 'medium', metadata = {}) {
    const logLevel = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    
    this.logger[logLevel](`Security event: ${event}`, {
      event,
      severity,
      category: 'security_event',
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  // API request logging
  logAPIRequest(req, res, duration) {
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user ? req.user.id : null,
      requestId: req.headers['x-request-id'],
      category: 'api_request'
    };

    if (res.statusCode >= 400) {
      this.warn(`API request failed: ${req.method} ${req.path}`, logData);
    } else {
      this.info(`API request: ${req.method} ${req.path}`, logData);
    }
  }

  // Database query logging
  logDatabaseQuery(query, duration, params = null) {
    this.debug('Database query executed', {
      query: query.slice(0, 100) + (query.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      params: params ? JSON.stringify(params).slice(0, 200) : null,
      category: 'database_query'
    });
  }

  // Redis operation logging
  logRedisOperation(operation, key, duration, result = null) {
    this.debug(`Redis operation: ${operation}`, {
      operation,
      key,
      duration: `${duration}ms`,
      result: result ? JSON.stringify(result).slice(0, 100) : null,
      category: 'redis_operation'
    });
  }

  // Performance logging
  logPerformanceMetric(metric, value, unit = 'ms', metadata = {}) {
    this.info(`Performance metric: ${metric}`, {
      metric,
      value,
      unit,
      category: 'performance_metric',
      ...metadata
    });
  }

  // Business analytics logging
  logBusinessEvent(event, data = {}) {
    this.info(`Business event: ${event}`, {
      event,
      category: 'business_analytics',
      ...data
    });
  }

  // Jordan-specific logging
  logJordanSpecificEvent(event, data = {}) {
    this.info(`Jordan-specific event: ${event}`, {
      event,
      region: 'jordan',
      category: 'jordan_specific',
      ...data
    });
  }

  // Audit logging for compliance
  logAuditEvent(event, userId, action, resource, metadata = {}) {
    this.logger.info(`Audit event: ${event}`, {
      event,
      userId,
      action,
      resource,
      timestamp: new Date().toISOString(),
      category: 'audit',
      ...metadata
    });
  }

  // Helper methods
  anonymizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 8) {
      return cleaned.substring(0, 4) + '****' + cleaned.substring(cleaned.length - 4);
    }
    return '****';
  }

  // Structured error logging
  logStructuredError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      ...context,
      category: 'structured_error'
    };

    this.error('Structured error occurred', error, errorData);
  }

  // Health check logging
  logHealthCheck(component, status, metadata = {}) {
    const logMethod = status === 'healthy' ? 'info' : 'error';
    this.logger[logMethod](`Health check: ${component}`, {
      component,
      status,
      category: 'health_check',
      ...metadata
    });
  }

  // Graceful shutdown logging
  logShutdown(signal, metadata = {}) {
    this.info(`Application shutdown initiated: ${signal}`, {
      signal,
      category: 'application_lifecycle',
      ...metadata
    });
  }

  // Create child logger with additional context
  createChildLogger(context = {}) {
    return {
      debug: (message, meta = {}) => this.debug(message, { ...context, ...meta }),
      info: (message, meta = {}) => this.info(message, { ...context, ...meta }),
      warn: (message, meta = {}) => this.warn(message, { ...context, ...meta }),
      error: (message, error, meta = {}) => this.error(message, error, { ...context, ...meta })
    };
  }

  // Get logger instance for external use
  getLogger() {
    return this.logger;
  }
}

// Export singleton instance
module.exports = new LamsaLogger();