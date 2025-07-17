/**
 * New Relic APM Configuration for BeautyCort API
 * This file must be loaded first in your application
 */

'use strict';

// Load environment variables
require('dotenv').config();

// New Relic configuration
const newrelic = require('newrelic');

// Custom instrumentation for BeautyCort specific metrics
class BeautyCortMonitoring {
  constructor() {
    this.newrelic = newrelic;
    this.init();
  }

  init() {
    // Custom attributes for all transactions
    this.newrelic.addCustomAttributes({
      'app.name': 'BeautyCort API',
      'app.version': process.env.npm_package_version || '1.0.0',
      'app.environment': process.env.NODE_ENV || 'development',
      'app.region': 'Jordan',
      'app.currency': 'JOD'
    });

    // Set up custom metrics
    this.setupCustomMetrics();
  }

  setupCustomMetrics() {
    // Database connection metrics
    this.recordDatabaseMetrics();
    
    // Redis connection metrics
    this.recordRedisMetrics();
    
    // SMS service metrics
    this.recordSMSMetrics();
    
    // Payment processing metrics
    this.recordPaymentMetrics();
  }

  recordDatabaseMetrics() {
    // Database connection pool metrics
    setInterval(() => {
      const dbMetrics = this.getDatabaseMetrics();
      this.newrelic.recordMetric('Custom/Database/ConnectionPool/Active', dbMetrics.active);
      this.newrelic.recordMetric('Custom/Database/ConnectionPool/Idle', dbMetrics.idle);
      this.newrelic.recordMetric('Custom/Database/ConnectionPool/Total', dbMetrics.total);
    }, 30000); // Every 30 seconds
  }

  recordRedisMetrics() {
    // Redis connection metrics
    setInterval(() => {
      const redisMetrics = this.getRedisMetrics();
      this.newrelic.recordMetric('Custom/Redis/Connections/Active', redisMetrics.connected);
      this.newrelic.recordMetric('Custom/Redis/Memory/Used', redisMetrics.used_memory);
      this.newrelic.recordMetric('Custom/Redis/Commands/Total', redisMetrics.total_commands);
    }, 30000);
  }

  recordSMSMetrics() {
    // SMS delivery metrics
    setInterval(() => {
      const smsMetrics = this.getSMSMetrics();
      this.newrelic.recordMetric('Custom/SMS/Sent/Total', smsMetrics.sent);
      this.newrelic.recordMetric('Custom/SMS/Delivered/Total', smsMetrics.delivered);
      this.newrelic.recordMetric('Custom/SMS/Failed/Total', smsMetrics.failed);
      this.newrelic.recordMetric('Custom/SMS/DeliveryRate', smsMetrics.deliveryRate);
    }, 60000); // Every minute
  }

  recordPaymentMetrics() {
    // Payment processing metrics
    setInterval(() => {
      const paymentMetrics = this.getPaymentMetrics();
      this.newrelic.recordMetric('Custom/Payments/Successful/Total', paymentMetrics.successful);
      this.newrelic.recordMetric('Custom/Payments/Failed/Total', paymentMetrics.failed);
      this.newrelic.recordMetric('Custom/Payments/Amount/JOD', paymentMetrics.totalAmount);
      this.newrelic.recordMetric('Custom/Payments/SuccessRate', paymentMetrics.successRate);
    }, 60000);
  }

  // Custom transaction wrapper
  recordCustomTransaction(name, callback) {
    return this.newrelic.startBackgroundTransaction(name, callback);
  }

  // Record custom events
  recordCustomEvent(eventType, attributes) {
    this.newrelic.recordCustomEvent(eventType, attributes);
  }

  // Add custom attributes to current transaction
  addCustomAttributes(attributes) {
    this.newrelic.addCustomAttributes(attributes);
  }

  // Record business metrics
  recordBusinessMetrics() {
    const businessMetrics = this.getBusinessMetrics();
    
    // User metrics
    this.newrelic.recordMetric('Custom/Users/Active/Daily', businessMetrics.dailyActiveUsers);
    this.newrelic.recordMetric('Custom/Users/Registrations/Daily', businessMetrics.dailyRegistrations);
    
    // Provider metrics
    this.newrelic.recordMetric('Custom/Providers/Active/Total', businessMetrics.activeProviders);
    this.newrelic.recordMetric('Custom/Providers/Bookings/Daily', businessMetrics.dailyBookings);
    
    // Revenue metrics
    this.newrelic.recordMetric('Custom/Revenue/Daily/JOD', businessMetrics.dailyRevenue);
    this.newrelic.recordMetric('Custom/Revenue/Monthly/JOD', businessMetrics.monthlyRevenue);
  }

  // Error tracking
  recordError(error, customAttributes = {}) {
    this.newrelic.recordError(error, customAttributes);
  }

  // Helper methods to get actual metrics (implement based on your data sources)
  getDatabaseMetrics() {
    // Implement actual database metrics collection
    return {
      active: 0,
      idle: 0,
      total: 0
    };
  }

  getRedisMetrics() {
    // Implement actual Redis metrics collection
    return {
      connected: 0,
      used_memory: 0,
      total_commands: 0
    };
  }

  getSMSMetrics() {
    // Implement actual SMS metrics collection
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      deliveryRate: 0
    };
  }

  getPaymentMetrics() {
    // Implement actual payment metrics collection
    return {
      successful: 0,
      failed: 0,
      totalAmount: 0,
      successRate: 0
    };
  }

  getBusinessMetrics() {
    // Implement actual business metrics collection
    return {
      dailyActiveUsers: 0,
      dailyRegistrations: 0,
      activeProviders: 0,
      dailyBookings: 0,
      dailyRevenue: 0,
      monthlyRevenue: 0
    };
  }
}

// Initialize monitoring
const monitoring = new BeautyCortMonitoring();

module.exports = monitoring;