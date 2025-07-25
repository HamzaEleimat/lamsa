#!/usr/bin/env node

/**
 * Get local IP address for Expo development
 * This helps configure the API URL for mobile testing
 */

const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (localhost) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name: name,
          address: iface.address
        });
      }
    }
  }

  return addresses;
}

console.log('🌐 Local IP Addresses for Expo Development:\n');

const addresses = getLocalIP();

if (addresses.length === 0) {
  console.log('❌ No network interfaces found. Make sure you are connected to a network.');
} else {
  addresses.forEach(({ name, address }) => {
    console.log(`📱 ${name}: ${address}`);
  });

  console.log('\n📝 Update your .env file:');
  console.log(`EXPO_PUBLIC_API_URL=http://${addresses[0].address}:3000`);
  
  console.log('\n🚀 Or use this Expo URL directly:');
  console.log(`exp://${addresses[0].address}:8081`);
}

console.log('\n💡 Tips:');
console.log('- Make sure your phone is on the same Wi-Fi network');
console.log('- Check that port 3000 (API) and 8081 (Expo) are not blocked by firewall');
console.log('- If connection fails, try: expo start --tunnel');