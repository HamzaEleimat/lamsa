#!/usr/bin/env node

/**
 * Interactive Environment Setup Script
 * Helps set up environment variables for all Lamsa components
 * 
 * Usage:
 *   node scripts/setup-env.js [component] [environment]
 * 
 * Examples:
 *   node scripts/setup-env.js              # Interactive setup for all components
 *   node scripts/setup-env.js api          # Setup API environment
 *   node scripts/setup-env.js production   # Setup all components for production
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// Component configurations
const COMPONENTS = {
  api: {
    name: 'Lamsa API',
    path: 'lamsa-api',
    envFile: '.env',
    templateFiles: {
      development: '.env.example',
      production: '.env.production.template',
    },
  },
  mobile: {
    name: 'Lamsa Mobile',
    path: 'lamsa-mobile',
    envFile: '.env',
    templateFiles: {
      development: '.env.example',
      production: '.env.production.template',
    },
  },
  web: {
    name: 'Lamsa Web',
    path: 'lamsa-web',
    envFile: '.env.local',
    templateFiles: {
      development: '.env.example',
      production: '.env.production.template',
    },
  },
};

// Environment presets
const ENVIRONMENT_PRESETS = {
  development: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    ENABLE_DEBUG: 'true',
    ENABLE_MOCK_PAYMENTS: 'true',
    ENABLE_MOCK_SMS: 'true',
    ENABLE_SWAGGER: 'true',
    COOKIE_SECURE: 'false',
  },
  staging: {
    NODE_ENV: 'staging',
    LOG_LEVEL: 'info',
    ENABLE_DEBUG: 'false',
    ENABLE_MOCK_PAYMENTS: 'false',
    ENABLE_MOCK_SMS: 'false',
    ENABLE_SWAGGER: 'true',
    COOKIE_SECURE: 'true',
  },
  production: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'warn',
    ENABLE_DEBUG: 'false',
    ENABLE_MOCK_PAYMENTS: 'false',
    ENABLE_MOCK_SMS: 'false',
    ENABLE_SWAGGER: 'false',
    COOKIE_SECURE: 'true',
  },
};

class EnvironmentSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async setup(componentName, environment) {
    console.clear();
    this.printHeader();

    try {
      if (componentName && COMPONENTS[componentName]) {
        // Setup specific component
        await this.setupComponent(componentName, environment);
      } else if (componentName && ENVIRONMENT_PRESETS[componentName]) {
        // Setup all components for specific environment
        environment = componentName;
        for (const comp of Object.keys(COMPONENTS)) {
          await this.setupComponent(comp, environment);
        }
      } else {
        // Interactive setup
        await this.interactiveSetup();
      }
    } catch (error) {
      console.error(`\n${colors.red}Error: ${error.message}${colors.reset}`);
    } finally {
      this.rl.close();
    }
  }

  printHeader() {
    console.log(`${colors.cyan}${colors.bold}
╔═══════════════════════════════════════════╗
║        Lamsa Environment Setup            ║
║   Beauty Services Platform - Jordan       ║
╚═══════════════════════════════════════════╝
${colors.reset}`);
  }

  async interactiveSetup() {
    // Select components
    const components = await this.selectComponents();
    
    // Select environment
    const environment = await this.selectEnvironment();

    // Setup each component
    for (const component of components) {
      await this.setupComponent(component, environment);
    }

    console.log(`\n${colors.green}${colors.bold}✅ Environment setup complete!${colors.reset}`);
    console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
    console.log(`  1. Review the generated .env files`);
    console.log(`  2. Update any placeholder values`);
    console.log(`  3. Run: ${colors.cyan}node scripts/validate-env.js${colors.reset}`);
  }

  async selectComponents() {
    console.log(`\n${colors.bold}Select components to setup:${colors.reset}`);
    console.log('  1. API only');
    console.log('  2. Mobile only');
    console.log('  3. Web only');
    console.log('  4. All components');

    const choice = await this.question('\nYour choice (1-4): ');
    
    switch (choice) {
      case '1': return ['api'];
      case '2': return ['mobile'];
      case '3': return ['web'];
      case '4': return Object.keys(COMPONENTS);
      default:
        throw new Error('Invalid choice');
    }
  }

  async selectEnvironment() {
    console.log(`\n${colors.bold}Select environment:${colors.reset}`);
    console.log('  1. Development (local)');
    console.log('  2. Staging');
    console.log('  3. Production');

    const choice = await this.question('\nYour choice (1-3): ');
    
    switch (choice) {
      case '1': return 'development';
      case '2': return 'staging';
      case '3': return 'production';
      default:
        throw new Error('Invalid choice');
    }
  }

  async setupComponent(componentName, environment = 'development') {
    const component = COMPONENTS[componentName];
    console.log(`\n${colors.cyan}${colors.bold}Setting up ${component.name} for ${environment}...${colors.reset}`);

    const envPath = path.join(component.path, component.envFile);
    const templatePath = path.join(component.path, component.templateFiles[environment] || component.templateFiles.development);

    // Check if env file already exists
    if (fs.existsSync(envPath)) {
      const overwrite = await this.confirm(`${component.envFile} already exists. Overwrite?`);
      if (!overwrite) {
        console.log(`${colors.yellow}Skipping ${component.name}${colors.reset}`);
        return;
      }
      
      // Backup existing file
      const backupPath = `${envPath}.backup.${Date.now()}`;
      fs.copyFileSync(envPath, backupPath);
      console.log(`${colors.dim}Backed up to: ${backupPath}${colors.reset}`);
    }

    // Load template
    if (!fs.existsSync(templatePath)) {
      console.error(`${colors.red}Template not found: ${templatePath}${colors.reset}`);
      return;
    }

    const template = fs.readFileSync(templatePath, 'utf8');
    let envContent = template;

    // Apply environment presets
    const presets = ENVIRONMENT_PRESETS[environment] || {};
    Object.entries(presets).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'gm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      }
    });

    // Generate secure secrets
    const secrets = this.generateSecrets(componentName);
    Object.entries(secrets).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'gm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      }
    });

    // Component-specific setup
    envContent = await this.componentSpecificSetup(componentName, envContent, environment);

    // Write env file
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}✅ Created ${envPath}${colors.reset}`);

    // Set file permissions (Unix/Linux/Mac only)
    try {
      fs.chmodSync(envPath, 0o600);
      console.log(`${colors.dim}Set file permissions to 600${colors.reset}`);
    } catch (e) {
      // Ignore on Windows
    }
  }

  generateSecrets(component) {
    const secrets = {};

    switch (component) {
      case 'api':
        secrets.JWT_SECRET = crypto.randomBytes(64).toString('hex');
        secrets.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
        secrets.REDIS_PASSWORD = crypto.randomBytes(32).toString('hex');
        secrets.BACKUP_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        break;
      
      case 'web':
        secrets.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('base64');
        break;
    }

    return secrets;
  }

  async componentSpecificSetup(component, envContent, environment) {
    console.log(`\n${colors.bold}Configure ${component} specific settings:${colors.reset}`);

    switch (component) {
      case 'api':
        // Ask for Supabase credentials
        const hasSupabase = await this.confirm('Do you have Supabase credentials ready?');
        if (hasSupabase) {
          const supabaseUrl = await this.question('Supabase URL: ');
          const supabaseAnon = await this.question('Supabase Anon Key: ');
          const supabaseService = await this.question('Supabase Service Key: ');
          
          envContent = envContent
            .replace(/^SUPABASE_URL=.*$/gm, `SUPABASE_URL=${supabaseUrl}`)
            .replace(/^SUPABASE_ANON_KEY=.*$/gm, `SUPABASE_ANON_KEY=${supabaseAnon}`)
            .replace(/^SUPABASE_SERVICE_KEY=.*$/gm, `SUPABASE_SERVICE_KEY=${supabaseService}`);
        }
        break;

      case 'mobile':
        // Set API URL based on environment
        if (environment === 'development') {
          const useLocalhost = await this.confirm('Use localhost for API? (requires IP address)');
          if (useLocalhost) {
            const localIP = await this.getLocalIP();
            const ip = await this.question(`Local IP address (${localIP}): `) || localIP;
            envContent = envContent.replace(/^EXPO_PUBLIC_API_URL=.*$/gm, `EXPO_PUBLIC_API_URL=http://${ip}:3000`);
          }
        }
        break;

      case 'web':
        // Set NextAuth URL
        if (environment === 'production') {
          const domain = await this.question('Production domain (e.g., admin.lamsa.com): ');
          if (domain) {
            envContent = envContent.replace(/^NEXTAUTH_URL=.*$/gm, `NEXTAUTH_URL=https://${domain}`);
          }
        }
        break;
    }

    return envContent;
  }

  async getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    
    return '192.168.1.100';
  }

  question(prompt) {
    return new Promise(resolve => {
      this.rl.question(`${colors.cyan}${prompt}${colors.reset}`, answer => {
        resolve(answer.trim());
      });
    });
  }

  async confirm(prompt) {
    const answer = await this.question(`${prompt} (y/N): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }
}

// Quick setup commands
async function quickSetup(type) {
  const setup = new EnvironmentSetup();

  switch (type) {
    case 'dev':
      console.log(`${colors.cyan}${colors.bold}Quick Development Setup${colors.reset}\n`);
      for (const comp of Object.keys(COMPONENTS)) {
        await setup.setupComponent(comp, 'development');
      }
      break;

    case 'prod':
      console.log(`${colors.cyan}${colors.bold}Quick Production Setup${colors.reset}\n`);
      console.log(`${colors.red}WARNING: This will generate production-ready secrets.${colors.reset}`);
      console.log(`${colors.red}Make sure to store them securely!${colors.reset}\n`);
      
      const confirm = await setup.confirm('Continue with production setup?');
      if (confirm) {
        for (const comp of Object.keys(COMPONENTS)) {
          await setup.setupComponent(comp, 'production');
        }
      }
      break;

    case 'docker':
      console.log(`${colors.cyan}${colors.bold}Docker Environment Setup${colors.reset}\n`);
      await setupDockerEnv();
      break;
  }

  setup.rl.close();
}

async function setupDockerEnv() {
  const dockerEnvPath = '.env.docker';
  const templatePath = '.env.docker.template';

  if (!fs.existsSync(templatePath)) {
    console.error(`${colors.red}Docker template not found: ${templatePath}${colors.reset}`);
    return;
  }

  let content = fs.readFileSync(templatePath, 'utf8');

  // Generate Docker-specific secrets
  const secrets = {
    JWT_SECRET: crypto.randomBytes(64).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    REDIS_PASSWORD: crypto.randomBytes(32).toString('hex'),
    NEXTAUTH_SECRET: crypto.randomBytes(32).toString('base64'),
    BACKUP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  };

  Object.entries(secrets).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    content = content.replace(regex, `${key}=${value}`);
  });

  fs.writeFileSync(dockerEnvPath, content);
  console.log(`${colors.green}✅ Created ${dockerEnvPath}${colors.reset}`);
  
  try {
    fs.chmodSync(dockerEnvPath, 0o600);
  } catch (e) {
    // Ignore on Windows
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  // Quick commands
  if (args[0] === 'dev') {
    await quickSetup('dev');
    return;
  } else if (args[0] === 'prod') {
    await quickSetup('prod');
    return;
  } else if (args[0] === 'docker') {
    await quickSetup('docker');
    return;
  }

  // Regular setup
  const setup = new EnvironmentSetup();
  await setup.setup(args[0], args[1]);
}

// Run setup
main().catch(error => {
  console.error(`${colors.red}Setup failed: ${error.message}${colors.reset}`);
  process.exit(1);
});