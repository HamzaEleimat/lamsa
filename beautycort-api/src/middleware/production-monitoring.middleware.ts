/**
 * Production Monitoring Middleware
 * Enhanced monitoring for production deployment
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// Import monitoring services
const monitoringConfig = require('../../../monitoring/production-monitoring.config.js');

// Types
interface MonitoringRequest extends Request {
  startTime?: number;
  requestId?: string;
  userId?: string;
}

interface AlertMetrics {
  errorRate: number;
  avgResponseTime: number;
  requestsPerMinute: number;
  activeConnections: number;
}

class ProductionMonitoringMiddleware {
  private static instance: ProductionMonitoringMiddleware;
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private alertMetrics: AlertMetrics = {
    errorRate: 0,
    avgResponseTime: 0,
    requestsPerMinute: 0,
    activeConnections: 0
  };

  private constructor() {
    // Initialize monitoring services
    this.initializeMonitoring();
    
    // Start metrics collection intervals
    this.startMetricsCollection();
  }

  public static getInstance(): ProductionMonitoringMiddleware {
    if (!ProductionMonitoringMiddleware.instance) {
      ProductionMonitoringMiddleware.instance = new ProductionMonitoringMiddleware();
    }
    return ProductionMonitoringMiddleware.instance;
  }

  /**
   * Initialize monitoring services
   */
  private initializeMonitoring(): void {
    // Initialize New Relic if configured
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      try {
        require('newrelic');
        console.log('✅ New Relic monitoring initialized');
      } catch (error) {
        console.warn('⚠️ New Relic initialization failed:', error.message);
      }
    }

    // Initialize Sentry if configured
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = require('@sentry/node');
        const Tracing = require('@sentry/tracing');
        
        Sentry.init(monitoringConfig.sentry);
        console.log('✅ Sentry error tracking initialized');
      } catch (error) {
        console.warn('⚠️ Sentry initialization failed:', error.message);
      }
    }

    // Initialize Prometheus if configured
    if (monitoringConfig.prometheus.enabled) {
      try {
        this.initializePrometheus();
        console.log('✅ Prometheus metrics initialized');
      } catch (error) {
        console.warn('⚠️ Prometheus initialization failed:', error.message);
      }
    }
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializePrometheus(): void {
    const promClient = require('prom-client');
    
    // Enable default metrics
    if (monitoringConfig.prometheus.defaultMetrics.enabled) {
      promClient.collectDefaultMetrics({
        timeout: monitoringConfig.prometheus.defaultMetrics.timeout,
        prefix: monitoringConfig.prometheus.defaultMetrics.prefix
      });
    }

    // Create custom metrics
    const customMetrics = monitoringConfig.prometheus.customMetrics;
    
    // HTTP request metrics
    this.httpRequestDuration = new promClient.Histogram(customMetrics.httpRequestDuration);
    this.httpRequestTotal = new promClient.Counter(customMetrics.httpRequestTotal);
    
    // Business metrics
    this.userRegistrations = new promClient.Counter(customMetrics.userRegistrations);
    this.bookingsCreated = new promClient.Counter(customMetrics.bookingsCreated);
    this.paymentsProcessed = new promClient.Counter(customMetrics.paymentsProcessed);
    
    // Performance metrics
    this.databaseQueries = new promClient.Histogram(customMetrics.databaseQueries);
    this.redisOperations = new promClient.Histogram(customMetrics.redisOperations);
  }

  /**
   * Start metrics collection intervals
   */
  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
      this.checkAlertThresholds();
    }, 60000);

    // Reset counters every minute for rate calculations
    setInterval(() => {
      this.resetRateCounters();
    }, 60000);
  }

  /**
   * Request monitoring middleware
   */
  public requestMonitoring() {
    return (req: MonitoringRequest, res: Response, next: NextFunction) => {
      // Add request start time
      req.startTime = performance.now();
      
      // Generate request ID if not present
      if (!req.requestId) {
        req.requestId = this.generateRequestId();
      }

      // Extract user ID from JWT token
      if (req.user && req.user.id) {
        req.userId = req.user.id;
      }

      // Increment request counter
      const routeKey = `${req.method}:${req.route?.path || req.path}`;
      this.requestCounts.set(routeKey, (this.requestCounts.get(routeKey) || 0) + 1);

      // Monitor response
      res.on('finish', () => {
        this.recordResponse(req, res);
      });

      next();
    };
  }

  /**
   * Error monitoring middleware
   */
  public errorMonitoring() {
    return (error: Error, req: MonitoringRequest, res: Response, next: NextFunction) => {
      // Record error metrics
      this.recordError(error, req, res);
      
      // Send to monitoring services
      this.sendErrorToMonitoring(error, req);
      
      next(error);
    };
  }

  /**
   * Business metrics tracking
   */
  public trackBusinessMetric(metric: string, labels: Record<string, string> = {}): void {
    try {
      switch (metric) {
        case 'user_registration':
          if (this.userRegistrations) {
            this.userRegistrations.inc(labels);
          }
          break;
        case 'booking_created':
          if (this.bookingsCreated) {
            this.bookingsCreated.inc(labels);
          }
          break;
        case 'payment_processed':
          if (this.paymentsProcessed) {
            this.paymentsProcessed.inc(labels);
          }
          break;
      }

      // Send to New Relic as custom event
      if (global.newrelic) {
        global.newrelic.recordCustomEvent('BusinessMetric', {
          metric,
          ...labels,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('Failed to track business metric:', error.message);
    }
  }

  /**
   * Database query performance tracking
   */
  public trackDatabaseQuery(operation: string, table: string, duration: number, success: boolean): void {
    try {
      if (this.databaseQueries) {
        this.databaseQueries
          .labels(operation, table, success ? 'success' : 'error')
          .observe(duration);
      }

      // Send to New Relic
      if (global.newrelic) {
        global.newrelic.recordCustomEvent('DatabaseQuery', {
          operation,
          table,
          duration,
          success,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('Failed to track database query:', error.message);
    }
  }

  /**
   * Redis operation performance tracking
   */
  public trackRedisOperation(operation: string, duration: number, success: boolean): void {
    try {
      if (this.redisOperations) {
        this.redisOperations
          .labels(operation, success ? 'success' : 'error')
          .observe(duration);
      }

      // Send to New Relic
      if (global.newrelic) {
        global.newrelic.recordCustomEvent('RedisOperation', {
          operation,
          duration,
          success,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('Failed to track Redis operation:', error.message);
    }
  }

  /**
   * Record response metrics
   */
  private recordResponse(req: MonitoringRequest, res: Response): void {
    const duration = performance.now() - (req.startTime || 0);
    const routeKey = `${req.method}:${req.route?.path || req.path}`;
    
    // Store response time
    this.responseTimes.push(duration);
    
    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Record in Prometheus
    if (this.httpRequestDuration && this.httpRequestTotal) {
      const labels = {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode.toString()
      };
      
      this.httpRequestDuration.labels(labels).observe(duration);
      this.httpRequestTotal.labels(labels).inc();
    }

    // Send to New Relic
    if (global.newrelic) {
      global.newrelic.recordCustomEvent('HTTPRequest', {
        method: req.method,
        route: req.route?.path || req.path,
        statusCode: res.statusCode,
        duration,
        userId: req.userId,
        requestId: req.requestId,
        userAgent: req.headers['user-agent'],
        timestamp: Date.now()
      });
    }
  }

  /**
   * Record error metrics
   */
  private recordError(error: Error, req: MonitoringRequest, res: Response): void {
    const routeKey = `${req.method}:${req.route?.path || req.path}`;
    this.errorCounts.set(routeKey, (this.errorCounts.get(routeKey) || 0) + 1);

    // Send to New Relic
    if (global.newrelic) {
      global.newrelic.recordCustomEvent('APIError', {
        errorMessage: error.message,
        errorStack: error.stack,
        method: req.method,
        route: req.route?.path || req.path,
        statusCode: res.statusCode,
        userId: req.userId,
        requestId: req.requestId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send error to monitoring services
   */
  private sendErrorToMonitoring(error: Error, req: MonitoringRequest): void {
    // Send to Sentry
    if (global.Sentry) {
      global.Sentry.withScope(scope => {
        scope.setTag('route', req.route?.path || req.path);
        scope.setTag('method', req.method);
        scope.setUser({ id: req.userId });
        scope.setContext('request', {
          requestId: req.requestId,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
        global.Sentry.captureException(error);
      });
    }

    // Send to New Relic
    if (global.newrelic) {
      global.newrelic.noticeError(error, {
        route: req.route?.path || req.path,
        method: req.method,
        userId: req.userId,
        requestId: req.requestId
      });
    }
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    // Calculate error rate
    const totalRequests = Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    this.alertMetrics.errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Calculate average response time
    this.alertMetrics.avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    // Calculate requests per minute
    this.alertMetrics.requestsPerMinute = totalRequests;

    // Get active connections (approximate)
    this.alertMetrics.activeConnections = process.listenerCount('connection');
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(): void {
    const thresholds = monitoringConfig.alerting.pagerDuty.thresholds;
    
    // Check error rate
    if (this.alertMetrics.errorRate > thresholds.errorRate) {
      this.sendAlert('critical', 'High Error Rate', 
        `Error rate is ${(this.alertMetrics.errorRate * 100).toFixed(2)}% (threshold: ${(thresholds.errorRate * 100).toFixed(2)}%)`);
    }

    // Check response time
    if (this.alertMetrics.avgResponseTime > thresholds.responseTime) {
      this.sendAlert('warning', 'High Response Time', 
        `Average response time is ${this.alertMetrics.avgResponseTime.toFixed(2)}ms (threshold: ${thresholds.responseTime}ms)`);
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > thresholds.memoryUsage) {
      this.sendAlert('warning', 'High Memory Usage', 
        `Memory usage is ${memoryUsagePercent.toFixed(2)}% (threshold: ${thresholds.memoryUsage}%)`);
    }
  }

  /**
   * Send alert notification
   */
  private sendAlert(level: 'critical' | 'warning' | 'info', title: string, message: string): void {
    try {
      // Send to Slack
      if (monitoringConfig.alerting.slack.webhookUrl) {
        this.sendSlackAlert(level, title, message);
      }

      // Send to PagerDuty for critical alerts
      if (level === 'critical' && monitoringConfig.alerting.pagerDuty.enabled) {
        this.sendPagerDutyAlert(title, message);
      }

      // Send email alert
      if (monitoringConfig.alerting.email.enabled) {
        this.sendEmailAlert(level, title, message);
      }
    } catch (error) {
      console.error('Failed to send alert:', error.message);
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(level: 'critical' | 'warning' | 'info', title: string, message: string): Promise<void> {
    const config = monitoringConfig.alerting.slack.levels[level];
    const payload = {
      channel: config.channel,
      text: `${config.emoji} ${config.mention} *${title}*\n${message}`,
      username: 'BeautyCort Monitoring',
      icon_emoji: ':warning:'
    };

    // Implementation would use axios or fetch to send to Slack webhook
    console.log('Slack alert would be sent:', payload);
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(title: string, message: string): Promise<void> {
    // Implementation would use PagerDuty API
    console.log('PagerDuty alert would be sent:', { title, message });
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(level: 'critical' | 'warning' | 'info', title: string, message: string): Promise<void> {
    // Implementation would use SendGrid, SES, or other email service
    console.log('Email alert would be sent:', { level, title, message });
  }

  /**
   * Reset rate counters
   */
  private resetRateCounters(): void {
    this.requestCounts.clear();
    this.errorCounts.clear();
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): AlertMetrics {
    return { ...this.alertMetrics };
  }

  /**
   * Health check for monitoring services
   */
  public async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const services = {
      newRelic: !!global.newrelic,
      sentry: !!global.Sentry,
      prometheus: monitoringConfig.prometheus.enabled
    };

    const allHealthy = Object.values(services).every(status => status);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services
    };
  }

  // Prometheus metrics (if initialized)
  private httpRequestDuration?: any;
  private httpRequestTotal?: any;
  private userRegistrations?: any;
  private bookingsCreated?: any;
  private paymentsProcessed?: any;
  private databaseQueries?: any;
  private redisOperations?: any;
}

// Export singleton instance
export const productionMonitoring = ProductionMonitoringMiddleware.getInstance();
export default ProductionMonitoringMiddleware;