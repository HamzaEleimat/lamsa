/**
 * Environment Variable Validation Utility
 * Ensures all required environment variables are set and secure
 */

export interface EnvironmentConfig {
  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
  
  // Database
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  
  // Application
  NODE_ENV: string;
  PORT: string;
  
  // Optional services (can be undefined in development)
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  CACHE_TTL?: string;
  
  // Third-party services (optional)
  TAP_SECRET_KEY?: string;
  TAP_PUBLIC_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  EXPO_PUSH_TOKEN?: string;
}

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validates all required environment variables
   */
  validate(): EnvironmentConfig {
    this.errors = [];
    this.warnings = [];

    // Required variables
    const config: Partial<EnvironmentConfig> = {
      JWT_SECRET: this.validateRequired('JWT_SECRET'),
      JWT_EXPIRES_IN: this.validateWithDefault('JWT_EXPIRES_IN', '15m'),
      REFRESH_TOKEN_EXPIRES_IN: this.validateWithDefault('REFRESH_TOKEN_EXPIRES_IN', '30d'),
      
      SUPABASE_URL: this.validateRequired('SUPABASE_URL'),
      SUPABASE_ANON_KEY: this.validateRequired('SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_KEY: this.validateRequired('SUPABASE_SERVICE_KEY'),
      
      NODE_ENV: this.validateWithDefault('NODE_ENV', 'development'),
      PORT: this.validateWithDefault('PORT', '3000'),
      
      // Optional variables
      REDIS_URL: process.env.REDIS_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      CACHE_TTL: process.env.CACHE_TTL,
      
      TAP_SECRET_KEY: process.env.TAP_SECRET_KEY,
      TAP_PUBLIC_KEY: process.env.TAP_PUBLIC_KEY,
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      EXPO_PUSH_TOKEN: process.env.EXPO_PUSH_TOKEN,
    };

    // Additional security validations
    this.validateJWTSecret(config.JWT_SECRET!);
    this.validateNodeEnv(config.NODE_ENV!);
    this.validateSupabaseConfig(config);

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

  private validateRequired(key: string): string {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      this.errors.push(`${key} is required but not set`);
      return '';
    }
    return value.trim();
  }

  private validateWithDefault(key: string, defaultValue: string): string {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      this.warnings.push(`${key} not set, using default: ${defaultValue}`);
      return defaultValue;
    }
    return value.trim();
  }

  private validateJWTSecret(secret: string): void {
    if (!secret) return; // Already handled by validateRequired

    // Security checks for JWT secret
    if (secret.length < 32) {
      this.errors.push('JWT_SECRET must be at least 32 characters long for security');
    }

    if (secret === 'default-secret' || secret === 'lamsa-jwt-secret-2024') {
      this.errors.push('JWT_SECRET cannot use default values in production');
    }

    // Check for weak secrets
    const weakSecrets = [
      'secret', 'password', 'key', 'jwt', 'token', 
      '123456', 'admin', 'lamsa', 'test'
    ];
    
    if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
      this.warnings.push('JWT_SECRET contains common words - consider using a cryptographically secure random string');
    }

    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
      if (secret.length < 64) {
        this.warnings.push('JWT_SECRET should be at least 64 characters in production');
      }
    }
  }

  private validateNodeEnv(nodeEnv: string): void {
    const validEnvs = ['development', 'test', 'production'];
    if (!validEnvs.includes(nodeEnv)) {
      this.warnings.push(`NODE_ENV "${nodeEnv}" is not standard. Consider using: ${validEnvs.join(', ')}`);
    }
  }

  private validateSupabaseConfig(config: Partial<EnvironmentConfig>): void {
    // Check Supabase URL format
    if (config.SUPABASE_URL && !config.SUPABASE_URL.startsWith('https://')) {
      this.errors.push('SUPABASE_URL must start with https://');
    }

    // Warn about development vs production Supabase instances
    if (config.SUPABASE_URL?.includes('localhost') && process.env.NODE_ENV === 'production') {
      this.errors.push('Cannot use localhost Supabase URL in production');
    }

    // Check key lengths (Supabase keys have specific formats)
    if (config.SUPABASE_ANON_KEY && config.SUPABASE_ANON_KEY.length < 100) {
      this.warnings.push('SUPABASE_ANON_KEY seems shorter than expected');
    }

    if (config.SUPABASE_SERVICE_KEY && config.SUPABASE_SERVICE_KEY.length < 100) {
      this.warnings.push('SUPABASE_SERVICE_KEY seems shorter than expected');
    }
  }

  /**
   * Generates a cryptographically secure JWT secret
   */
  static generateSecureJWTSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Quick check if environment is properly configured
   */
  static isConfigured(): boolean {
    try {
      new EnvironmentValidator().validate();
      return true;
    } catch {
      return false;
    }
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