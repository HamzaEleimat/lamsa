#!/usr/bin/env node

/**
 * BeautyCort Mobile Test Runner
 * 
 * Comprehensive test execution with Zarqa-specific scenarios
 * Supports unit, integration, E2E, and performance testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  unit: {
    pattern: '__tests__/unit/**/*.test.(ts|tsx)',
    timeout: 10000,
    coverage: true,
  },
  integration: {
    pattern: '__tests__/integration/**/*.test.(ts|tsx)',
    timeout: 30000,
    coverage: true,
  },
  e2e: {
    pattern: '__tests__/e2e/**/*.test.ts',
    timeout: 120000,
    coverage: false,
  },
  performance: {
    pattern: '__tests__/performance/**/*.test.ts',
    timeout: 60000,
    coverage: false,
  },
};

// Color codes for console output
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

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Pre-test validation
function validateEnvironment() {
  log.header('🔍 Validating Test Environment');

  // Check required files
  const requiredFiles = [
    '__tests__/setup.ts',
    '__tests__/fixtures/providers.ts',
    '__tests__/fixtures/notifications.ts',
    '__tests__/fixtures/analytics.ts',
    '__tests__/utils/testHelpers.ts',
  ];

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log.success(`Found: ${file}`);
    } else {
      log.error(`Missing: ${file}`);
      process.exit(1);
    }
  });

  // Check test data integrity
  try {
    const providersFixture = require('./fixtures/providers');
    const notificationsFixture = require('./fixtures/notifications');
    const analyticsFixture = require('./fixtures/analytics');

    if (providersFixture.testProviders.length > 0) {
      log.success(`Provider test data: ${providersFixture.testProviders.length} providers`);
    }

    if (notificationsFixture.testNotifications.length > 0) {
      log.success(`Notification test data: ${notificationsFixture.testNotifications.length} notifications`);
    }

    if (analyticsFixture.mockAnalyticsData) {
      log.success('Analytics test data loaded');
    }
  } catch (error) {
    log.error(`Test fixture validation failed: ${error.message}`);
    process.exit(1);
  }

  log.success('Environment validation complete');
}

// Test execution functions
function runUnitTests() {
  log.header('🧪 Running Unit Tests');
  
  try {
    const result = execSync(`npx jest ${TEST_CONFIG.unit.pattern} --testTimeout=${TEST_CONFIG.unit.timeout} --coverage --coverageReporters=text-lcov --coverageReporters=html`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    log.success('Unit tests completed successfully');
    return true;
  } catch (error) {
    log.error('Unit tests failed');
    return false;
  }
}

function runIntegrationTests() {
  log.header('🔗 Running Integration Tests');
  
  try {
    execSync(`npx jest ${TEST_CONFIG.integration.pattern} --testTimeout=${TEST_CONFIG.integration.timeout} --runInBand`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    log.success('Integration tests completed successfully');
    return true;
  } catch (error) {
    log.error('Integration tests failed');
    return false;
  }
}

function runE2ETests() {
  log.header('🎭 Running E2E Tests');
  
  // Check if Detox is configured
  if (!fs.existsSync('.detoxrc.json')) {
    log.warning('Detox not configured, skipping E2E tests');
    return true;
  }
  
  try {
    // Build the app for testing
    log.info('Building app for E2E testing...');
    execSync('npx detox build --configuration ios.sim.debug', {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    // Run E2E tests
    execSync(`npx detox test --configuration ios.sim.debug --testTimeout=${TEST_CONFIG.e2e.timeout}`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    log.success('E2E tests completed successfully');
    return true;
  } catch (error) {
    log.error('E2E tests failed');
    return false;
  }
}

function runPerformanceTests() {
  log.header('⚡ Running Performance Tests');
  
  try {
    execSync(`npx jest ${TEST_CONFIG.performance.pattern} --testTimeout=${TEST_CONFIG.performance.timeout} --runInBand --verbose`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    log.success('Performance tests completed successfully');
    return true;
  } catch (error) {
    log.error('Performance tests failed');
    return false;
  }
}

function runSpecificTests(pattern) {
  log.header(`🎯 Running Specific Tests: ${pattern}`);
  
  try {
    execSync(`npx jest ${pattern} --testTimeout=30000 --verbose`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    log.success('Specific tests completed successfully');
    return true;
  } catch (error) {
    log.error('Specific tests failed');
    return false;
  }
}

// Test reporting
function generateTestReport(results) {
  log.header('📊 Test Report');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result === true).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total test suites: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  
  if (failedTests > 0) {
    console.log('\nFailed test suites:');
    Object.entries(results).forEach(([suite, passed]) => {
      if (!passed) {
        log.error(`  ${suite}`);
      }
    });
  }
  
  // Coverage summary
  if (fs.existsSync('coverage/lcov-report/index.html')) {
    log.info(`Coverage report generated: coverage/lcov-report/index.html`);
  }
  
  return failedTests === 0;
}

// Zarqa-specific test scenarios
function runZarqaScenarios() {
  log.header('🏙️ Running Zarqa-Specific Scenarios');
  
  const zarqaTests = [
    '__tests__/unit/onboarding/OnboardingFlow.test.tsx',
    '__tests__/unit/services/ServiceManagement.test.tsx',
    '__tests__/unit/notifications/NotificationService.test.ts',
    '__tests__/integration/analytics/AnalyticsFlow.test.tsx',
  ];
  
  let allPassed = true;
  
  zarqaTests.forEach(testFile => {
    if (fs.existsSync(testFile)) {
      log.info(`Running ${testFile}...`);
      try {
        execSync(`npx jest ${testFile} --testTimeout=30000`, {
          stdio: 'inherit',
          encoding: 'utf8'
        });
        log.success(`✓ ${testFile}`);
      } catch (error) {
        log.error(`✗ ${testFile}`);
        allPassed = false;
      }
    } else {
      log.warning(`Test file not found: ${testFile}`);
    }
  });
  
  return allPassed;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  log.header('🚀 BeautyCort Mobile Test Runner');
  log.info('Testing provider features with Zarqa market focus');
  
  // Validate environment first
  validateEnvironment();
  
  let results = {};
  
  switch (command) {
    case 'unit':
      results.unit = runUnitTests();
      break;
      
    case 'integration':
      results.integration = runIntegrationTests();
      break;
      
    case 'e2e':
      results.e2e = runE2ETests();
      break;
      
    case 'performance':
      results.performance = runPerformanceTests();
      break;
      
    case 'zarqa':
      results.zarqa = runZarqaScenarios();
      break;
      
    case 'all':
      results.unit = runUnitTests();
      results.integration = runIntegrationTests();
      results.performance = runPerformanceTests();
      // Skip E2E in 'all' mode unless explicitly requested
      break;
      
    case 'quick':
      // Quick test suite for development
      results.quick = runSpecificTests('__tests__/unit/**/*.test.(ts|tsx)');
      break;
      
    default:
      if (command) {
        // Run specific test pattern
        results.custom = runSpecificTests(command);
      } else {
        // Show usage
        console.log('Usage: node testRunner.js [command]');
        console.log('');
        console.log('Commands:');
        console.log('  unit         Run unit tests');
        console.log('  integration  Run integration tests');
        console.log('  e2e          Run end-to-end tests');
        console.log('  performance  Run performance tests');
        console.log('  zarqa        Run Zarqa-specific scenarios');
        console.log('  all          Run all tests (except E2E)');
        console.log('  quick        Run quick development tests');
        console.log('  [pattern]    Run tests matching pattern');
        console.log('');
        console.log('Examples:');
        console.log('  node testRunner.js unit');
        console.log('  node testRunner.js zarqa');
        console.log('  node testRunner.js "__tests__/unit/onboarding/**"');
        process.exit(0);
      }
  }
  
  // Generate final report
  const success = generateTestReport(results);
  
  if (success) {
    log.header('🎉 All tests passed!');
    process.exit(0);
  } else {
    log.header('💥 Some tests failed');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Run the test runner
if (require.main === module) {
  main();
}

module.exports = {
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  runPerformanceTests,
  runZarqaScenarios,
};