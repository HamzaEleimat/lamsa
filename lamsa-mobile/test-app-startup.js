#!/usr/bin/env node

/**
 * Test script to verify app startup and check for dependency issues
 * Run this after starting the Expo development server
 */

const fetch = require('node-fetch');
const chalk = require('chalk');

// Metro bundler URL
const METRO_URL = 'http://localhost:8081';
const EXPO_URL = 'http://localhost:8081/_expo/status';

// Test categories
const tests = {
  metroServer: false,
  expoStatus: false,
  bundleLoad: false,
};

async function checkMetroServer() {
  try {
    const response = await fetch(METRO_URL);
    if (response.ok) {
      tests.metroServer = true;
      console.log(chalk.green('✓ Metro bundler is running'));
      return true;
    }
  } catch (error) {
    console.log(chalk.red('✗ Metro bundler is not accessible'));
  }
  return false;
}

async function checkExpoStatus() {
  try {
    const response = await fetch(EXPO_URL);
    if (response.ok) {
      const data = await response.json();
      tests.expoStatus = true;
      console.log(chalk.green('✓ Expo development server is healthy'));
      console.log(chalk.gray(`  Platform: ${data.platform || 'unknown'}`));
      return true;
    }
  } catch (error) {
    console.log(chalk.red('✗ Expo status endpoint not accessible'));
  }
  return false;
}

async function checkBundleLoad() {
  try {
    // Try to load the main bundle
    const bundleUrl = `${METRO_URL}/index.bundle?platform=ios&dev=true&minify=false`;
    const response = await fetch(bundleUrl, {
      headers: {
        'Accept': 'multipart/mixed',
      }
    });
    
    if (response.ok) {
      tests.bundleLoad = true;
      console.log(chalk.green('✓ JavaScript bundle loads successfully'));
      
      // Check response size to ensure bundle is not empty
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        console.log(chalk.gray(`  Bundle size: ${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB`));
      }
      return true;
    } else {
      console.log(chalk.red(`✗ Bundle load failed: ${response.status} ${response.statusText}`));
    }
  } catch (error) {
    console.log(chalk.red('✗ Error loading JavaScript bundle'));
    console.log(chalk.gray(`  ${error.message}`));
  }
  return false;
}

async function runTests() {
  console.log(chalk.bold('\nLamsa Mobile App Startup Tests\n'));
  
  // Run tests sequentially
  await checkMetroServer();
  await checkExpoStatus();
  
  if (tests.metroServer) {
    await checkBundleLoad();
  }
  
  // Summary
  console.log(chalk.bold('\n--- Test Summary ---'));
  const passedTests = Object.values(tests).filter(t => t).length;
  const totalTests = Object.keys(tests).length;
  
  if (passedTests === totalTests) {
    console.log(chalk.green(`✓ All tests passed (${passedTests}/${totalTests})`));
    console.log(chalk.green('\nThe app should be ready for testing on devices/simulators'));
  } else {
    console.log(chalk.yellow(`⚠ ${passedTests}/${totalTests} tests passed`));
    console.log(chalk.yellow('\nSome issues detected. Check the output above for details.'));
  }
  
  // Provide next steps
  console.log(chalk.bold('\nNext Steps:'));
  console.log('1. Open Expo Go app on your device');
  console.log('2. Scan the QR code from the terminal');
  console.log('3. Or press "a" for Android emulator, "i" for iOS simulator');
  console.log('4. Check for any runtime errors in the Metro console');
}

// Check if node-fetch is available
try {
  require.resolve('node-fetch');
  runTests();
} catch (e) {
  console.log(chalk.yellow('Installing node-fetch for testing...'));
  const { execSync } = require('child_process');
  execSync('npm install --no-save node-fetch chalk', { stdio: 'inherit' });
  console.log(chalk.green('Dependencies installed. Please run this script again.'));
}