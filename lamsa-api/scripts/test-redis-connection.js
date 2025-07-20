#!/usr/bin/env node

/**
 * Test Redis connection for BeautyCort production
 * Run with: npm run test:redis
 */

const Redis = require('redis');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../../.env.production')
    : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

async function testRedisConnection() {
    console.log('🔍 Testing Redis Connection...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    const redisUrl = process.env.REDIS_URL;
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisUrl) {
        console.error('❌ Error: REDIS_URL not set in environment variables');
        console.log('');
        console.log('📋 Required variables:');
        console.log('- REDIS_URL (e.g., redis://localhost:6379)');
        console.log('- REDIS_PASSWORD (your Redis password)');
        console.log('');
        console.log('🔧 Setup instructions:');
        console.log('1. See: deployment/guides/redis-production-setup.md');
        console.log('2. Choose a Redis provider (AWS ElastiCache, Azure Cache, etc.)');
        console.log('3. Update .env.production with your Redis connection details');
        process.exit(1);
    }

    console.log(`🔗 Redis URL: ${redisUrl}`);
    console.log(`🔑 Password: ${redisPassword ? '***' : 'Not set'}`);
    console.log('');

    // Create Redis client
    const redis = Redis.createClient({
        url: redisUrl,
        password: redisPassword,
        retry_strategy: (times) => {
            if (times > 3) return null; // Stop retrying after 3 attempts
            return Math.min(times * 50, 2000); // Exponential backoff
        }
    });

    // Handle connection events
    redis.on('error', (err) => {
        console.error('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
        console.log('🔄 Connecting to Redis...');
    });

    redis.on('ready', () => {
        console.log('✅ Redis connection established');
    });

    try {
        // Connect to Redis
        await redis.connect();

        // Run tests
        const tests = [
            {
                name: 'Basic Connection',
                test: async () => {
                    const result = await redis.ping();
                    return `PING response: ${result}`;
                }
            },
            {
                name: 'Set/Get Operation',
                test: async () => {
                    const testKey = 'beautycort:test:' + Date.now();
                    const testValue = 'Hello BeautyCort!';
                    
                    await redis.set(testKey, testValue);
                    const result = await redis.get(testKey);
                    await redis.del(testKey); // Clean up
                    
                    if (result === testValue) {
                        return 'SET/GET operations working';
                    } else {
                        throw new Error(`Expected '${testValue}', got '${result}'`);
                    }
                }
            },
            {
                name: 'Expiration (TTL)',
                test: async () => {
                    const testKey = 'beautycort:ttl:' + Date.now();
                    const testValue = 'expires soon';
                    
                    await redis.setEx(testKey, 2, testValue); // 2 second expiry
                    const ttl = await redis.ttl(testKey);
                    await redis.del(testKey); // Clean up
                    
                    if (ttl > 0 && ttl <= 2) {
                        return `TTL working (${ttl} seconds)`;
                    } else {
                        throw new Error(`Invalid TTL: ${ttl}`);
                    }
                }
            },
            {
                name: 'Hash Operations',
                test: async () => {
                    const testKey = 'beautycort:hash:' + Date.now();
                    
                    await redis.hSet(testKey, 'provider_id', '123');
                    await redis.hSet(testKey, 'booking_count', '5');
                    
                    const result = await redis.hGetAll(testKey);
                    await redis.del(testKey); // Clean up
                    
                    if (result.provider_id === '123' && result.booking_count === '5') {
                        return 'Hash operations working';
                    } else {
                        throw new Error('Hash operations failed');
                    }
                }
            },
            {
                name: 'List Operations',
                test: async () => {
                    const testKey = 'beautycort:list:' + Date.now();
                    
                    await redis.lPush(testKey, 'booking1', 'booking2', 'booking3');
                    const length = await redis.lLen(testKey);
                    const items = await redis.lRange(testKey, 0, -1);
                    await redis.del(testKey); // Clean up
                    
                    if (length === 3 && items.length === 3) {
                        return `List operations working (${length} items)`;
                    } else {
                        throw new Error('List operations failed');
                    }
                }
            },
            {
                name: 'Performance Test',
                test: async () => {
                    const iterations = 100;
                    const testKey = 'beautycort:perf:' + Date.now();
                    
                    const start = Date.now();
                    
                    for (let i = 0; i < iterations; i++) {
                        await redis.set(`${testKey}:${i}`, `value${i}`);
                    }
                    
                    const end = Date.now();
                    const avgTime = (end - start) / iterations;
                    
                    // Clean up
                    const keys = [];
                    for (let i = 0; i < iterations; i++) {
                        keys.push(`${testKey}:${i}`);
                    }
                    await redis.del(keys);
                    
                    return `Avg operation time: ${avgTime.toFixed(2)}ms`;
                }
            }
        ];

        let passed = 0;
        let failed = 0;

        console.log('🧪 Running Redis tests...');
        console.log('');

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
            console.log('1. Check Redis server is running');
            console.log('2. Verify connection URL and password');
            console.log('3. Check network connectivity and firewall rules');
            console.log('4. Ensure Redis version compatibility');
            console.log('');
            process.exit(1);
        } else {
            console.log('');
            console.log('🎉 All Redis tests passed! Redis is ready for production.');
            console.log('');
            console.log('🚀 Redis Performance Summary:');
            console.log('- Connection: Working');
            console.log('- Operations: All supported');
            console.log('- Caching: Ready for session management');
            console.log('- Rate limiting: Ready for API protection');
            console.log('');
            console.log('📋 Next steps:');
            console.log('1. Configure monitoring and alerts');
            console.log('2. Set up backup procedures');
            console.log('3. Test application-level caching');
            console.log('');
        }

    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        console.log('');
        console.log('🔧 Common solutions:');
        console.log('1. Check if Redis server is running');
        console.log('2. Verify REDIS_URL format (redis://host:port)');
        console.log('3. Check authentication credentials');
        console.log('4. Verify network connectivity');
        console.log('5. Check firewall/security group settings');
        console.log('');
        process.exit(1);
    } finally {
        // Clean up connection
        if (redis.isOpen) {
            await redis.disconnect();
        }
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

testRedisConnection();