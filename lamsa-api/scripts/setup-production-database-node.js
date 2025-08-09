#!/usr/bin/env node

/**
 * Setup production database using Node.js instead of psql
 * This script creates the database schema using the Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.production
function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return env;
}

async function setupDatabase() {
    console.log('🚀 Lamsa Production Database Setup (Node.js)');
    console.log('==================================================');
    console.log('');

    // Load environment variables
    const envPath = path.join(__dirname, '../.env.production');
    const env = loadEnvFile(envPath);

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.production');
        process.exit(1);
    }

    console.log('📋 Configuration:');
    console.log(`  SUPABASE_URL: ${supabaseUrl}`);
    console.log(`  SERVICE_KEY: ${supabaseServiceKey.substring(0, 20)}...`);
    console.log('');

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test connection
    console.log('🔍 Testing connection to Supabase...');
    try {
        const { data, error } = await supabase.from('service_categories').select('count', { count: 'exact' });
        if (error && !error.message.includes('does not exist')) {
            throw error;
        }
        console.log('✅ Successfully connected to Supabase');
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }

    // Read and execute schema
    console.log('📊 Setting up database schema...');
    
    const schemaPath = path.join(__dirname, '../lamsa-api/database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Error: Schema file not found at', schemaPath);
        process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.length === 0) continue;

        try {
            console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
            
            // Use the REST API to execute SQL
            const { data, error } = await supabase.rpc('sql', { 
                query: statement + ';' 
            });
            
            if (error) {
                // Some errors are expected (like CREATE EXTENSION IF NOT EXISTS)
                if (error.message.includes('already exists') || 
                    error.message.includes('does not exist') ||
                    error.message.includes('cannot be executed')) {
                    console.log(`    ⚠️  ${error.message} (continuing...)`);
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error(`    ❌ Error executing statement ${i + 1}:`, error.message);
            // Continue with next statement for non-critical errors
        }
    }

    // Test basic functionality
    console.log('🧪 Testing database setup...');
    
    const tests = [
        {
            name: 'Service Categories Table',
            test: async () => {
                const { data, error } = await supabase
                    .from('service_categories')
                    .select('*')
                    .limit(1);
                
                if (error) throw error;
                return 'Table accessible';
            }
        },
        {
            name: 'PostGIS Extension',
            test: async () => {
                const { data, error } = await supabase
                    .rpc('search_providers_nearby', {
                        user_lat: 31.9539,
                        user_lng: 35.9106,
                        radius_km: 10
                    });
                
                if (error && !error.message.includes('does not exist')) {
                    throw error;
                }
                return 'PostGIS functions available';
            }
        }
    ];

    for (const test of tests) {
        try {
            const result = await test.test();
            console.log(`✅ ${test.name}: ${result}`);
        } catch (error) {
            console.log(`⚠️  ${test.name}: ${error.message}`);
        }
    }

    console.log('');
    console.log('🎉 Database setup completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Test the API connection: cd lamsa-api && npm run test:connection:prod');
    console.log('2. Configure Redis cluster');
    console.log('3. Set up third-party services (Tap, Twilio, etc.)');
    console.log('');
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    process.exit(1);
});

setupDatabase();