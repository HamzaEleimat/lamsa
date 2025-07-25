#!/usr/bin/env node

/**
 * Diagnose connection issues between mobile app and API
 */

const http = require('http');
const { exec } = require('child_process');
const os = require('os');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

async function checkAPIHealth(url) {
  return new Promise((resolve) => {
    http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ 
          success: res.statusCode === 200, 
          status: res.statusCode,
          data: data 
        });
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

async function checkPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -i:${port} || netstat -an | grep ${port}`, (error, stdout) => {
      resolve(stdout.includes(port.toString()));
    });
  });
}

async function diagnose() {
  log('\n🔍 Lamsa Mobile Connection Diagnostic', 'blue');
  log('=====================================\n', 'blue');

  // Check IP address
  const localIP = getLocalIP();
  if (!localIP) {
    log('❌ No network connection found!', 'red');
    log('   Make sure you are connected to Wi-Fi', 'yellow');
    return;
  }
  log(`✅ Local IP: ${localIP}`, 'green');

  // Check if API port is open
  log('\n📡 Checking API server...', 'blue');
  const apiPort = 3000;
  const isAPIRunning = await checkPort(apiPort);
  
  if (!isAPIRunning) {
    log(`❌ API server not running on port ${apiPort}`, 'red');
    log('   Run: cd ../lamsa-api && npm run dev', 'yellow');
    return;
  }
  log(`✅ API server is running on port ${apiPort}`, 'green');

  // Check API health endpoint
  const apiUrl = `http://${localIP}:${apiPort}/api/health`;
  log(`\n🏥 Checking API health at ${apiUrl}...`, 'blue');
  
  const health = await checkAPIHealth(apiUrl);
  if (health.success) {
    log('✅ API is healthy and responding', 'green');
    try {
      const data = JSON.parse(health.data);
      log(`   Response: ${JSON.stringify(data)}`, 'green');
    } catch {
      log(`   Response: ${health.data}`, 'green');
    }
  } else {
    log('❌ API health check failed', 'red');
    log(`   Error: ${health.error || `Status ${health.status}`}`, 'red');
  }

  // Check config endpoint
  const configUrl = `http://${localIP}:${apiPort}/api/config/mobile`;
  log(`\n⚙️  Checking config endpoint at ${configUrl}...`, 'blue');
  
  const config = await checkAPIHealth(configUrl);
  if (config.success) {
    log('✅ Config endpoint is accessible', 'green');
  } else {
    log('❌ Config endpoint not accessible', 'red');
    log(`   Error: ${config.error || `Status ${config.status}`}`, 'red');
  }

  // Check Expo port
  log('\n📱 Checking Expo server...', 'blue');
  const expoPort = 8081;
  const isExpoRunning = await checkPort(expoPort);
  
  if (isExpoRunning) {
    log(`✅ Expo is running on port ${expoPort}`, 'green');
  } else {
    log(`⚠️  Expo not running on port ${expoPort}`, 'yellow');
    log('   This is normal if you haven\'t started Expo yet', 'yellow');
  }

  // Check .env file
  log('\n📄 Checking .env configuration...', 'blue');
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiUrlMatch = envContent.match(/EXPO_PUBLIC_API_URL=(.+)/);
    
    if (apiUrlMatch) {
      const configuredUrl = apiUrlMatch[1].trim();
      log(`   EXPO_PUBLIC_API_URL=${configuredUrl}`, 'blue');
      
      if (configuredUrl.includes(localIP) && configuredUrl.includes(apiPort.toString())) {
        log('✅ .env file is correctly configured', 'green');
      } else {
        log('❌ .env file needs to be updated', 'red');
        log(`   Should be: EXPO_PUBLIC_API_URL=http://${localIP}:${apiPort}`, 'yellow');
      }
    } else {
      log('❌ EXPO_PUBLIC_API_URL not found in .env', 'red');
    }
  } catch (err) {
    log('❌ Could not read .env file', 'red');
    log('   Make sure .env file exists', 'yellow');
  }

  // Summary
  log('\n📋 Summary:', 'blue');
  log('===========', 'blue');
  
  if (health.success && config.success) {
    log('✅ Everything looks good!', 'green');
    log('\nNext steps:', 'blue');
    log('1. Start Expo: npm start', 'yellow');
    log('2. Scan the QR code with Expo Go app', 'yellow');
    log('3. Make sure your phone is on the same Wi-Fi network', 'yellow');
  } else {
    log('❌ Connection issues detected', 'red');
    log('\nTroubleshooting:', 'blue');
    log('1. Make sure API is running: cd ../lamsa-api && npm run dev', 'yellow');
    log('2. Update .env file with correct IP and port', 'yellow');
    log('3. Check firewall settings for ports 3000 and 8081', 'yellow');
    log('4. Try using tunnel mode: npm run start:tunnel', 'yellow');
  }
}

// Run diagnostic
diagnose().catch(console.error);