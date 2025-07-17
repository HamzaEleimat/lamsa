#!/usr/bin/env node

/**
 * Validate production secrets for BeautyCort
 * Run with: node scripts/validate-secrets.js
 */

const fs = require('fs');
const path = require('path');

function validateSecret(name, value, minLength = 32) {
    const issues = [];
    
    if (!value || value.trim() === '') {
        issues.push('Secret is empty or not set');
        return { valid: false, issues };
    }
    
    if (value.length < minLength) {
        issues.push(`Secret is too short (${value.length} chars, minimum ${minLength})`);
    }
    
    // Check for common weak patterns
    const weakPatterns = [
        'password', 'secret', 'key', 'token', 'admin', 'beautycort',
        '123', 'abc', 'test', 'demo', 'default', 'example'
    ];
    
    const lowerValue = value.toLowerCase();
    const foundWeakPatterns = weakPatterns.filter(pattern => lowerValue.includes(pattern));
    
    if (foundWeakPatterns.length > 0) {
        issues.push(`Contains weak patterns: ${foundWeakPatterns.join(', ')}`);
    }
    
    // Check entropy (basic check)
    const uniqueChars = new Set(value).size;
    if (uniqueChars < 16) {
        issues.push(`Low entropy - only ${uniqueChars} unique characters`);
    }
    
    // Check for repeated patterns
    const repeatedPatterns = value.match(/(.{3,})\1+/g);
    if (repeatedPatterns) {
        issues.push('Contains repeated patterns');
    }
    
    return {
        valid: issues.length === 0,
        issues,
        length: value.length,
        entropy: uniqueChars
    };
}

function loadEnvironmentFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return env;
}

console.log('🔍 BeautyCort Production Secrets Validation');
console.log('===========================================');
console.log();

const productionEnvPath = path.join(__dirname, '../.env.production');
const env = loadEnvironmentFile(productionEnvPath);

if (!env) {
    console.log('❌ Error: .env.production file not found');
    console.log('Please create the file with your production secrets');
    process.exit(1);
}

const secretsToValidate = [
    { name: 'JWT_SECRET', minLength: 64, critical: true },
    { name: 'REFRESH_TOKEN_SECRET', minLength: 64, critical: true },
    { name: 'REDIS_PASSWORD', minLength: 32, critical: false },
    { name: 'BACKUP_ENCRYPTION_KEY', minLength: 32, critical: false },
    { name: 'TAP_WEBHOOK_SECRET', minLength: 32, critical: false },
    { name: 'SESSION_SECRET', minLength: 32, critical: false },
    { name: 'NEXTAUTH_SECRET', minLength: 32, critical: false }
];

let totalSecrets = 0;
let validSecrets = 0;
let criticalIssues = 0;

console.log('📊 Validation Results:');
console.log('======================');
console.log();

secretsToValidate.forEach(({ name, minLength, critical }) => {
    totalSecrets++;
    const value = env[name];
    const result = validateSecret(name, value, minLength);
    
    if (result.valid) {
        validSecrets++;
        console.log(`✅ ${name}: VALID (${result.length} chars, ${result.entropy} unique)`);
    } else {
        if (critical) {
            criticalIssues++;
            console.log(`❌ ${name}: CRITICAL ISSUES`);
        } else {
            console.log(`⚠️  ${name}: ISSUES`);
        }
        
        result.issues.forEach(issue => {
            console.log(`   - ${issue}`);
        });
    }
    console.log();
});

// Check for missing required secrets
const requiredSecrets = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET',
    'REDIS_URL',
    'REDIS_PASSWORD'
];

console.log('🔍 Required Secrets Check:');
console.log('==========================');
console.log();

requiredSecrets.forEach(secret => {
    if (env[secret] && env[secret].trim() !== '') {
        console.log(`✅ ${secret}: Present`);
    } else {
        console.log(`❌ ${secret}: Missing or empty`);
        criticalIssues++;
    }
});

console.log();
console.log('📈 Summary:');
console.log(`- Total secrets validated: ${totalSecrets}`);
console.log(`- Valid secrets: ${validSecrets}`);
console.log(`- Critical issues: ${criticalIssues}`);
console.log();

if (criticalIssues > 0) {
    console.log('❌ VALIDATION FAILED');
    console.log();
    console.log('🔧 Recommended actions:');
    console.log('1. Generate new secrets: node scripts/generate-production-secrets.js');
    console.log('2. Update .env.production with the new secrets');
    console.log('3. Store secrets in a secure secrets manager');
    console.log('4. Never commit secrets to version control');
    console.log();
    process.exit(1);
} else {
    console.log('✅ ALL SECRETS VALIDATED SUCCESSFULLY');
    console.log();
    console.log('🚀 Your production secrets are secure and ready for deployment!');
    console.log();
    console.log('🔒 Security recommendations:');
    console.log('1. Store secrets in AWS Secrets Manager or equivalent');
    console.log('2. Rotate secrets quarterly');
    console.log('3. Monitor for secret exposure in logs');
    console.log('4. Use different secrets for each environment');
    console.log();
    process.exit(0);
}