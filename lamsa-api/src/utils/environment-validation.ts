/**
 * Environment Variable Validation Utility
 * Ensures all required environment variables are set and secure
 */

import { logger } from './logger';

export interface EnvironmentConfig {
  // Core Configuration
  NODE_ENV: string;
  PORT: string;
  APP_NAME: string;
  APP_VERSION: string;
  DEFAULT_LANGUAGE: string;
  CURRENCY: string;
  TIMEZONE: string;
  
  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
  ENABLE_SESSION_ROTATION?: string;
  MAX_CONCURRENT_SESSIONS?: string;
  SESSION_SECRET?: string;
  
  // Database
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  DATABASE_URL?: string;
  DATABASE_POOL_MIN?: string;
  DATABASE_POOL_MAX?: string;
  
  // Redis Cache
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_DB?: string;
  REDIS_MAX_RETRIES?: string;
  REDIS_RETRY_DELAY?: string;
  CACHE_TTL?: string;
  
  // Payment Gateway (Tap)
  TAP_SECRET_KEY?: string;
  TAP_PUBLIC_KEY?: string;
  TAP_API_URL?: string;
  TAP_WEBHOOK_SECRET?: string;
  
  // SMS Service (Blunet)
  BLUNET_BASE_URL?: string;
  BLUNET_PORT?: string;
  BLUNET_USERNAME?: string;
  BLUNET_PASSWORD?: string;
  BLUNET_SENDER_ID?: string;
  BLUNET_ACCESS_KEY?: string;
  
  // Push Notifications
  EXPO_PUSH_TOKEN?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  
  // Monitoring
  NEW_RELIC_LICENSE_KEY?: string;
  NEW_RELIC_APP_NAME?: string;
  ENABLE_NEWRELIC?: string;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  SENTRY_RELEASE?: string;
  ENABLE_PROMETHEUS?: string;
  PROMETHEUS_PORT?: string;
  ENABLE_PERFORMANCE_MONITORING?: string;
  
  // Alerting
  SLACK_WEBHOOK_URL?: string;
  SLACK_CHANNEL_CRITICAL?: string;
  SLACK_CHANNEL_WARNINGS?: string;
  SENDGRID_API_KEY?: string;
  ALERT_FROM_EMAIL?: string;
  CRITICAL_ALERT_EMAILS?: string;
  PAGERDUTY_SERVICE_KEY?: string;
  ENABLE_PAGERDUTY?: string;
  
  // Security
  PII_ENCRYPTION_KEY: string;
  PII_HASH_SALT?: string;
  CORS_ORIGINS?: string;
  CORS_CREDENTIALS?: string;
  ENABLE_RATE_LIMITING?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  SKIP_RATE_LIMIT?: string;
  ENABLE_HELMET?: string;
  HSTS_MAX_AGE?: string;
  COOKIE_SECURE?: string;
  COOKIE_SAME_SITE?: string;
  
  // Backup
  BACKUP_PROVIDER?: string;
  BACKUP_RETENTION_DAYS?: string;
  BACKUP_COMPRESSION?: string;
  BACKUP_ENCRYPTION?: string;
  BACKUP_ENCRYPTION_KEY?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  AWS_BACKUP_BUCKET?: string;
  
  // Logging
  LOG_LEVEL?: string;
  ENABLE_MORGAN_LOGGING?: string;
  ENABLE_DETAILED_LOGGING?: string;
  ENABLE_ELASTICSEARCH?: string;
  ENABLE_CLOUDWATCH?: string;
  
  // CDN & Assets
  CDN_URL?: string;
  STATIC_ASSETS_URL?: string;
  ENABLE_CDN?: string;
  
  // Health Check
  HEALTH_CHECK_URL?: string;
  HEALTH_CHECK_TIMEOUT?: string;
  ENABLE_DETAILED_HEALTH?: string;
  
  // Feature Flags
  ENABLE_SWAGGER?: string;
  ENABLE_WEBSOCKETS?: string;
  ENABLE_CACHING?: string;
  ENABLE_COMPRESSION?: string;
  ENABLE_DEBUG?: string;
  ENABLE_MOCK_PAYMENTS?: string;
  ENABLE_MOCK_SMS?: string;
  
  // Business Configuration
  DEFAULT_CURRENCY?: string;
  VAT_RATE?: string;
  DEFAULT_OPEN_TIME?: string;
  DEFAULT_CLOSE_TIME?: string;
  
  // Deployment
  DEPLOYMENT_PLATFORM?: string;
  CLUSTER_NAME?: string;
  NAMESPACE?: string;
  MIN_REPLICAS?: string;
  MAX_REPLICAS?: string;
  TARGET_CPU_UTILIZATION?: string;
}

interface ValidationRule {
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => void;
  productionRequired?: boolean;
}

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Environment variable validation rules
   */
  private validationRules: Partial<Record<keyof EnvironmentConfig, ValidationRule>> = {
    // Core (always required)
    NODE_ENV: { required: true, validator: this.validateNodeEnv.bind(this) },
    PORT: { required: true, defaultValue: '3000' },
    APP_NAME: { required: true, defaultValue: 'Lamsa' },
    APP_VERSION: { required: true, defaultValue: '1.0.0' },
    DEFAULT_LANGUAGE: { required: true, defaultValue: 'ar' },
    CURRENCY: { required: true, defaultValue: 'JOD' },
    TIMEZONE: { required: true, defaultValue: 'Asia/Amman' },
    
    // Authentication (always required)
    JWT_SECRET: { required: true, validator: this.validateJWTSecret.bind(this) },
    JWT_EXPIRES_IN: { required: true, defaultValue: '15m' },
    REFRESH_TOKEN_EXPIRES_IN: { required: true, defaultValue: '7d' },
    
    // Database (always required)
    SUPABASE_URL: { required: true, validator: this.validateSupabaseURL.bind(this) },
    SUPABASE_ANON_KEY: { required: true, validator: this.validateSupabaseKey.bind(this) },
    SUPABASE_SERVICE_KEY: { required: true, validator: this.validateSupabaseKey.bind(this) },
    
    // Security (always required)
    PII_ENCRYPTION_KEY: { required: true, validator: this.validatePIIEncryptionKey.bind(this) },
    
    // Production-specific requirements
    REDIS_PASSWORD: { required: false, productionRequired: true, validator: this.validateRedisPassword.bind(this) },
    SESSION_SECRET: { required: false, productionRequired: true, validator: this.validateSessionSecret.bind(this) },
    SENTRY_DSN: { required: false, productionRequired: true },
    SLACK_WEBHOOK_URL: { required: false, productionRequired: true },
    BACKUP_ENCRYPTION_KEY: { required: false, productionRequired: true, validator: this.validateEncryptionKey.bind(this) },
    
    // Optional with validation
    LOG_LEVEL: { required: false, defaultValue: 'info', validator: this.validateLogLevel.bind(this) },
    ENABLE_RATE_LIMITING: { required: false, defaultValue: 'true' },
    ENABLE_HELMET: { required: false, defaultValue: 'true' },
    COOKIE_SECURE: { required: false, defaultValue: this.isProduction ? 'true' : 'false' },
  };

  /**
   * Validates all environment variables
   */
  validate(): EnvironmentConfig {
    this.errors = [];
    this.warnings = [];

    const config: Partial<EnvironmentConfig> = {};

    // Validate each configured rule
    for (const [key, rule] of Object.entries(this.validationRules)) {
      const value = this.validateVariable(key as keyof EnvironmentConfig, rule);
      if (value !== undefined) {
        config[key as keyof EnvironmentConfig] = value;
      }
    }

    // Add remaining environment variables without validation
    this.addRemainingVariables(config);

    // Perform cross-variable validations
    this.performCrossValidations(config);

    // Report results
    if (this.errors.length > 0) {
      console.error('❌ Environment validation failed:');
      this.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error(`Environment validation failed: ${this.errors.join(', ')}`);
    }

    if (this.warnings.length > 0) {
      console.warn('⚠️  Environment warnings:');
      this.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    console.log('✅ Environment validation passed');
    return config as EnvironmentConfig;
  }

  private validateVariable(key: keyof EnvironmentConfig, rule: ValidationRule): string | undefined {
    const value = process.env[key];
    
    // Check if required
    if (rule.required || (rule.productionRequired && this.isProduction)) {
      if (!value || value.trim() === '') {
        if (rule.defaultValue !== undefined) {
          this.warnings.push(`${key} not set, using default: ${rule.defaultValue}`);
          return rule.defaultValue;
        } else {
          this.errors.push(`${key} is required but not set`);
          return undefined;
        }
      }
    }

    // Return if not set and not required
    if (!value) {
      return rule.defaultValue;
    }

    const trimmedValue = value.trim();

    // Run custom validator if provided
    if (rule.validator && trimmedValue) {
      rule.validator(trimmedValue);
    }

    return trimmedValue;
  }

  private addRemainingVariables(config: Partial<EnvironmentConfig>): void {
    // Add all other environment variables that don't have specific rules
    const envVars = [
      'DATABASE_URL', 'DATABASE_POOL_MIN', 'DATABASE_POOL_MAX',
      'REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_DB',
      'TAP_SECRET_KEY', 'TAP_PUBLIC_KEY', 'TAP_API_URL', 'TAP_WEBHOOK_SECRET',
      'BLUNET_BASE_URL', 'BLUNET_USERNAME', 'BLUNET_PASSWORD', 'BLUNET_SENDER_ID',
      'ENABLE_SWAGGER', 'ENABLE_WEBSOCKETS', 'ENABLE_CACHING',
      'CDN_URL', 'STATIC_ASSETS_URL', 'GOOGLE_MAPS_API_KEY',
      // Add more as needed
    ];

    envVars.forEach(key => {
      if (process.env[key] && !config[key as keyof EnvironmentConfig]) {
        config[key as keyof EnvironmentConfig] = process.env[key];
      }
    });
  }

  private performCrossValidations(config: Partial<EnvironmentConfig>): void {
    // Redis configuration check
    if (config.REDIS_URL && !config.REDIS_PASSWORD && this.isProduction) {
      this.errors.push('REDIS_PASSWORD is required when REDIS_URL is set in production');
    }

    // Payment gateway check
    if (config.TAP_SECRET_KEY && !config.TAP_PUBLIC_KEY) {
      this.warnings.push('TAP_PUBLIC_KEY should be set when TAP_SECRET_KEY is configured');
    }

    // Monitoring check
    if (this.isProduction && !config.SENTRY_DSN && !config.NEW_RELIC_LICENSE_KEY) {
      this.warnings.push('No error monitoring configured (Sentry or New Relic recommended for production)');
    }

    // Backup check
    if (this.isProduction && config.BACKUP_ENCRYPTION === 'true' && !config.BACKUP_ENCRYPTION_KEY) {
      this.errors.push('BACKUP_ENCRYPTION_KEY is required when BACKUP_ENCRYPTION is enabled');
    }

    // Feature flag consistency
    if (config.ENABLE_DEBUG === 'true' && this.isProduction) {
      this.errors.push('ENABLE_DEBUG must be false in production');
    }

    if (config.ENABLE_MOCK_PAYMENTS === 'true' && this.isProduction) {
      this.errors.push('ENABLE_MOCK_PAYMENTS must be false in production');
    }
  }

  private validateNodeEnv(value: string): void {
    const validEnvs = ['development', 'test', 'production'];
    if (!validEnvs.includes(value)) {
      this.warnings.push(`NODE_ENV "${value}" is not standard. Use: ${validEnvs.join(', ')}`);
    }
  }

  private validateJWTSecret(secret: string): void {
    if (secret.length < 32) {
      this.errors.push('JWT_SECRET must be at least 32 characters long');
    }

    if (this.isProduction && secret.length < 64) {
      this.errors.push('JWT_SECRET must be at least 64 characters in production');
    }

    const weakPatterns = [
      /^[a-z]+$/, // Only lowercase
      /^[A-Z]+$/, // Only uppercase
      /^[0-9]+$/, // Only numbers
      /^(.)\1+$/, // Repeated characters
    ];

    if (weakPatterns.some(pattern => pattern.test(secret))) {
      this.errors.push('JWT_SECRET is too weak. Use a cryptographically secure random string');
    }

    const commonWords = ['secret', 'password', 'key', 'jwt', 'token', 'lamsa', 'test', 'default'];
    // Allow local Supabase JWT secret for development
    const isLocalSupabaseSecret = secret === 'super-secret-jwt-token-with-at-least-32-characters-long';
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (commonWords.some(word => secret.toLowerCase().includes(word)) && !isLocalSupabaseSecret && !isDevelopment) {
      this.errors.push('JWT_SECRET contains common words. Generate a secure random string');
    }
  }

  private validateSupabaseURL(url: string): void {
    // Allow local development URLs
    const isLocalDev = url.includes('127.0.0.1:54321') || url.includes('localhost:54321');
    
    if (!url.startsWith('https://') && !isLocalDev) {
      this.errors.push('SUPABASE_URL must start with https:// (except for local development)');
    }

    if (url.includes('localhost') && this.isProduction) {
      this.errors.push('Cannot use localhost SUPABASE_URL in production');
    }

    if (!url.includes('.supabase' + '.co') && !isLocalDev) {
      this.warnings.push('SUPABASE_URL does not match expected Supabase format');
    }
  }

  private validateSupabaseKey(key: string): void {
    if (key.length < 100) {
      this.warnings.push('Supabase key seems shorter than expected');
    }

    // Basic JWT structure check
    const parts = key.split('.');
    if (parts.length !== 3) {
      this.warnings.push('Supabase key does not appear to be a valid JWT');
    }
  }

  private validateRedisPassword(password: string): void {
    if (password.length < 16) {
      this.errors.push('REDIS_PASSWORD should be at least 16 characters');
    }

    if (password === 'lamsa123' || password.includes('default') || password.includes('password')) {
      this.errors.push('REDIS_PASSWORD contains weak or default values');
    }
  }

  private validateSessionSecret(secret: string): void {
    if (secret.length < 32) {
      this.errors.push('SESSION_SECRET must be at least 32 characters');
    }
  }

  private validateEncryptionKey(key: string): void {
    if (!/^[0-9a-f]{64}$/i.test(key)) {
      this.errors.push('BACKUP_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
    }
  }

  private validateLogLevel(level: string): void {
    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!validLevels.includes(level.toLowerCase())) {
      this.warnings.push(`LOG_LEVEL "${level}" is not standard. Use: ${validLevels.join(', ')}`);
    }
  }

  private validatePIIEncryptionKey(key: string): void {
    // Validate base64 format
    try {
      const decoded = Buffer.from(key, 'base64');
      
      // Check if it's 32 bytes (256 bits)
      if (decoded.length !== 32) {
        this.errors.push('PII_ENCRYPTION_KEY must be 32 bytes (256 bits) when base64 decoded');
      }
      
      // Check entropy (shouldn't be all zeros or simple patterns)
      const uniqueBytes = new Set(decoded);
      if (uniqueBytes.size < 10) {
        this.errors.push('PII_ENCRYPTION_KEY has insufficient entropy. Generate using: openssl rand -base64 32');
      }
      
      // Check for common weak patterns
      const hexString = decoded.toString('hex');
      if (hexString.includes('00000000') || hexString.includes('ffffffff')) {
        this.errors.push('PII_ENCRYPTION_KEY contains weak patterns. Use a cryptographically secure random key');
      }
    } catch (error) {
      this.errors.push('PII_ENCRYPTION_KEY must be valid base64. Generate using: openssl rand -base64 32');
    }
  }

  /**
   * Generates secure random values for secrets
   */
  static generateSecureSecrets(): Record<string, string> {
    const crypto = require('crypto');
    
    return {
      JWT_SECRET: crypto.randomBytes(64).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      REDIS_PASSWORD: crypto.randomBytes(32).toString('hex'),
      BACKUP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      PII_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
      PII_HASH_SALT: crypto.randomBytes(32).toString('hex'),
    };
  }

  /**
   * Checks if environment is properly configured
   */
  static isConfigured(): boolean {
    try {
      new EnvironmentValidator().validate();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets missing required variables
   */
  static getMissingVariables(): string[] {
    const validator = new EnvironmentValidator();
    const missing: string[] = [];

    for (const [key, rule] of Object.entries(validator.validationRules)) {
      if (rule.required || (rule.productionRequired && validator.isProduction)) {
        if (!process.env[key]) {
          missing.push(key);
        }
      }
    }

    return missing;
  }
}

// Singleton instance
export const environmentValidator = new EnvironmentValidator();

// Export the validated configuration
export let environmentConfig: EnvironmentConfig;

/**
 * Initialize environment validation
 * Should be called at application startup
 */
export function initializeEnvironment(): EnvironmentConfig {
  environmentConfig = environmentValidator.validate();
  return environmentConfig;
}

/**
 * Get environment configuration (must call initializeEnvironment first)
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!environmentConfig) {
    throw new Error('Environment not initialized. Call initializeEnvironment() first.');
  }
  return environmentConfig;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return environmentConfig?.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return environmentConfig?.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return environmentConfig?.NODE_ENV === 'test';
}