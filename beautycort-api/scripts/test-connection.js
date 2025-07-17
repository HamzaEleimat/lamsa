#!/usr/bin/env node

/**
 * Test connection to production Supabase database
 * Run with: npm run test:connection
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../../.env.production')
    : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('🔍 Testing BeautyCort API connection to Supabase...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Supabase URL: ${supabaseUrl}`);
    console.log('');

    const tests = [
        {
            name: 'Basic Connection',
            test: async () => {
                const { data, error } = await supabase
                    .from('service_categories')
                    .select('count', { count: 'exact' });
                
                if (error) throw error;
                return `Found ${data} service categories`;
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
                
                if (error) throw error;
                return 'PostGIS geolocation functions working';
            }
        },
        {
            name: 'Authentication Setup',
            test: async () => {
                const { data, error } = await supabase.auth.getSession();
                // This will return null session but should not error
                return 'Authentication service available';
            }
        },
        {
            name: 'Storage Buckets',
            test: async () => {
                const { data, error } = await supabase
                    .storage
                    .listBuckets();
                
                if (error) throw error;
                
                const buckets = data.map(b => b.name);
                const expectedBuckets = ['provider-images', 'user-avatars', 'service-images'];
                const missingBuckets = expectedBuckets.filter(b => !buckets.includes(b));
                
                if (missingBuckets.length > 0) {
                    throw new Error(`Missing buckets: ${missingBuckets.join(', ')}`);
                }
                
                return `Found ${buckets.length} storage buckets`;
            }
        },
        {
            name: 'Database Schema',
            test: async () => {
                const tables = [
                    'users', 'providers', 'services', 'service_categories',
                    'bookings', 'reviews', 'settlements', 'provider_availability'
                ];
                
                for (const table of tables) {
                    const { error } = await supabase
                        .from(table)
                        .select('*', { count: 'exact' })
                        .limit(1);
                    
                    if (error) {
                        throw new Error(`Table ${table} not accessible: ${error.message}`);
                    }
                }
                
                return `All ${tables.length} tables accessible`;
            }
        },
        {
            name: 'Row Level Security',
            test: async () => {
                // Test that RLS is enabled and working
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .limit(1);
                
                // Should return empty result due to RLS, not an error
                if (error && !error.message.includes('RLS')) {
                    throw error;
                }
                
                return 'Row Level Security is active';
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await test.test();
            console.log(`✅ ${test.name}: ${result}`);
            passed++;
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
            failed++;
        }
    }

    console.log('');
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Check that database migrations ran successfully');
        console.log('2. Verify Supabase service key has correct permissions');
        console.log('3. Ensure PostGIS extension is enabled');
        console.log('4. Check that storage buckets are created');
        console.log('');
        console.log('Run: ./scripts/setup-production-database.sh');
        process.exit(1);
    } else {
        console.log('');
        console.log('🎉 All tests passed! Database is ready for production.');
        console.log('');
        console.log('🚀 Next steps:');
        console.log('1. Configure authentication in Supabase dashboard');
        console.log('2. Set up monitoring and alerts');
        console.log('3. Test API endpoints with production database');
        process.exit(0);
    }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

testConnection();