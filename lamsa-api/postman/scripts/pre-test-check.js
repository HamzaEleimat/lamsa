#!/usr/bin/env node

/**
 * Pre-test Health Check Script
 * Ensures the API server is running before executing tests
 */

const http = require('http');
const { exec } = require('child_process');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({
    path: path.join(__dirname, '../../.env')
});

const API_PORT = process.env.PORT || 3001;
const API_HOST = 'localhost';
const HEALTH_ENDPOINT = '/api/health';
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

function checkServerHealth() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: HEALTH_ENDPOINT,
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve(true);
            } else {
                reject(new Error(`Health check failed with status: ${res.statusCode}`));
            }
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Health check timed out'));
        });

        req.end();
    });
}

async function waitForServer(retries = MAX_RETRIES) {
    console.log(`🔍 Checking API server health at http://${API_HOST}:${API_PORT}${HEALTH_ENDPOINT}...`);
    
    for (let i = 0; i < retries; i++) {
        try {
            await checkServerHealth();
            console.log('✅ API server is healthy and ready for tests!');
            return true;
        } catch (error) {
            console.log(`❌ Attempt ${i + 1}/${retries} failed: ${error.message}`);
            
            if (i < retries - 1) {
                console.log(`⏳ Waiting ${RETRY_DELAY / 1000} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }
    
    return false;
}

async function checkDatabaseConnection() {
    // You can add database connectivity checks here if needed
    console.log('🔍 Checking database connection...');
    // For now, we'll rely on the health endpoint to verify DB connectivity
    return true;
}

async function checkEnvironmentVariables() {
    console.log('🔍 Checking environment variables...');
    
    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:', missingVars.join(', '));
        console.log('💡 Make sure you have a .env file in the lamsa-api directory');
        return false;
    }
    
    console.log('✅ All required environment variables are set');
    return true;
}

async function main() {
    console.log('🚀 Pre-test Health Check');
    console.log('========================\n');
    
    // Check environment variables
    const envCheck = await checkEnvironmentVariables();
    if (!envCheck) {
        console.error('\n❌ Environment check failed. Please fix the issues above.');
        process.exit(1);
    }
    
    // Check if server is running
    const serverReady = await waitForServer();
    
    if (!serverReady) {
        console.error('\n❌ API server is not responding.');
        console.log('\n💡 To start the server, run:');
        console.log('   cd /home/hamza/lamsa/lamsa-api');
        console.log('   npm run dev\n');
        console.log('Then run this script again.');
        process.exit(1);
    }
    
    // Check database connection
    const dbReady = await checkDatabaseConnection();
    if (!dbReady) {
        console.error('\n❌ Database connection check failed.');
        process.exit(1);
    }
    
    console.log('\n✅ All pre-test checks passed!');
    console.log('You can now run your Postman tests.\n');
}

// Run the checks
main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});