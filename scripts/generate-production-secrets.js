#!/usr/bin/env node

/**
 * Generate secure production secrets for BeautyCort
 * Run with: node scripts/generate-production-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 Generating Production Secrets for BeautyCort');
console.log('===============================================');
console.log();

const secrets = {
    jwt: {
        name: 'JWT_SECRET',
        value: crypto.randomBytes(64).toString('hex'),
        description: 'JWT signing secret (128 characters)',
        security: 'CRITICAL'
    },
    refresh: {
        name: 'REFRESH_TOKEN_SECRET',
        value: crypto.randomBytes(64).toString('hex'),
        description: 'Refresh token signing secret (128 characters)',
        security: 'CRITICAL'
    },
    redis: {
        name: 'REDIS_PASSWORD',
        value: crypto.randomBytes(32).toString('hex'),
        description: 'Redis authentication password (64 characters)',
        security: 'HIGH'
    },
    backup: {
        name: 'BACKUP_ENCRYPTION_KEY',
        value: crypto.randomBytes(32).toString('hex'),
        description: 'Backup encryption key (64 characters)',
        security: 'HIGH'
    },
    webhook: {
        name: 'TAP_WEBHOOK_SECRET',
        value: crypto.randomBytes(32).toString('hex'),
        description: 'Tap payment webhook verification secret (64 characters)',
        security: 'HIGH'
    },
    session: {
        name: 'SESSION_SECRET',
        value: crypto.randomBytes(32).toString('hex'),
        description: 'Session encryption secret (64 characters)',
        security: 'HIGH'
    },
    nextauth: {
        name: 'NEXTAUTH_SECRET',
        value: crypto.randomBytes(32).toString('hex'),
        description: 'NextAuth.js signing secret (64 characters)',
        security: 'HIGH'
    }
};

console.log('📋 Generated Secrets:');
console.log();

Object.values(secrets).forEach(secret => {
    console.log(`🔑 ${secret.name}`);
    console.log(`   Value: ${secret.value}`);
    console.log(`   Description: ${secret.description}`);
    console.log(`   Security Level: ${secret.security}`);
    console.log();
});

console.log('📝 Environment Variables Format:');
console.log('================================');
console.log();

Object.values(secrets).forEach(secret => {
    console.log(`${secret.name}=${secret.value}`);
});

console.log();
console.log('💾 Save these to your .env.production file');
console.log();

// Generate .env snippet file
const envSnippet = Object.values(secrets)
    .map(secret => `${secret.name}=${secret.value}`)
    .join('\n');

const fs = require('fs');
const path = require('path');

const snippetPath = path.join(__dirname, '../.env.secrets');
fs.writeFileSync(snippetPath, envSnippet);

console.log(`📄 Secrets saved to: ${snippetPath}`);
console.log();
console.log('⚠️  SECURITY WARNINGS:');
console.log('======================');
console.log('1. Never commit these secrets to version control');
console.log('2. Store them in a secure secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)');
console.log('3. Use different secrets for each environment (dev, staging, production)');
console.log('4. Rotate secrets regularly (quarterly or if compromised)');
console.log('5. Delete the .env.secrets file after copying the values');
console.log();
console.log('🔒 Recommended secrets storage:');
console.log('- AWS Secrets Manager');
console.log('- Azure Key Vault');
console.log('- HashiCorp Vault');
console.log('- Google Secret Manager');
console.log();
console.log('🧪 To validate secrets strength:');
console.log('node scripts/validate-secrets.js');
console.log();
console.log('✅ Secret generation completed successfully!');