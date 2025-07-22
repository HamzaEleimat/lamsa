#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates environment configuration across all components
 * 
 * Usage:
 *   node scripts/validate-env.js [component] [environment]
 * 
 * Examples:
 *   node scripts/validate-env.js                    # Validate all components
 *   node scripts/validate-env.js api                # Validate API only
 *   node scripts/validate-env.js api production     # Validate API for production
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Component configurations
const COMPONENTS = {
  api: {
    path: 'lamsa-api',
    envFile: '.env',
    templateFile: '.env.example',
    productionTemplate: '.env.production.template',
    prefix: '',
    required: [
      'JWT_SECRET',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY',
    ],
    productionRequired: [
      'REDIS_PASSWORD',
      'SESSION_SECRET',
      'SENTRY_DSN',
      'SLACK_WEBHOOK_URL',
    ],
  },
  mobile: {
    path: 'lamsa-mobile',
    envFile: '.env',
    templateFile: '.env.example',
    productionTemplate: '.env.production.template',
    prefix: 'EXPO_PUBLIC_',
    required: [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_API_URL',
    ],
    productionRequired: [
      'EXPO_PUBLIC_SENTRY_DSN',
      'EXPO_PUBLIC_GA_TRACKING_ID',
    ],
  },
  web: {
    path: 'lamsa-web',
    envFile: '.env.local',
    templateFile: '.env.example',
    productionTemplate: '.env.production.template',
    prefix: 'NEXT_PUBLIC_',
    required: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY',
      'NEXTAUTH_SECRET',
    ],
    productionRequired: [
      'NEXT_PUBLIC_SENTRY_DSN',
      'SENDGRID_API_KEY',
    ],
  },
};

class EnvironmentValidator {
  constructor(component, environment = 'development') {
    this.component = component;
    this.environment = environment;
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
  }

  validate() {
    console.log(`\n${colors.cyan}${colors.bold}Validating ${this.component} for ${this.environment}...${colors.reset}\n`);

    const config = COMPONENTS[this.component];
    if (!config) {
      this.error(`Unknown component: ${this.component}`);
      return false;
    }

    const envPath = path.join(config.path, config.envFile);
    const templatePath = path.join(config.path, config.templateFile);
    const productionTemplatePath = path.join(config.path, config.productionTemplate);

    // Check if env file exists
    if (!fs.existsSync(envPath)) {
      this.error(`Environment file not found: ${envPath}`);
      this.suggestion(`Copy ${config.templateFile} to ${config.envFile} and configure it`);
      return false;
    }

    // Load environment variables
    const envVars = this.loadEnvFile(envPath);
    const templateVars = fs.existsSync(templatePath) ? this.loadEnvFile(templatePath) : {};
    const prodTemplateVars = fs.existsSync(productionTemplatePath) ? this.loadEnvFile(productionTemplatePath) : {};

    // Validate required variables
    this.validateRequired(envVars, config);

    // Validate production-specific requirements
    if (this.environment === 'production') {
      this.validateProduction(envVars, config);
    }

    // Security validations
    this.validateSecurity(envVars, config);

    // Check for missing template variables
    this.checkMissingFromTemplate(envVars, templateVars, 'template');
    
    if (this.environment === 'production' && Object.keys(prodTemplateVars).length > 0) {
      this.checkMissingFromTemplate(envVars, prodTemplateVars, 'production template');
    }

    // Component-specific validations
    this[`validate${this.component.charAt(0).toUpperCase() + this.component.slice(1)}`]?.(envVars);

    return this.report();
  }

  loadEnvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const vars = {};
    
    content.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.trim() === '' || line.trim().startsWith('#')) return;
      
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    });

    return vars;
  }

  validateRequired(envVars, config) {
    const required = config.required || [];
    
    required.forEach(key => {
      if (!envVars[key] || envVars[key] === '') {
        this.error(`Required variable ${key} is not set`);
      }
    });
  }

  validateProduction(envVars, config) {
    const productionRequired = config.productionRequired || [];
    
    productionRequired.forEach(key => {
      if (!envVars[key] || envVars[key] === '') {
        this.error(`Production required variable ${key} is not set`);
      }
    });

    // Check for debug/test flags
    const debugFlags = ['ENABLE_DEBUG', 'ENABLE_MOCK_PAYMENTS', 'ENABLE_MOCK_SMS', 'EXPO_PUBLIC_ENABLE_DEBUG_MODE'];
    debugFlags.forEach(flag => {
      if (envVars[flag] === 'true') {
        this.error(`${flag} must be false in production`);
      }
    });

    // Check for localhost URLs
    Object.entries(envVars).forEach(([key, value]) => {
      if (value && value.includes('localhost')) {
        this.error(`${key} contains localhost URL in production`);
      }
    });
  }

  validateSecurity(envVars, config) {
    // JWT Secret validation
    const jwtKey = config.prefix ? `${config.prefix}JWT_SECRET` : 'JWT_SECRET';
    if (envVars[jwtKey]) {
      const secret = envVars[jwtKey];
      if (secret.length < 32) {
        this.error(`${jwtKey} must be at least 32 characters`);
      }
      if (this.environment === 'production' && secret.length < 64) {
        this.warning(`${jwtKey} should be at least 64 characters in production`);
      }
      if (this.containsWeakPatterns(secret)) {
        this.error(`${jwtKey} contains weak patterns`);
      }
    }

    // Check for exposed secrets
    const secretPatterns = ['password', 'secret', 'key', 'token'];
    Object.entries(envVars).forEach(([key, value]) => {
      if (secretPatterns.some(pattern => key.toLowerCase().includes(pattern))) {
        if (value && this.containsWeakPatterns(value)) {
          this.warning(`${key} may contain weak or default values`);
        }
      }
    });

    // Redis password validation
    if (envVars.REDIS_PASSWORD) {
      if (envVars.REDIS_PASSWORD.length < 16) {
        this.error('REDIS_PASSWORD should be at least 16 characters');
      }
      if (envVars.REDIS_PASSWORD === 'lamsa123' || envVars.REDIS_PASSWORD.includes('default')) {
        this.error('REDIS_PASSWORD contains default or weak values');
      }
    }
  }

  containsWeakPatterns(value) {
    const weakWords = ['password', 'secret', 'default', 'test', 'demo', 'example', '123456', 'admin'];
    return weakWords.some(word => value.toLowerCase().includes(word));
  }

  checkMissingFromTemplate(envVars, templateVars, templateName) {
    const envKeys = Object.keys(envVars);
    const templateKeys = Object.keys(templateVars);
    
    const missing = templateKeys.filter(key => !envKeys.includes(key));
    if (missing.length > 0) {
      this.warning(`Missing variables from ${templateName}: ${missing.join(', ')}`);
    }
  }

  validateApi(envVars) {
    // Supabase URL format
    if (envVars.SUPABASE_URL && !envVars.SUPABASE_URL.startsWith('https://')) {
      this.error('SUPABASE_URL must start with https://');
    }

    // Check for monitoring in production
    if (this.environment === 'production') {
      if (!envVars.SENTRY_DSN && !envVars.NEW_RELIC_LICENSE_KEY) {
        this.warning('No error monitoring configured (Sentry or New Relic recommended)');
      }
    }

    // Validate CORS origins
    if (envVars.CORS_ORIGINS) {
      const origins = envVars.CORS_ORIGINS.split(',');
      origins.forEach(origin => {
        if (this.environment === 'production' && origin.includes('localhost')) {
          this.error('CORS_ORIGINS contains localhost in production');
        }
      });
    }
  }

  validateMobile(envVars) {
    // Check for production keys
    if (this.environment === 'production') {
      if (envVars.EXPO_PUBLIC_TAP_PUBLIC_KEY?.includes('test')) {
        this.error('Using test payment keys in production');
      }
    }

    // Validate API URL
    if (envVars.EXPO_PUBLIC_API_URL) {
      if (this.environment === 'production' && !envVars.EXPO_PUBLIC_API_URL.startsWith('https://')) {
        this.error('EXPO_PUBLIC_API_URL must use HTTPS in production');
      }
    }
  }

  validateWeb(envVars) {
    // NextAuth configuration
    if (!envVars.NEXTAUTH_URL && this.environment === 'production') {
      this.error('NEXTAUTH_URL is required in production');
    }

    // Check for client-side exposure of server secrets
    const serverOnlyKeys = ['SUPABASE_SERVICE_KEY', 'TAP_SECRET_KEY', 'NEXTAUTH_SECRET'];
    serverOnlyKeys.forEach(key => {
      if (key.startsWith('NEXT_PUBLIC_')) {
        this.error(`${key} should not have NEXT_PUBLIC_ prefix (server-side only)`);
      }
    });
  }

  error(message) {
    this.errors.push(message);
  }

  warning(message) {
    this.warnings.push(message);
  }

  suggestion(message) {
    this.suggestions.push(message);
  }

  report() {
    console.log(`${colors.bold}Validation Results:${colors.reset}\n`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`${colors.green}✅ All validations passed!${colors.reset}`);
      return true;
    }

    if (this.errors.length > 0) {
      console.log(`${colors.red}${colors.bold}Errors (${this.errors.length}):${colors.reset}`);
      this.errors.forEach(error => {
        console.log(`${colors.red}  ❌ ${error}${colors.reset}`);
      });
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log(`${colors.yellow}${colors.bold}Warnings (${this.warnings.length}):${colors.reset}`);
      this.warnings.forEach(warning => {
        console.log(`${colors.yellow}  ⚠️  ${warning}${colors.reset}`);
      });
      console.log();
    }

    if (this.suggestions.length > 0) {
      console.log(`${colors.blue}${colors.bold}Suggestions:${colors.reset}`);
      this.suggestions.forEach(suggestion => {
        console.log(`${colors.blue}  💡 ${suggestion}${colors.reset}`);
      });
      console.log();
    }

    return this.errors.length === 0;
  }
}

// Generate secure secrets helper
function generateSecrets() {
  console.log(`\n${colors.cyan}${colors.bold}Generate Secure Secrets:${colors.reset}\n`);
  
  const secrets = {
    JWT_SECRET: crypto.randomBytes(64).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    NEXTAUTH_SECRET: crypto.randomBytes(32).toString('base64'),
    REDIS_PASSWORD: crypto.randomBytes(32).toString('hex'),
    BACKUP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  };

  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${colors.green}${key}=${value}${colors.reset}`);
  });

  console.log(`\n${colors.yellow}⚠️  Copy these values to your .env file and keep them secure!${colors.reset}`);
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'generate-secrets') {
    generateSecrets();
    return;
  }

  const component = args[0];
  const environment = args[1] || 'development';

  if (!component) {
    // Validate all components
    console.log(`${colors.bold}Validating all components...${colors.reset}`);
    let allValid = true;

    Object.keys(COMPONENTS).forEach(comp => {
      const validator = new EnvironmentValidator(comp, environment);
      const valid = validator.validate();
      if (!valid) allValid = false;
    });

    if (allValid) {
      console.log(`\n${colors.green}${colors.bold}✅ All components validated successfully!${colors.reset}`);
    } else {
      console.log(`\n${colors.red}${colors.bold}❌ Validation failed for one or more components${colors.reset}`);
      process.exit(1);
    }
  } else if (COMPONENTS[component]) {
    // Validate specific component
    const validator = new EnvironmentValidator(component, environment);
    const valid = validator.validate();
    
    if (!valid) {
      process.exit(1);
    }
  } else {
    console.error(`${colors.red}Unknown component: ${component}${colors.reset}`);
    console.log('\nUsage: node scripts/validate-env.js [component] [environment]');
    console.log('Components:', Object.keys(COMPONENTS).join(', '));
    console.log('\nOr: node scripts/validate-env.js generate-secrets');
    process.exit(1);
  }
}

// Run validation
main();