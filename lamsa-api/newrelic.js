/**
 * New Relic Agent Configuration for BeautyCort API
 * This file must be the first thing loaded in your application
 */

'use strict';

exports.config = {
  /**
   * Array of application names.
   * @env NEW_RELIC_APP_NAME
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || 'BeautyCort API'],

  /**
   * Your New Relic license key.
   * @env NEW_RELIC_LICENSE_KEY
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY,

  /**
   * Logging level for New Relic agent
   * @env NEW_RELIC_LOG_LEVEL
   */
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: process.env.NEW_RELIC_LOG_FILEPATH || 'stdout'
  },

  /**
   * When true, all request headers except for those listed in attributes.exclude
   * will be captured for all traces, unless otherwise specified in a destination's
   * attributes include/exclude lists.
   */
  allow_all_headers: true,

  /**
   * Attributes configuration
   */
  attributes: {
    /**
     * Prefix of attributes to exclude from all destinations. Allows * as wildcard
     * at end of string.
     */
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  },

  /**
   * Transaction tracer settings
   */
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500
  },

  /**
   * Error collector settings
   */
  error_collector: {
    enabled: true,
    ignore_status_codes: [404]
  },

  /**
   * Browser monitoring settings
   */
  browser_monitoring: {
    enable: false
  },

  /**
   * Application settings
   */
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000
    },
    metrics: {
      enabled: true
    },
    local_decorating: {
      enabled: false
    }
  },

  /**
   * Distributed tracing settings
   */
  distributed_tracing: {
    enabled: true
  },

  /**
   * Security settings
   */
  security: {
    agent: {
      enabled: process.env.NEW_RELIC_SECURITY_AGENT_ENABLED === 'true'
    }
  },

  /**
   * Custom instrumentation for BeautyCort specific modules
   */
  custom_instrumentation: {
    enabled: true
  },

  /**
   * Slow SQL settings
   */
  slow_sql: {
    enabled: true
  },

  /**
   * Custom events settings
   */
  custom_insights_events: {
    enabled: true,
    max_samples_stored: 1000
  },

  /**
   * Application specific settings
   */
  labels: {
    Environment: process.env.NODE_ENV || 'development',
    Region: 'Jordan',
    Service: 'BeautyCort API',
    Version: process.env.npm_package_version || '1.0.0'
  },

  /**
   * Rules for naming or ignoring transactions
   */
  rules: {
    name: [
      // Rename health check endpoints
      { pattern: '/api/health*', name: '/api/health' },
      
      // Group API endpoints by resource
      { pattern: '/api/auth/*', name: '/api/auth/*' },
      { pattern: '/api/users/*', name: '/api/users/*' },
      { pattern: '/api/providers/*', name: '/api/providers/*' },
      { pattern: '/api/bookings/*', name: '/api/bookings/*' },
      { pattern: '/api/payments/*', name: '/api/payments/*' },
      { pattern: '/api/services/*', name: '/api/services/*' },
      { pattern: '/api/reviews/*', name: '/api/reviews/*' }
    ],
    ignore: [
      // Ignore health check endpoints in error collection
      '/api/health',
      '/api/health/database',
      '/api/health/redis',
      
      // Ignore static assets
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml'
    ]
  },

  /**
   * High security mode (recommended for production)
   */
  high_security: process.env.NODE_ENV === 'production',

  /**
   * Proxy settings if needed
   */
  proxy: process.env.NEW_RELIC_PROXY_URL || null,

  /**
   * SSL settings
   */
  certificates: [],

  /**
   * Datastore tracer settings
   */
  datastore_tracer: {
    database_name_reporting: {
      enabled: true
    },
    instance_reporting: {
      enabled: true
    }
  },

  /**
   * Message tracer settings
   */
  message_tracer: {
    segment_parameters: {
      enabled: true
    }
  },

  /**
   * Process host settings
   */
  process_host: {
    display_name: process.env.NEW_RELIC_PROCESS_HOST_DISPLAY_NAME || 'BeautyCort API Server'
  },

  /**
   * Utilization settings
   */
  utilization: {
    detect_aws: true,
    detect_azure: true,
    detect_gcp: true,
    detect_docker: true,
    detect_kubernetes: true
  },

  /**
   * Plugins configuration
   */
  plugins: {
    // Disable New Relic's built-in Express instrumentation if using custom
    'express': {
      enabled: true
    },
    // Custom plugins for BeautyCort
    'supabase': {
      enabled: true
    },
    'redis': {
      enabled: true
    },
    'twilio': {
      enabled: true
    }
  }
};

/**
 * Environment-specific overrides
 */
if (process.env.NODE_ENV === 'production') {
  // Production-specific settings
  exports.config.logging.level = 'warn';
  exports.config.high_security = true;
  exports.config.capture_params = false;
  exports.config.slow_sql.enabled = true;
  exports.config.transaction_tracer.record_sql = 'obfuscated';
} else if (process.env.NODE_ENV === 'development') {
  // Development-specific settings
  exports.config.logging.level = 'debug';
  exports.config.high_security = false;
  exports.config.capture_params = true;
  exports.config.slow_sql.enabled = true;
  exports.config.transaction_tracer.record_sql = 'raw';
}

/**
 * Custom event types for BeautyCort
 */
exports.config.custom_events = {
  // Business events
  'UserRegistration': {
    enabled: true,
    attributes: ['userId', 'userType', 'location', 'language']
  },
  'BookingCreated': {
    enabled: true,
    attributes: ['bookingId', 'providerId', 'serviceId', 'amount', 'currency']
  },
  'PaymentProcessed': {
    enabled: true,
    attributes: ['paymentId', 'amount', 'currency', 'status', 'provider']
  },
  'SMSDelivered': {
    enabled: true,
    attributes: ['messageId', 'phoneNumber', 'status', 'type']
  },
  
  // System events
  'DatabaseConnection': {
    enabled: true,
    attributes: ['connectionTime', 'poolStatus', 'queryCount']
  },
  'RedisOperation': {
    enabled: true,
    attributes: ['operation', 'key', 'responseTime', 'status']
  },
  'APIResponse': {
    enabled: true,
    attributes: ['endpoint', 'method', 'statusCode', 'responseTime']
  }
};