#!/usr/bin/env node

/**
 * Script to generate secure keys for environment variables
 * Usage: node scripts/generate-secure-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating secure keys for Lamsa API...\n');

// Generate keys
const keys = {
  JWT_SECRET: crypto.randomBytes(64).toString('hex'),
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  PII_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
  PII_HASH_SALT: crypto.randomBytes(32).toString('hex'),
  REDIS_PASSWORD: crypto.randomBytes(32).toString('hex'),
  BACKUP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
};

// Display keys
console.log('Generated secure keys:');
console.log('='.repeat(70));
console.log('');

for (const [key, value] of Object.entries(keys)) {
  console.log(`${key}=${value}`);
  console.log('');
}

console.log('='.repeat(70));
console.log('');

// Instructions
console.log('📋 Instructions:');
console.log('1. Copy these keys to your .env file');
console.log('2. NEVER commit these keys to version control');
console.log('3. Back up PII_ENCRYPTION_KEY securely - data cannot be decrypted without it!');
console.log('4. Use different keys for each environment (dev, staging, production)');
console.log('');

// Offer to save to .env.generated
const envPath = path.join(__dirname, '..', '.env.generated');
console.log(`💾 Save these keys to ${envPath}? (y/N)`);

process.stdin.once('data', (data) => {
  const answer = data.toString().trim().toLowerCase();
  if (answer === 'y' || answer === 'yes') {
    const envContent = Object.entries(keys)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(envPath, envContent + '\n');
    console.log(`✅ Keys saved to ${envPath}`);
    console.log('   Copy the values you need to your .env file');
  } else {
    console.log('ℹ️  Keys not saved to file');
  }
  
  process.exit(0);
});