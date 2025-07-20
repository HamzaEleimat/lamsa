/**
 * Monitoring Middleware for Lamsa API
 * Integrates with both New Relic and DataDog monitoring
 */

'use strict';

const os = require('os');
const process = require('process');

class MonitoringMiddleware {
  constructor(monitoringService) {
    this.monitoringService = monitoringService;
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
  }

  // Request tracking middleware
  trackRequests() {
    return (req, res, next) => {
      const startTime = Date.now();
      this.requestCount++;

      // Add custom attributes
      if (this.monitoringService.addCustomAttributes) {
        this.monitoringService.addCustomAttributes({
          'request.method': req.method,
          'request.path': req.path,
          'request.user_agent': req.get('user-agent'),
          'request.ip': req.ip,
          'request.language': req.get('accept-language'),
          'request.id': req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Record metrics
        if (typeof monitoringService.recordTiming === 'function') {
          monitoringService.recordTiming('api.request.duration', duration, [
            `method:${req.method}`,
            `path:${req.route ? req.route.path : req.path}`,
            `status:${statusCode}`
          ]);
        }

        if (typeof monitoringService.recordCounter === 'function') {
          monitoringService.recordCounter('api.request.count', 1, [
            `method:${req.method}`,
            `path:${req.route ? req.route.path : req.path}`,
            `status:${statusCode}`
          ]);
        }

        // Track errors
        if (statusCode >= 400) {
          this.errorCount++;
          if (typeof monitoringService.recordError === 'function') {
            monitoringService.recordError('http_error', {
              statusCode,
              method: req.method,
              path: req.path,
              duration
            });
          }
        }

        // Log for debugging
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${statusCode} - ${duration}ms`);

        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  // Error tracking middleware
  trackErrors() {
    return (error, req, res, next) => {
      this.errorCount++;

      // Record error with context
      if (this.monitoringService.recordError) {
        this.monitoringService.recordError('api_error', error, {
          method: req.method,
          path: req.path,
          userAgent: req.get('user-agent'),
          ip: req.ip,
          userId: req.user ? req.user.id : null,
          requestId: req.headers['x-request-id']
        });
      }

      // Log error details
      console.error(`[${new Date().toISOString()}] API Error:`, {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: this.redactSensitiveData(req.body)
      });

      next(error);
    };
  }

  // System health monitoring
  trackSystemHealth() {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();
      const loadAvg = os.loadavg();

      // Memory metrics
      if (this.monitoringService.recordPerformanceMetric) {
        this.monitoringService.recordPerformanceMetric('system.memory.used', memoryUsage.heapUsed);
        this.monitoringService.recordPerformanceMetric('system.memory.total', memoryUsage.heapTotal);
        this.monitoringService.recordPerformanceMetric('system.memory.external', memoryUsage.external);
        this.monitoringService.recordPerformanceMetric('system.memory.rss', memoryUsage.rss);
      }

      // CPU metrics
      if (this.monitoringService.recordPerformanceMetric) {
        this.monitoringService.recordPerformanceMetric('system.cpu.user', cpuUsage.user);
        this.monitoringService.recordPerformanceMetric('system.cpu.system', cpuUsage.system);
      }

      // System metrics
      if (this.monitoringService.recordPerformanceMetric) {
        this.monitoringService.recordPerformanceMetric('system.uptime', uptime);
        this.monitoringService.recordPerformanceMetric('system.load.1m', loadAvg[0]);
        this.monitoringService.recordPerformanceMetric('system.load.5m', loadAvg[1]);
        this.monitoringService.recordPerformanceMetric('system.load.15m', loadAvg[2]);
      }

      // Application metrics
      if (this.monitoringService.recordPerformanceMetric) {
        this.monitoringService.recordPerformanceMetric('app.requests.total', this.requestCount);
        this.monitoringService.recordPerformanceMetric('app.errors.total', this.errorCount);
        this.monitoringService.recordPerformanceMetric('app.runtime', Date.now() - this.startTime);
      }
    }, 30000); // Every 30 seconds
  }

  // Database query tracking
  trackDatabaseQueries() {
    return (query, params) => {
      if (this.monitoringService.traceDatabaseOperation) {
        return this.monitoringService.traceDatabaseOperation(query.type || 'query', () => {
          // Execute the actual query here
          return query.execute(params);
        });
      }
      
      // Fallback if no tracing available
      return query.execute(params);
    };
  }

  // Redis operation tracking
  trackRedisOperations() {
    return (operation, key, callback) => {
      const startTime = Date.now();
      
      return new Promise((resolve, reject) => {
        callback()
          .then(result => {
            const duration = Date.now() - startTime;
            
            if (this.monitoringService.recordTiming) {
              this.monitoringService.recordTiming('redis.operation.duration', duration, [
                `operation:${operation}`,
                `key:${key}`
              ]);
            }

            if (this.monitoringService.recordCounter) {
              this.monitoringService.recordCounter('redis.operation.count', 1, [
                `operation:${operation}`,
                'status:success'
              ]);
            }

            resolve(result);
          })
          .catch(error => {
            const duration = Date.now() - startTime;
            
            if (this.monitoringService.recordTiming) {
              this.monitoringService.recordTiming('redis.operation.duration', duration, [
                `operation:${operation}`,
                `key:${key}`
              ]);
            }

            if (this.monitoringService.recordCounter) {
              this.monitoringService.recordCounter('redis.operation.count', 1, [
                `operation:${operation}`,
                'status:error'
              ]);
            }

            if (this.monitoringService.recordError) {
              this.monitoringService.recordError('redis_error', error, {
                operation,
                key,
                duration
              });
            }

            reject(error);
          });
      });
    };
  }

  // Business event tracking
  trackBusinessEvents() {
    return {
      userRegistration: (userId, userType, metadata = {}) => {
        if (this.monitoringService.recordCustomEvent) {
          this.monitoringService.recordCustomEvent('UserRegistration', {
            userId,
            userType,
            timestamp: Date.now(),
            ...metadata
          });
        }

        if (this.monitoringService.recordCounter) {
          this.monitoringService.recordCounter('business.user.registration', 1, [
            `type:${userType}`,
            `language:${metadata.language || 'unknown'}`
          ]);
        }
      },

      bookingCreated: (bookingId, providerId, serviceId, amount, metadata = {}) => {
        if (this.monitoringService.recordCustomEvent) {
          this.monitoringService.recordCustomEvent('BookingCreated', {
            bookingId,
            providerId,
            serviceId,
            amount,
            currency: 'JOD',
            timestamp: Date.now(),
            ...metadata
          });
        }

        if (this.monitoringService.recordCounter) {
          this.monitoringService.recordCounter('business.booking.created', 1, [
            `provider:${providerId}`,
            `service:${serviceId}`
          ]);
        }

        if (this.monitoringService.recordPerformanceMetric) {
          this.monitoringService.recordPerformanceMetric('business.booking.amount', amount, [
            'currency:JOD'
          ]);
        }
      },

      paymentProcessed: (paymentId, amount, status, provider, metadata = {}) => {
        // Redact sensitive payment data before sending to external monitoring
        const redactedPaymentId = paymentId ? paymentId.substring(0, 8) + '...' : null;
        const safeMetadata = this.redactSensitiveData(metadata);
        
        if (this.monitoringService.recordCustomEvent) {
          this.monitoringService.recordCustomEvent('PaymentProcessed', {
            paymentId: redactedPaymentId,
            amount: '[REDACTED]', // Never send actual amounts to external services
            status,
            provider,
            currency: 'JOD',
            timestamp: Date.now(),
            ...safeMetadata
          });
        }

        if (this.monitoringService.recordCounter) {
          this.monitoringService.recordCounter('business.payment.processed', 1, [
            `status:${status}`,
            `provider:${provider}`
          ]);
        }

        // Record aggregated metrics without exposing individual amounts
        if (status === 'success' && this.monitoringService.recordCounter) {
          this.monitoringService.recordCounter('business.payment.success_count', 1, [
            'currency:JOD',
            `provider:${provider}`
          ]);
        }
      },

      smsDelivered: (messageId, phoneNumber, status, type, metadata = {}) => {
        if (this.monitoringService.recordCustomEvent) {
          this.monitoringService.recordCustomEvent('SMSDelivered', {
            messageId,
            phoneNumber: phoneNumber.substring(0, 4) + '****' + phoneNumber.substring(phoneNumber.length - 4), // Anonymize
            status,
            type,
            timestamp: Date.now(),
            ...metadata
          });
        }

        if (this.monitoringService.recordCounter) {
          this.monitoringService.recordCounter('business.sms.delivered', 1, [
            `status:${status}`,
            `type:${type}`
          ]);
        }
      }
    };
  }

  // Health check endpoint
  healthCheck() {
    return (req, res) => {
      const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount * 100).toFixed(2) + '%' : '0%'
      };

      res.json(healthData);
    };
  }

  // Graceful shutdown
  shutdown() {
    if (this.monitoringService && this.monitoringService.shutdown) {
      this.monitoringService.shutdown();
    }
  }

  // Helper method to redact sensitive data from objects
  redactSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = [
      'cardNumber', 'cvv', 'cardholderName', 'expiryDate',
      'iban', 'accountNumber', 'amount', 'transactionId',
      'paymentMethod', 'billingAddress', 'customerEmail',
      'phoneNumber', 'password', 'otp', 'token'
    ];
    
    const redacted = { ...data };
    
    for (const field of sensitiveFields) {
      if (redacted[field] !== undefined) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    return redacted;
  }
}

module.exports = MonitoringMiddleware;