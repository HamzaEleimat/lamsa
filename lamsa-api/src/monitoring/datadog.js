/**
 * DataDog APM Configuration for Lamsa API
 * Alternative monitoring solution to New Relic
 */

'use strict';

const StatsD = require('node-statsd');
const ddTrace = require('dd-trace');

class DataDogMonitoring {
  constructor() {
    this.tracer = ddTrace;
    this.statsD = new StatsD({
      host: process.env.DD_AGENT_HOST || 'localhost',
      port: process.env.DD_AGENT_PORT || 8125,
      prefix: 'lamsa.api.'
    });
    
    this.init();
  }

  init() {
    // Initialize DataDog tracer
    this.tracer.init({
      service: 'lamsa-api',
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      
      // Sampling configuration
      sampling: {
        rate: process.env.DD_TRACE_SAMPLING_RATE || 1.0
      },
      
      // Analytics configuration
      analytics: {
        enabled: true,
        sampleRate: 1.0
      },
      
      // Runtime metrics
      runtimeMetrics: true,
      
      // Profiling
      profiling: {
        enabled: process.env.DD_PROFILING_ENABLED === 'true'
      },
      
      // Tags
      tags: {
        'service.name': 'lamsa-api',
        'service.version': process.env.npm_package_version || '1.0.0',
        'env': process.env.NODE_ENV || 'development',
        'region': 'jordan',
        'currency': 'JOD'
      }
    });

    // Set up custom metrics
    this.setupCustomMetrics();
    
    // Set up error tracking
    this.setupErrorTracking();
  }

  setupCustomMetrics() {
    // Database metrics
    setInterval(() => {
      this.recordDatabaseMetrics();
    }, 30000);

    // Redis metrics
    setInterval(() => {
      this.recordRedisMetrics();
    }, 30000);

    // Business metrics
    setInterval(() => {
      this.recordBusinessMetrics();
    }, 60000);

    // SMS metrics
    setInterval(() => {
      this.recordSMSMetrics();
    }, 60000);

    // Payment metrics
    setInterval(() => {
      this.recordPaymentMetrics();
    }, 60000);
  }

  setupErrorTracking() {
    // Global error handler
    process.on('uncaughtException', (error) => {
      this.recordError('uncaught_exception', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.recordError('unhandled_rejection', reason, { promise });
    });
  }

  // Custom metrics recording
  recordDatabaseMetrics() {
    const metrics = this.getDatabaseMetrics();
    
    this.statsD.gauge('database.connections.active', metrics.active);
    this.statsD.gauge('database.connections.idle', metrics.idle);
    this.statsD.gauge('database.connections.total', metrics.total);
    this.statsD.gauge('database.query.avg_time', metrics.avgQueryTime);
    this.statsD.counter('database.queries.total', metrics.totalQueries);
  }

  recordRedisMetrics() {
    const metrics = this.getRedisMetrics();
    
    this.statsD.gauge('redis.connections.active', metrics.connected);
    this.statsD.gauge('redis.memory.used', metrics.used_memory);
    this.statsD.counter('redis.commands.total', metrics.total_commands);
    this.statsD.gauge('redis.latency.avg', metrics.avgLatency);
  }

  recordBusinessMetrics() {
    const metrics = this.getBusinessMetrics();
    
    // User metrics
    this.statsD.gauge('users.active.daily', metrics.dailyActiveUsers);
    this.statsD.counter('users.registrations.daily', metrics.dailyRegistrations);
    this.statsD.gauge('users.total', metrics.totalUsers);

    // Provider metrics
    this.statsD.gauge('providers.active.total', metrics.activeProviders);
    this.statsD.counter('providers.registrations.daily', metrics.dailyProviderRegistrations);
    this.statsD.gauge('providers.total', metrics.totalProviders);

    // Booking metrics
    this.statsD.counter('bookings.created.daily', metrics.dailyBookings);
    this.statsD.counter('bookings.completed.daily', metrics.dailyCompletedBookings);
    this.statsD.gauge('bookings.avg_value.jod', metrics.avgBookingValue);

    // Revenue metrics
    this.statsD.gauge('revenue.daily.jod', metrics.dailyRevenue);
    this.statsD.gauge('revenue.monthly.jod', metrics.monthlyRevenue);
    this.statsD.gauge('revenue.total.jod', metrics.totalRevenue);
  }

  recordSMSMetrics() {
    const metrics = this.getSMSMetrics();
    
    this.statsD.counter('sms.sent.total', metrics.sent);
    this.statsD.counter('sms.delivered.total', metrics.delivered);
    this.statsD.counter('sms.failed.total', metrics.failed);
    this.statsD.gauge('sms.delivery_rate', metrics.deliveryRate);
    this.statsD.gauge('sms.avg_cost.jod', metrics.avgCost);
  }

  recordPaymentMetrics() {
    const metrics = this.getPaymentMetrics();
    
    this.statsD.counter('payments.successful.total', metrics.successful);
    this.statsD.counter('payments.failed.total', metrics.failed);
    this.statsD.gauge('payments.amount.daily.jod', metrics.dailyAmount);
    this.statsD.gauge('payments.success_rate', metrics.successRate);
    this.statsD.gauge('payments.avg_amount.jod', metrics.avgAmount);
  }

  // Custom span creation
  createSpan(operationName, options = {}) {
    const span = this.tracer.startSpan(operationName, options);
    
    // Add custom tags
    span.setTag('service.name', 'lamsa-api');
    span.setTag('service.version', process.env.npm_package_version || '1.0.0');
    span.setTag('region', 'jordan');
    
    return span;
  }

  // Trace database operations
  traceDatabaseOperation(operationName, callback) {
    const span = this.createSpan(`database.${operationName}`);
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      callback()
        .then(result => {
          const duration = Date.now() - startTime;
          span.setTag('database.operation', operationName);
          span.setTag('database.duration', duration);
          span.setTag('database.status', 'success');
          span.finish();
          
          this.statsD.timing('database.operation.duration', duration, [`operation:${operationName}`]);
          this.statsD.increment('database.operation.count', 1, [`operation:${operationName}`, 'status:success']);
          
          resolve(result);
        })
        .catch(error => {
          const duration = Date.now() - startTime;
          span.setTag('database.operation', operationName);
          span.setTag('database.duration', duration);
          span.setTag('database.status', 'error');
          span.setTag('error', true);
          span.setTag('error.message', error.message);
          span.finish();
          
          this.statsD.timing('database.operation.duration', duration, [`operation:${operationName}`]);
          this.statsD.increment('database.operation.count', 1, [`operation:${operationName}`, 'status:error']);
          
          reject(error);
        });
    });
  }

  // Trace API requests
  traceAPIRequest(method, path, callback) {
    const span = this.createSpan(`api.request`);
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      callback()
        .then(result => {
          const duration = Date.now() - startTime;
          span.setTag('http.method', method);
          span.setTag('http.path', path);
          span.setTag('http.status_code', result.statusCode || 200);
          span.setTag('http.duration', duration);
          span.finish();
          
          this.statsD.timing('api.request.duration', duration, [`method:${method}`, `path:${path}`]);
          this.statsD.increment('api.request.count', 1, [`method:${method}`, `path:${path}`, `status:${result.statusCode || 200}`]);
          
          resolve(result);
        })
        .catch(error => {
          const duration = Date.now() - startTime;
          span.setTag('http.method', method);
          span.setTag('http.path', path);
          span.setTag('http.status_code', error.statusCode || 500);
          span.setTag('http.duration', duration);
          span.setTag('error', true);
          span.setTag('error.message', error.message);
          span.finish();
          
          this.statsD.timing('api.request.duration', duration, [`method:${method}`, `path:${path}`]);
          this.statsD.increment('api.request.count', 1, [`method:${method}`, `path:${path}`, `status:${error.statusCode || 500}`]);
          
          reject(error);
        });
    });
  }

  // Error recording
  recordError(type, error, metadata = {}) {
    const span = this.tracer.activeSpan();
    
    if (span) {
      span.setTag('error', true);
      span.setTag('error.type', type);
      span.setTag('error.message', error.message || error);
      span.setTag('error.stack', error.stack || '');
      
      Object.keys(metadata).forEach(key => {
        span.setTag(`error.${key}`, metadata[key]);
      });
    }
    
    this.statsD.increment('errors.total', 1, [`type:${type}`]);
    
    // Log error for centralized logging
    console.error(`[DataDog] Error recorded: ${type}`, {
      error: error.message || error,
      stack: error.stack,
      metadata
    });
  }

  // Performance monitoring
  recordPerformanceMetric(name, value, tags = []) {
    this.statsD.gauge(name, value, tags);
  }

  recordCounter(name, value = 1, tags = []) {
    this.statsD.increment(name, value, tags);
  }

  recordTiming(name, duration, tags = []) {
    this.statsD.timing(name, duration, tags);
  }

  // Helper methods (implement based on your actual data sources)
  getDatabaseMetrics() {
    // Implement actual database metrics collection
    return {
      active: 0,
      idle: 0,
      total: 0,
      avgQueryTime: 0,
      totalQueries: 0
    };
  }

  getRedisMetrics() {
    // Implement actual Redis metrics collection
    return {
      connected: 0,
      used_memory: 0,
      total_commands: 0,
      avgLatency: 0
    };
  }

  getBusinessMetrics() {
    // Implement actual business metrics collection
    return {
      dailyActiveUsers: 0,
      dailyRegistrations: 0,
      totalUsers: 0,
      activeProviders: 0,
      dailyProviderRegistrations: 0,
      totalProviders: 0,
      dailyBookings: 0,
      dailyCompletedBookings: 0,
      avgBookingValue: 0,
      dailyRevenue: 0,
      monthlyRevenue: 0,
      totalRevenue: 0
    };
  }

  getSMSMetrics() {
    // Implement actual SMS metrics collection
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      deliveryRate: 0,
      avgCost: 0
    };
  }

  getPaymentMetrics() {
    // Implement actual payment metrics collection
    return {
      successful: 0,
      failed: 0,
      dailyAmount: 0,
      successRate: 0,
      avgAmount: 0
    };
  }

  // Graceful shutdown
  shutdown() {
    if (this.statsD) {
      this.statsD.close();
    }
  }
}

module.exports = new DataDogMonitoring();