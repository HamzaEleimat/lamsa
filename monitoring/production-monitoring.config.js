/**
 * Production Monitoring Configuration
 * Enhanced monitoring setup for production deployment
 */

module.exports = {
  // New Relic Configuration
  newRelic: {
    appName: process.env.NEW_RELIC_APP_NAME || 'BeautyCort-API-Production',
    licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    logLevel: 'info',
    
    // Custom attributes for better monitoring
    customAttributes: {
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      region: process.env.AWS_REGION || process.env.GCP_REGION || 'unknown',
      cluster: process.env.CLUSTER_NAME || 'default'
    },
    
    // Performance monitoring
    performance: {
      captureParams: false, // Security: Don't capture request params
      ignoredParams: ['password', 'token', 'secret', 'key'],
      recordSql: 'obfuscated',
      explainThreshold: 500 // ms
    },
    
    // Error monitoring
    errorCollector: {
      enabled: true,
      ignoreStatusCodes: [404], // Don't alert on 404s
      expectedStatusCodes: [400, 401, 403, 422], // Expected client errors
      captureEvents: true,
      maxEventSamples: 10000
    },
    
    // Browser monitoring for web app
    browserMonitoring: {
      enabled: true,
      attributes: {
        include: ['request.headers.userAgent', 'request.headers.referer'],
        exclude: ['request.headers.cookie', 'request.headers.authorization']
      }
    }
  },

  // DataDog Configuration (Alternative/Additional)
  datadog: {
    apiKey: process.env.DATADOG_API_KEY,
    appKey: process.env.DATADOG_APP_KEY,
    site: process.env.DATADOG_SITE || 'datadoghq.com',
    
    // APM Configuration
    apm: {
      serviceName: 'beautycort-api',
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      
      // Performance settings
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      runtimeMetrics: true,
      profiling: true
    },
    
    // Custom metrics
    metrics: {
      prefix: 'beautycort.',
      tags: [
        `env:${process.env.NODE_ENV}`,
        `version:${process.env.APP_VERSION || '1.0.0'}`,
        `region:${process.env.AWS_REGION || 'unknown'}`
      ]
    }
  },

  // Sentry Configuration for Error Tracking
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send client errors (4xx) except authentication issues
      if (event.tags && event.tags.statusCode) {
        const statusCode = parseInt(event.tags.statusCode);
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 401 && statusCode !== 403) {
          return null;
        }
      }
      return event;
    },
    
    // Custom integrations
    integrations: [
      // Express integration
      new Sentry.Integrations.Express({ app: true }),
      // Console integration for capturing console errors
      new Sentry.Integrations.Console(),
      // HTTP integration for capturing HTTP requests
      new Sentry.Integrations.Http({ tracing: true })
    ]
  },

  // Prometheus Metrics Configuration
  prometheus: {
    enabled: process.env.ENABLE_PROMETHEUS === 'true',
    port: process.env.PROMETHEUS_PORT || 9090,
    endpoint: '/metrics',
    
    // Default metrics
    defaultMetrics: {
      enabled: true,
      timeout: 5000,
      prefix: 'beautycort_'
    },
    
    // Custom business metrics
    customMetrics: {
      // API metrics
      httpRequestDuration: {
        name: 'http_request_duration_ms',
        help: 'Duration of HTTP requests in ms',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 5, 15, 50, 100, 500, 1000, 5000]
      },
      httpRequestTotal: {
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code']
      },
      
      // Business metrics
      userRegistrations: {
        name: 'user_registrations_total',
        help: 'Total number of user registrations',
        labelNames: ['source', 'type']
      },
      bookingsCreated: {
        name: 'bookings_created_total',
        help: 'Total number of bookings created',
        labelNames: ['service_type', 'provider_category']
      },
      paymentsProcessed: {
        name: 'payments_processed_total',
        help: 'Total number of payments processed',
        labelNames: ['payment_method', 'status', 'currency']
      },
      
      // Performance metrics
      databaseQueries: {
        name: 'database_queries_duration_ms',
        help: 'Duration of database queries in ms',
        labelNames: ['operation', 'table', 'status'],
        buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
      },
      redisOperations: {
        name: 'redis_operations_duration_ms',
        help: 'Duration of Redis operations in ms',
        labelNames: ['operation', 'status'],
        buckets: [0.1, 1, 5, 10, 25, 50, 100]
      }
    }
  },

  // Health Check Configuration
  healthChecks: {
    endpoint: '/api/health',
    detailed: '/api/health/detailed',
    
    // Individual service checks
    checks: {
      database: {
        name: 'Supabase Database',
        timeout: 5000,
        critical: true
      },
      redis: {
        name: 'Redis Cache',
        timeout: 3000,
        critical: true
      },
      externalAPIs: {
        name: 'External API Dependencies',
        timeout: 10000,
        critical: false,
        endpoints: [
          { name: 'Tap Payment', url: process.env.TAP_API_URL },
          { name: 'Twilio SMS', url: 'https://api.twilio.com' }
        ]
      }
    },
    
    // Health check intervals
    intervals: {
      internal: 30000, // 30 seconds for internal checks
      external: 300000 // 5 minutes for external dependency checks
    }
  },

  // Alerting Configuration
  alerting: {
    // PagerDuty Configuration
    pagerDuty: {
      serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
      enabled: process.env.NODE_ENV === 'production',
      
      // Alert thresholds
      thresholds: {
        errorRate: 0.05, // 5% error rate
        responseTime: 2000, // 2 seconds average response time
        databaseConnections: 80, // 80% of max connections
        memoryUsage: 85, // 85% memory usage
        cpuUsage: 80 // 80% CPU usage
      }
    },
    
    // Slack Integration
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channels: {
        critical: '#alerts-critical',
        warnings: '#alerts-warnings',
        deployments: '#deployments',
        general: '#engineering'
      },
      
      // Alert levels
      levels: {
        critical: {
          channel: '#alerts-critical',
          mention: '@channel',
          emoji: '🚨'
        },
        warning: {
          channel: '#alerts-warnings',
          mention: '@here',
          emoji: '⚠️'
        },
        info: {
          channel: '#engineering',
          mention: '',
          emoji: 'ℹ️'
        }
      }
    },
    
    // Email Alerts
    email: {
      enabled: process.env.ENABLE_EMAIL_ALERTS === 'true',
      provider: 'sendgrid', // or 'ses', 'mailgun'
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.ALERT_FROM_EMAIL || 'alerts@welamsa.com',
      
      // Distribution lists
      recipients: {
        critical: process.env.CRITICAL_ALERT_EMAILS?.split(',') || [],
        warnings: process.env.WARNING_ALERT_EMAILS?.split(',') || [],
        deployments: process.env.DEPLOYMENT_ALERT_EMAILS?.split(',') || []
      }
    }
  },

  // Log Aggregation
  logging: {
    // ELK Stack Configuration
    elasticsearch: {
      enabled: process.env.ENABLE_ELASTICSEARCH === 'true',
      host: process.env.ELASTICSEARCH_HOST,
      port: process.env.ELASTICSEARCH_PORT || 9200,
      index: `beautycort-${process.env.NODE_ENV}`,
      
      // Log levels to send to ELK
      levels: ['error', 'warn', 'info'],
      
      // Fields to include
      includeFields: ['timestamp', 'level', 'message', 'userId', 'requestId', 'method', 'path']
    },
    
    // CloudWatch Configuration (AWS)
    cloudWatch: {
      enabled: process.env.ENABLE_CLOUDWATCH === 'true',
      logGroupName: `/aws/beautycort/${process.env.NODE_ENV}`,
      region: process.env.AWS_REGION,
      
      // Log retention
      retentionInDays: process.env.NODE_ENV === 'production' ? 90 : 30
    },
    
    // Structured logging format
    format: {
      timestamp: true,
      level: true,
      message: true,
      metadata: true,
      
      // Additional context
      contextFields: [
        'userId',
        'requestId', 
        'sessionId',
        'userAgent',
        'ip',
        'method',
        'path',
        'statusCode',
        'responseTime',
        'environment',
        'version'
      ]
    }
  },

  // Performance Monitoring Dashboards
  dashboards: {
    grafana: {
      enabled: process.env.ENABLE_GRAFANA === 'true',
      url: process.env.GRAFANA_URL,
      apiKey: process.env.GRAFANA_API_KEY,
      
      // Dashboard configurations
      dashboards: [
        {
          name: 'API Performance',
          panels: ['response_times', 'error_rates', 'throughput', 'database_performance']
        },
        {
          name: 'Business Metrics',
          panels: ['user_registrations', 'bookings', 'payments', 'provider_metrics']
        },
        {
          name: 'Infrastructure',
          panels: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_traffic']
        }
      ]
    },
    
    // New Relic Dashboards
    newRelicDashboards: {
      enabled: process.env.ENABLE_NEWRELIC === 'true',
      
      // Custom dashboard widgets
      widgets: [
        {
          title: 'API Response Time by Endpoint',
          nrql: 'SELECT average(duration) FROM Transaction WHERE appName = "BeautyCort-API-Production" FACET name TIMESERIES'
        },
        {
          title: 'Error Rate by Status Code',
          nrql: 'SELECT count(*) FROM Transaction WHERE appName = "BeautyCort-API-Production" AND error IS true FACET httpResponseCode TIMESERIES'
        },
        {
          title: 'Top 10 Slowest Transactions',
          nrql: 'SELECT average(duration) FROM Transaction WHERE appName = "BeautyCort-API-Production" FACET name ORDER BY average(duration) DESC LIMIT 10'
        }
      ]
    }
  },

  // Uptime Monitoring
  uptimeMonitoring: {
    // Pingdom Configuration
    pingdom: {
      enabled: process.env.ENABLE_PINGDOM === 'true',
      apiKey: process.env.PINGDOM_API_KEY,
      
      // Checks to configure
      checks: [
        {
          name: 'BeautyCort API Health',
          url: `${process.env.API_BASE_URL}/api/health`,
          interval: 60, // 1 minute
          expectedStatus: 200
        },
        {
          name: 'BeautyCort Web Dashboard',
          url: `${process.env.WEB_BASE_URL}/health`,
          interval: 300, // 5 minutes
          expectedStatus: 200
        },
        {
          name: 'Authentication Flow',
          url: `${process.env.API_BASE_URL}/api/auth/health`,
          interval: 300,
          expectedStatus: 200
        }
      ]
    },
    
    // StatusCake Configuration
    statusCake: {
      enabled: process.env.ENABLE_STATUSCAKE === 'true',
      apiKey: process.env.STATUSCAKE_API_KEY,
      
      // Test configurations
      tests: [
        {
          testName: 'BeautyCort API',
          testURL: `${process.env.API_BASE_URL}/api/health`,
          checkRate: 300, // 5 minutes
          testType: 'HTTP',
          contactGroup: process.env.STATUSCAKE_CONTACT_GROUP
        }
      ]
    }
  }
};