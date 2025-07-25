#!/usr/bin/env node

/**
 * Troubleshoot connection issues between mobile app and API
 */

const http = require('http');
const os = require('os');

// Get local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const apiPort = process.env.PORT || 3000;

console.log('🔍 Lamsa Connection Troubleshooter\n');
console.log(`📱 Your local IP: ${localIP}`);
console.log(`🌐 API should be running on: http://${localIP}:${apiPort}\n`);

// Check if API is reachable
const checkAPI = (url) => {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve({ success: true, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
};

async function runChecks() {
  console.log('🏃 Running connectivity checks...\n');

  // Check localhost
  const localhostCheck = await checkAPI(`http://localhost:${apiPort}/api/config/mobile`);
  console.log(`1. Localhost API: ${localhostCheck.success ? '✅ Connected' : '❌ Failed'}`);
  if (!localhostCheck.success) console.log(`   Error: ${localhostCheck.error}`);

  // Check local IP
  const localIPCheck = await checkAPI(`http://${localIP}:${apiPort}/api/config/mobile`);
  console.log(`2. Local IP API: ${localIPCheck.success ? '✅ Connected' : '❌ Failed'}`);
  if (!localIPCheck.success) console.log(`   Error: ${localIPCheck.error}`);

  console.log('\n📋 Checklist:');
  console.log('[ ] Is the API server running? (cd ../lamsa-api && npm run dev)');
  console.log('[ ] Are you on the same Wi-Fi network as your phone?');
  console.log(`[ ] Is port ${apiPort} open in your firewall?`);
  console.log('[ ] Have you updated .env with the correct IP address?');
  
  console.log('\n💡 Next steps:');
  if (!localhostCheck.success) {
    console.log('1. Start the API server first');
  } else if (!localIPCheck.success) {
    console.log('1. Check firewall settings');
    console.log('2. Try using tunnel mode: expo start --tunnel');
  } else {
    console.log('1. Update .env file:');
    console.log(`   EXPO_PUBLIC_API_URL=http://${localIP}:${apiPort}`);
    console.log('2. Restart Expo: expo start -c');
  }
}

runChecks();