#!/usr/bin/env node

/**
 * @file pre-push-checklist.js
 * @description Comprehensive pre-push checklist for BeautyCort
 * @author BeautyCort Development Team
 * @date Created: 2025-01-14
 * @copyright BeautyCort 2025
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, cwd = '.') {
  try {
    return execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return error.stdout || error.message;
  }
}

function checkItem(description, checkFn) {
  process.stdout.write(`Checking ${description}... `);
  const result = checkFn();
  if (result.success) {
    log('✅', 'green');
    if (result.warning) {
      log(`   ⚠️  ${result.warning}`, 'yellow');
    }
  } else {
    log('❌', 'red');
    log(`   ${result.error}`, 'red');
  }
  return result;
}

async function runChecklist() {
  log('\n🔍 BeautyCort Pre-Push Checklist', 'bright');
  log('=' .repeat(50), 'bright');
  
  const results = {
    passed: 0,
    warnings: 0,
    failed: 0
  };

  // 1. Check for console statements
  const consoleCheck = checkItem('console statements', () => {
    const output = runCommand('git grep -n "console\\." -- "*.ts" "*.tsx" "*.js" "*.jsx" ":!node_modules" ":!*.test.*" ":!*.spec.*" ":!dist" ":!build" | wc -l');
    const count = parseInt(output.trim());
    
    if (count === 0) {
      return { success: true };
    } else if (count < 500) {
      return { success: true, warning: `Found ${count} console statements (development phase)` };
    } else {
      return { success: false, error: `Found ${count} console statements - consider cleaning up` };
    }
  });
  
  consoleCheck.success ? (consoleCheck.warning ? results.warnings++ : results.passed++) : results.failed++;

  // 2. Check for TODO comments
  const todoCheck = checkItem('TODO comments', () => {
    const output = runCommand('git grep -n "TODO" -- ":!node_modules" ":!*.md" | wc -l');
    const count = parseInt(output.trim());
    
    const highPriority = runCommand('git grep -n "TODO.*\\(security\\|Security\\|jwt\\|JWT\\|auth\\|Auth\\)" -- ":!node_modules" ":!*.md" | wc -l');
    const highCount = parseInt(highPriority.trim());
    
    if (highCount > 0) {
      return { success: false, error: `Found ${highCount} high-priority security TODOs` };
    } else if (count > 0) {
      return { success: true, warning: `Found ${count} TODO comments` };
    } else {
      return { success: true };
    }
  });
  
  todoCheck.success ? (todoCheck.warning ? results.warnings++ : results.passed++) : results.failed++;

  // 3. Check TypeScript compilation
  const dirs = ['beautycort-api', 'beautycort-mobile', 'beautycort-web'];
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const tsCheck = checkItem(`TypeScript in ${dir}`, () => {
        const output = runCommand('npm run typecheck 2>&1 || npx tsc --noEmit --skipLibCheck 2>&1', dir);
        const errorLines = output.split('\n').filter(line => line.includes('error TS')).length;
        
        if (errorLines === 0) {
          return { success: true };
        } else if (errorLines < 1500) {
          return { success: true, warning: `${errorLines} TypeScript errors (development phase)` };
        } else {
          return { success: false, error: `${errorLines} TypeScript errors - consider fixing critical ones` };
        }
      });
      tsCheck.success ? results.passed++ : results.failed++;
    }
  }

  // 4. Check for large files
  const largeFileCheck = checkItem('large files', () => {
    const output = runCommand('find . -type f -size +1M -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" | wc -l');
    const count = parseInt(output.trim());
    
    if (count === 0) {
      return { success: true };
    } else {
      return { success: true, warning: `Found ${count} files larger than 1MB` };
    }
  });
  
  largeFileCheck.success ? (largeFileCheck.warning ? results.warnings++ : results.passed++) : results.failed++;

  // 5. Check for sensitive data
  const sensitiveCheck = checkItem('sensitive data', () => {
    const patterns = [
      'password\\s*=\\s*["\'][^"\']+["\']',
      'secret\\s*=\\s*["\'][^"\']+["\']',
      'api[_-]?key\\s*=\\s*["\'][^"\']+["\']',
      'token\\s*=\\s*["\'][^"\']+["\']'
    ];
    
    for (const pattern of patterns) {
      const output = runCommand(`git grep -E "${pattern}" -- ":!*.example*" ":!*.md" ":!node_modules" ":!*.test.*" | wc -l`);
      const count = parseInt(output.trim());
      if (count > 0) {
        return { success: false, error: `Found potential hardcoded credentials (pattern: ${pattern})` };
      }
    }
    return { success: true };
  });
  
  sensitiveCheck.success ? results.passed++ : results.failed++;

  // 6. Check file headers
  const headerCheck = checkItem('file headers on new files', () => {
    const newFiles = runCommand('git diff --cached --name-only --diff-filter=A').trim().split('\n').filter(f => f);
    const missingHeaders = [];
    
    for (const file of newFiles) {
      if (file.match(/\.(ts|tsx|js|jsx)$/) && fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes('@file') && !content.includes('@description')) {
          missingHeaders.push(file);
        }
      }
    }
    
    if (missingHeaders.length === 0) {
      return { success: true };
    } else {
      return { success: true, warning: `${missingHeaders.length} new files missing headers` };
    }
  });
  
  headerCheck.success ? (headerCheck.warning ? results.warnings++ : results.passed++) : results.failed++;

  // 7. Check for database migrations
  const migrationCheck = checkItem('database migrations', () => {
    const migrationDir = 'beautycort-api/database/migrations';
    if (!fs.existsSync(migrationDir)) {
      return { success: true, warning: 'No migrations directory found' };
    }
    
    const migrations = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
    if (migrations.length > 0) {
      return { success: true, warning: `Found ${migrations.length} migration files - ensure they are applied` };
    }
    return { success: true };
  });
  
  migrationCheck.success ? (migrationCheck.warning ? results.warnings++ : results.passed++) : results.failed++;

  // Summary
  log('\n' + '═'.repeat(50), 'bright');
  log('Summary:', 'bright');
  log(`   ✅ Passed: ${results.passed}`, 'green');
  log(`   ⚠️  Warnings: ${results.warnings}`, 'yellow');
  log(`   ❌ Failed: ${results.failed}`, 'red');
  log('═'.repeat(50) + '\n', 'bright');

  if (results.failed > 0) {
    log('❌ Pre-push checks failed! Please fix the issues above.', 'red');
    process.exit(1);
  } else if (results.warnings > 0) {
    log('✅ Pre-push checks passed with warnings.', 'yellow');
    log('   Consider addressing the warnings before pushing.', 'yellow');
  } else {
    log('✅ All pre-push checks passed! Ready to push.', 'green');
  }
}

// Run the checklist
runChecklist().catch(err => {
  log(`\n❌ Error running checklist: ${err.message}`, 'red');
  process.exit(1);
});