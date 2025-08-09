/**
 * Server Startup Validation
 * Comprehensive checks before starting the API server
 */

import { getEnvironmentConfig } from '../utils/environment-validation';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export interface StartupValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    environment: boolean;
    database: boolean;
    redis: boolean;
    permissions: boolean;
  };
}

export class ServerValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  async validate(): Promise<StartupValidationResult> {
    console.log('🔍 Running server startup validation...');
    
    this.errors = [];
    this.warnings = [];

    const checks = {
      environment: await this.validateEnvironment(),
      database: await this.validateDatabase(),
      redis: await this.validateRedis(),
      permissions: await this.validatePermissions()
    };

    const success = Object.values(checks).every(check => check) && this.errors.length === 0;

    if (success) {
      console.log('✅ All startup validations passed');
    } else {
      console.error('❌ Startup validation failed');
      this.errors.forEach(error => console.error(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      logger.warn('Startup warnings:', { warnings: this.warnings });
    }

    return {
      success,
      errors: this.errors,
      warnings: this.warnings,
      checks
    };
  }

  private async validateEnvironment(): Promise<boolean> {
    try {
      const config = getEnvironmentConfig();
      
      // Validate production-specific requirements
      if (config.NODE_ENV === 'production') {
        if (config.JWT_SECRET.length < 64) {
          this.errors.push('JWT_SECRET too short for production (minimum 64 characters)');
          return false;
        }

        if (!config.SUPABASE_URL.includes('supabase.co')) {
          this.warnings.push('Using non-standard Supabase URL in production');
        }
      }

      // Check for required production services
      if (config.NODE_ENV === 'production') {
        if (!config.REDIS_URL && !config.REDIS_HOST) {
          this.warnings.push('Redis not configured - caching will use memory only');
        }
      }

      console.log('✅ Environment validation passed');
      return true;
    } catch (error) {
      this.errors.push(`Environment validation failed: ${error}`);
      return false;
    }
  }

  private async validateDatabase(): Promise<boolean> {
    try {
      // Test database connection
      // Test basic query instead of count
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        this.errors.push(`Database connection failed: ${error.message}`);
        return false;
      }

      // Check if required tables exist
      const requiredTables = [
        'users',
        'providers', 
        'services',
        'bookings',
        'reviews',
        'payments'
      ];

      for (const table of requiredTables) {
        // Test basic query instead of count
        const { error: tableError } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        if (tableError) {
          this.errors.push(`Required table '${table}' not found or accessible`);
          return false;
        }
      }

      console.log('✅ Database validation passed');
      return true;
    } catch (error) {
      this.errors.push(`Database validation error: ${error}`);
      return false;
    }
  }

  private async validateRedis(): Promise<boolean> {
    try {
      const config = getEnvironmentConfig();
      
      if (!config.REDIS_URL && !config.REDIS_HOST) {
        this.warnings.push('Redis not configured - using memory cache only');
        return true; // Not required, just a warning
      }

      // Try to create Redis connection
      const redis = require('redis');
      const client = redis.createClient({
        url: config.REDIS_URL || `redis://${config.REDIS_HOST}:${config.REDIS_PORT || 6379}`
      });

      try {
        await client.connect();
        await client.ping();
        await client.disconnect();
        console.log('✅ Redis validation passed');
        return true;
      } catch (redisError) {
        this.warnings.push(`Redis connection failed: ${redisError} (falling back to memory cache)`);
        return true; // Redis is optional, fallback to memory
      }
    } catch (error) {
      this.warnings.push(`Redis validation error: ${error} (falling back to memory cache)`);
      return true; // Redis is optional
    }
  }

  private async validatePermissions(): Promise<boolean> {
    try {
      const fs = require('fs');
      const path = require('path');

      // Check environment file permissions
      const envFiles = [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env.production')
      ];

      for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
          const stats = fs.statSync(envFile);
          const permissions = (stats.mode & parseInt('777', 8)).toString(8);
          
          if (permissions !== '600') {
            this.warnings.push(`Environment file ${envFile} has permissions ${permissions} (should be 600)`);
          }
        }
      }

      // Check log directory permissions
      const logDir = path.join(process.cwd(), 'logs');
      if (fs.existsSync(logDir)) {
        const stats = fs.statSync(logDir);
        if (!stats.isDirectory()) {
          this.errors.push('logs path exists but is not a directory');
          return false;
        }
      }

      console.log('✅ Permissions validation passed');
      return true;
    } catch (error) {
      this.warnings.push(`Permission validation error: ${error}`);
      return true; // Non-critical
    }
  }

  /**
   * Generate a comprehensive startup report
   */
  async generateStartupReport(): Promise<void> {
    const result = await this.validate();
    
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Lamsa API Server Startup Report');
    console.log('='.repeat(60));
    
    const config = getEnvironmentConfig();
    console.log(`📊 Environment: ${config.NODE_ENV}`);
    console.log(`🔌 Port: ${config.PORT}`);
    console.log(`🗄️  Database: ${config.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`💾 Cache: ${config.REDIS_URL ? 'Redis' : 'Memory'}`);
    console.log(`🔐 JWT: ${config.JWT_SECRET.length} character secret`);
    
    console.log('\n📋 Validation Results:');
    Object.entries(result.checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check.charAt(0).toUpperCase() + check.slice(1)}`);
    });

    if (result.errors.length > 0) {
      console.log('\n❌ Critical Issues:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('\n' + '='.repeat(60));
    
    if (!result.success) {
      if (process.env.NODE_ENV === 'production') {
        console.error('🚫 Server startup aborted due to validation failures');
        process.exit(1);
      } else {
        logger.warn('Server starting with validation warnings (development mode)');
        logger.warn('Please ensure database tables are created before using the API');
      }
    }
  }
}

export const serverValidator = new ServerValidator();