#!/usr/bin/env node

/**
 * Direct test of production Supabase database using service key
 * This bypasses RLS and tests direct database access
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

// Create client with service key that bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testConnection() {
    console.log('🔍 Testing BeautyCort Direct Database Connection...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Supabase URL: ${supabaseUrl}`);
    console.log(`🔑 Using Service Key: ${supabaseServiceKey.substring(0, 20)}...`);
    console.log('');

    const tests = [
        {
            name: 'Service Categories Table',
            test: async () => {
                const { data, error } = await supabase
                    .from('service_categories')
                    .select('*');
                
                if (error) throw error;
                return `Found ${data.length} service categories`;
            }
        },
        {
            name: 'Users Table Structure',
            test: async () => {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .limit(1);
                
                if (error) throw error;
                return `Users table accessible (${data.length} records)`;
            }
        },
        {
            name: 'Providers Table Structure',
            test: async () => {
                const { data, error } = await supabase
                    .from('providers')
                    .select('*')
                    .limit(1);
                
                if (error) throw error;
                return `Providers table accessible (${data.length} records)`;
            }
        },
        {
            name: 'Services Table Structure',
            test: async () => {
                const { data, error } = await supabase
                    .from('services')
                    .select('*')
                    .limit(1);
                
                if (error) throw error;
                return `Services table accessible (${data.length} records)`;
            }
        },
        {
            name: 'Bookings Table Structure',
            test: async () => {
                const { data, error } = await supabase
                    .from('bookings')
                    .select('*')
                    .limit(1);
                
                if (error) throw error;
                return `Bookings table accessible (${data.length} records)`;
            }
        },
        {
            name: 'PostGIS Function',
            test: async () => {
                const { data, error } = await supabase
                    .rpc('search_providers_nearby', {
                        user_lat: 31.9539,
                        user_lng: 35.9106,
                        radius_km: 10
                    });
                
                if (error) throw error;
                return `PostGIS function working (${data.length} results)`;
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
                const foundBuckets = expectedBuckets.filter(b => buckets.includes(b));
                
                return `Storage buckets: ${foundBuckets.join(', ')} (${foundBuckets.length}/${expectedBuckets.length})`;
            }
        },
        {
            name: 'Database Views',
            test: async () => {
                const { data, error } = await supabase
                    .from('active_providers_with_services')
                    .select('*')
                    .limit(1);
                
                if (error) throw error;
                return `Views accessible (${data.length} provider records)`;
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
        console.log('🔧 Issues found:');
        console.log('- Some database objects may not be created properly');
        console.log('- Check Supabase SQL Editor for any errors');
        console.log('- Verify service key has correct permissions');
        console.log('');
        process.exit(1);
    } else {
        console.log('');
        console.log('🎉 All tests passed! Database is ready for production.');
        console.log('');
        console.log('🚀 Next steps:');
        console.log('1. Database schema is complete');
        console.log('2. Configure Redis cluster');
        console.log('3. Set up third-party services (Tap, Twilio, etc.)');
        console.log('');
        process.exit(0);
    }
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

testConnection();