#!/usr/bin/env node

/**
 * Environment Status Check
 * Quick overview of environment configuration across all components
 * 
 * Usage:
 *   node scripts/env-status.js
 */

const fs = require('fs');
const path = require('path');

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

// Icons
const icons = {
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  lock: '🔒',
  key: '🔑',
  database: '🗄️',
  mobile: '📱',
  web: '🌐',
  api: '🔌',
  docker: '🐳',
};

class EnvironmentStatus {
  constructor() {
    this.components = {
      api: {
        name: 'API',
        icon: icons.api,
        path: 'lamsa-api',
        envFiles: ['.env', '.env.production', '.env.test'],
        criticalVars: ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'],
      },
      mobile: {
        name: 'Mobile',
        icon: icons.mobile,
        path: 'lamsa-mobile',
        envFiles: ['.env', '.env.production'],
        criticalVars: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_API_URL'],
      },
      web: {
        name: 'Web',
        icon: icons.web,
        path: 'lamsa-web',
        envFiles: ['.env.local', '.env.production.local'],
        criticalVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXTAUTH_SECRET'],
      },
    };
  }

  async checkStatus() {
    console.clear();
    this.printHeader();
    
    // Check each component
    for (const [key, component] of Object.entries(this.components)) {
      await this.checkComponent(key, component);
    }

    // Check Docker environment
    await this.checkDocker();

    // Check templates
    await this.checkTemplates();

    // Security check
    await this.securityCheck();

    // Summary
    this.printSummary();
  }

  printHeader() {
    console.log(`${colors.cyan}${colors.bold}
╔═══════════════════════════════════════════╗
║     Lamsa Environment Status Check        ║
╚═══════════════════════════════════════════╝
${colors.reset}`);
    console.log(`${colors.dim}Checking environment configuration...${colors.reset}\n`);
  }

  async checkComponent(key, component) {
    console.log(`${colors.bold}${component.icon} ${component.name} Component${colors.reset}`);
    
    let hasAnyEnv = false;
    
    for (const envFile of component.envFiles) {
      const filePath = path.join(component.path, envFile);
      const exists = fs.existsSync(filePath);
      
      if (exists) {
        hasAnyEnv = true;
        const stats = fs.statSync(filePath);
        const vars = this.loadEnvFile(filePath);
        const varCount = Object.keys(vars).length;
        
        // Check critical variables
        const missingCritical = component.criticalVars.filter(v => !vars[v] || vars[v] === '');
        
        // Determine status
        let status = icons.check;
        let statusColor = colors.green;
        
        if (missingCritical.length > 0) {
          status = icons.warning;
          statusColor = colors.yellow;
        }
        
        // Check for security issues
        const securityIssues = this.checkSecurityIssues(vars);
        if (securityIssues.length > 0) {
          status = icons.cross;
          statusColor = colors.red;
        }
        
        console.log(`  ${statusColor}${status}${colors.reset} ${envFile} ${colors.dim}(${varCount} variables)${colors.reset}`);
        
        // Show details
        if (missingCritical.length > 0) {
          console.log(`     ${colors.yellow}Missing: ${missingCritical.join(', ')}${colors.reset}`);
        }
        
        if (securityIssues.length > 0) {
          securityIssues.forEach(issue => {
            console.log(`     ${colors.red}${icons.warning} ${issue}${colors.reset}`);
          });
        }
        
        // File permissions check (Unix/Linux/Mac)
        try {
          const mode = (stats.mode & parseInt('777', 8)).toString(8);
          if (mode !== '600' && mode !== '400') {
            console.log(`     ${colors.yellow}${icons.lock} File permissions: ${mode} (should be 600)${colors.reset}`);
          }
        } catch (e) {
          // Ignore on Windows
        }
      } else {
        console.log(`  ${colors.dim}${icons.cross} ${envFile} (not found)${colors.reset}`);
      }
    }
    
    if (!hasAnyEnv) {
      console.log(`  ${colors.red}${icons.warning} No environment files found!${colors.reset}`);
      console.log(`  ${colors.dim}Run: ${colors.cyan}node scripts/setup-env.js ${key}${colors.reset}`);
    }
    
    console.log();
  }

  async checkDocker() {
    console.log(`${colors.bold}${icons.docker} Docker Environment${colors.reset}`);
    
    const dockerEnvFiles = ['.env.docker', 'docker-compose.yml', '.env.minimal'];
    
    dockerEnvFiles.forEach(file => {
      const exists = fs.existsSync(file);
      const status = exists ? icons.check : icons.cross;
      const color = exists ? colors.green : colors.dim;
      
      console.log(`  ${color}${status} ${file}${colors.reset}`);
      
      if (exists && file.endsWith('.env')) {
        const vars = this.loadEnvFile(file);
        const issues = this.checkSecurityIssues(vars);
        if (issues.length > 0) {
          issues.forEach(issue => {
            console.log(`     ${colors.red}${icons.warning} ${issue}${colors.reset}`);
          });
        }
      }
    });
    
    console.log();
  }

  async checkTemplates() {
    console.log(`${colors.bold}📋 Environment Templates${colors.reset}`);
    
    const templates = [
      '.env.development.template',
      '.env.staging.template',
      '.env.production.template',
      '.env.docker.template',
    ];
    
    let allTemplatesExist = true;
    
    templates.forEach(template => {
      const exists = fs.existsSync(template);
      const status = exists ? icons.check : icons.cross;
      const color = exists ? colors.green : colors.red;
      
      if (!exists) allTemplatesExist = false;
      
      console.log(`  ${color}${status} ${template}${colors.reset}`);
    });
    
    if (allTemplatesExist) {
      console.log(`  ${colors.green}All templates available!${colors.reset}`);
    }
    
    console.log();
  }

  async securityCheck() {
    console.log(`${colors.bold}${icons.lock} Security Check${colors.reset}`);
    
    let issues = 0;
    
    // Check for .env files in git
    try {
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      const requiredIgnores = ['.env', '.env.*', '!.env.example', '!.env.*.template'];
      
      requiredIgnores.forEach(pattern => {
        if (!gitignore.includes(pattern)) {
          console.log(`  ${colors.yellow}${icons.warning} Missing in .gitignore: ${pattern}${colors.reset}`);
          issues++;
        }
      });
    } catch (e) {
      console.log(`  ${colors.red}${icons.cross} .gitignore not found!${colors.reset}`);
      issues++;
    }
    
    // Check for exposed secrets in templates
    const templateFiles = fs.readdirSync('.').filter(f => f.includes('.template'));
    templateFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.match(/sk_live|pk_live|eyJ[A-Za-z0-9]/)) {
        console.log(`  ${colors.red}${icons.warning} Possible secret in template: ${file}${colors.reset}`);
        issues++;
      }
    });
    
    if (issues === 0) {
      console.log(`  ${colors.green}${icons.check} No security issues found${colors.reset}`);
    }
    
    console.log();
  }

  loadEnvFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const vars = {};
      
      content.split('\n').forEach(line => {
        if (line.trim() === '' || line.trim().startsWith('#')) return;
        
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim();
        }
      });
      
      return vars;
    } catch (e) {
      return {};
    }
  }

  checkSecurityIssues(vars) {
    const issues = [];
    
    // Check for weak secrets
    const secretKeys = Object.keys(vars).filter(k => 
      k.includes('SECRET') || k.includes('PASSWORD') || k.includes('KEY')
    );
    
    secretKeys.forEach(key => {
      const value = vars[key];
      
      // Check for default/weak values
      if (value && (
        value.length < 16 ||
        value.includes('default') ||
        value.includes('password') ||
        value.includes('secret') ||
        value.includes('123') ||
        value === 'your_' + key.toLowerCase()
      )) {
        issues.push(`Weak value for ${key}`);
      }
    });
    
    // Check for localhost in production files
    if (vars.NODE_ENV === 'production') {
      Object.entries(vars).forEach(([key, value]) => {
        if (value && value.includes('localhost')) {
          issues.push(`${key} contains localhost in production`);
        }
      });
    }
    
    // Check for debug mode in production
    if (vars.NODE_ENV === 'production' && vars.ENABLE_DEBUG === 'true') {
      issues.push('Debug mode enabled in production');
    }
    
    return issues;
  }

  printSummary() {
    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}Summary${colors.reset}\n`);
    
    console.log(`${colors.bold}Quick Actions:${colors.reset}`);
    console.log(`  • Setup all: ${colors.cyan}node scripts/setup-env.js${colors.reset}`);
    console.log(`  • Validate: ${colors.cyan}node scripts/validate-env.js${colors.reset}`);
    console.log(`  • Generate secrets: ${colors.cyan}node scripts/validate-env.js generate-secrets${colors.reset}`);
    
    console.log(`\n${colors.bold}Documentation:${colors.reset}`);
    console.log(`  • Setup guide: ${colors.blue}docs/ENV_SETUP.md${colors.reset}`);
    console.log(`  • Templates: ${colors.blue}*.env.*.template${colors.reset}`);
    
    console.log(`\n${colors.dim}Run 'node scripts/validate-env.js' for detailed validation${colors.reset}`);
  }
}

// Environment info helper
function getEnvironmentInfo() {
  const info = {
    node: process.version,
    platform: process.platform,
    cwd: process.cwd(),
    user: process.env.USER || process.env.USERNAME,
  };

  console.log(`\n${colors.dim}Environment: Node ${info.node} on ${info.platform}${colors.reset}`);
  console.log(`${colors.dim}Directory: ${info.cwd}${colors.reset}`);
  console.log(`${colors.dim}User: ${info.user}${colors.reset}\n`);
}

// Main execution
async function main() {
  const status = new EnvironmentStatus();
  
  // Show environment info
  getEnvironmentInfo();
  
  // Run status check
  await status.checkStatus();
}

// Run
main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});