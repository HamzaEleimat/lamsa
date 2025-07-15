#!/usr/bin/env node

/**
 * BeautyCort Database Performance Benchmarking Tool
 * 
 * This tool measures database query performance before and after optimizations
 * to validate the effectiveness of index and query improvements.
 * 
 * Usage:
 *   node performance-benchmark.js --mode=baseline
 *   node performance-benchmark.js --mode=optimized
 *   node performance-benchmark.js --mode=compare
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
    iterations: 10,
    warmupIterations: 3,
    outputFile: path.join(__dirname, 'benchmark-results.json'),
    mode: process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'baseline'
};

class PerformanceBenchmark {
    constructor() {
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
        this.results = [];
        this.testData = {
            providerIds: [],
            userIds: [],
            serviceIds: [],
            dates: []
        };
    }

    async initialize() {
        console.log('🚀 Initializing performance benchmark...');
        console.log(`Mode: ${config.mode}`);
        
        // Generate test data
        await this.generateTestData();
        
        // Warm up database connections
        await this.warmupQueries();
        
        console.log('✅ Initialization complete');
    }

    async generateTestData() {
        console.log('📊 Generating test data...');
        
        // Get sample provider IDs
        const { data: providers } = await this.supabase
            .from('providers')
            .select('id')
            .eq('verified', true)
            .limit(10);
        
        this.testData.providerIds = providers?.map(p => p.id) || [];
        
        // Get sample user IDs
        const { data: users } = await this.supabase
            .from('users')
            .select('id')
            .limit(10);
        
        this.testData.userIds = users?.map(u => u.id) || [];
        
        // Get sample service IDs
        const { data: services } = await this.supabase
            .from('services')
            .select('id')
            .eq('active', true)
            .limit(10);
        
        this.testData.serviceIds = services?.map(s => s.id) || [];
        
        // Generate date range
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            this.testData.dates.push(date.toISOString().split('T')[0]);
        }
        
        console.log(`Generated test data: ${this.testData.providerIds.length} providers, ${this.testData.userIds.length} users, ${this.testData.serviceIds.length} services`);
    }

    async warmupQueries() {
        console.log('🔥 Warming up database connections...');
        
        for (let i = 0; i < config.warmupIterations; i++) {
            await this.supabase.from('bookings').select('id').limit(1);
            await this.supabase.from('providers').select('id').limit(1);
            await this.supabase.from('services').select('id').limit(1);
        }
    }

    async measureQuery(name, queryFunction, iterations = config.iterations) {
        console.log(`📏 Measuring ${name}...`);
        
        const measurements = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = process.hrtime.bigint();
            
            try {
                const result = await queryFunction();
                const endTime = process.hrtime.bigint();
                const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                
                measurements.push({
                    iteration: i + 1,
                    executionTime,
                    rowCount: result?.data?.length || result?.count || 0,
                    success: true
                });
            } catch (error) {
                const endTime = process.hrtime.bigint();
                const executionTime = Number(endTime - startTime) / 1000000;
                
                measurements.push({
                    iteration: i + 1,
                    executionTime,
                    rowCount: 0,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Calculate statistics
        const successfulMeasurements = measurements.filter(m => m.success);
        const executionTimes = successfulMeasurements.map(m => m.executionTime);
        
        const stats = {
            queryName: name,
            totalIterations: iterations,
            successfulIterations: successfulMeasurements.length,
            failedIterations: measurements.length - successfulMeasurements.length,
            avgExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
            minExecutionTime: Math.min(...executionTimes),
            maxExecutionTime: Math.max(...executionTimes),
            medianExecutionTime: this.calculateMedian(executionTimes),
            p95ExecutionTime: this.calculatePercentile(executionTimes, 95),
            p99ExecutionTime: this.calculatePercentile(executionTimes, 99),
            avgRowCount: successfulMeasurements.reduce((a, b) => a + b.rowCount, 0) / successfulMeasurements.length,
            measurements: measurements
        };
        
        this.results.push(stats);
        
        console.log(`  ✅ ${name}: ${stats.avgExecutionTime.toFixed(2)}ms avg, ${stats.p95ExecutionTime.toFixed(2)}ms p95`);
        
        return stats;
    }

    calculateMedian(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    calculatePercentile(numbers, percentile) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    async runBaselineTests() {
        console.log('🏁 Running baseline performance tests...');
        
        // Test 1: Provider booking list (most frequent query)
        await this.measureQuery('Provider Booking List', async () => {
            const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
            return await this.supabase
                .from('bookings')
                .select(`
                    *,
                    users:user_id(name, phone),
                    providers:provider_id(business_name_en, business_name_ar),
                    services:service_id(name_en, name_ar, duration_minutes)
                `)
                .eq('provider_id', providerId)
                .in('status', ['pending', 'confirmed'])
                .order('booking_date', { ascending: false })
                .order('start_time', { ascending: false })
                .limit(20);
        });
        
        // Test 2: User booking history
        await this.measureQuery('User Booking History', async () => {
            const userId = this.testData.userIds[Math.floor(Math.random() * this.testData.userIds.length)];
            return await this.supabase
                .from('bookings')
                .select(`
                    *,
                    providers:provider_id(business_name_en, business_name_ar),
                    services:service_id(name_en, name_ar, duration_minutes)
                `)
                .eq('user_id', userId)
                .order('booking_date', { ascending: false })
                .limit(20);
        });
        
        // Test 3: Availability conflict detection
        await this.measureQuery('Availability Conflict Detection', async () => {
            const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
            const date = this.testData.dates[Math.floor(Math.random() * this.testData.dates.length)];
            
            return await this.supabase
                .from('bookings')
                .select('id, start_time, end_time')
                .eq('provider_id', providerId)
                .eq('booking_date', date)
                .not('status', 'in', '(cancelled,no_show)')
                .or(`and(start_time.lte.14:00,end_time.gt.14:00),and(start_time.lt.15:00,end_time.gte.15:00),and(start_time.gte.14:00,end_time.lte.15:00)`);
        });
        
        // Test 4: Date range analytics
        await this.measureQuery('Date Range Analytics', async () => {
            const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
            const startDate = this.testData.dates[29]; // 30 days ago
            const endDate = this.testData.dates[0]; // Today
            
            return await this.supabase
                .from('bookings')
                .select('booking_date, status, amount, platform_fee')
                .eq('provider_id', providerId)
                .gte('booking_date', startDate)
                .lte('booking_date', endDate)
                .eq('status', 'completed');
        });
        
        // Test 5: Dashboard summary query
        await this.measureQuery('Dashboard Summary', async () => {
            const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
            
            return await this.supabase
                .from('bookings')
                .select('status, amount, booking_date')
                .eq('provider_id', providerId)
                .gte('booking_date', this.testData.dates[6]) // Last 7 days
                .lte('booking_date', this.testData.dates[0]);
        });
        
        // Test 6: Service popularity query
        await this.measureQuery('Service Popularity', async () => {
            return await this.supabase
                .from('bookings')
                .select('service_id, services:service_id(name_en, name_ar)')
                .eq('status', 'completed')
                .gte('booking_date', this.testData.dates[29])
                .lte('booking_date', this.testData.dates[0]);
        });
        
        // Test 7: Upcoming bookings (real-time query)
        await this.measureQuery('Upcoming Bookings', async () => {
            const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
            const today = new Date().toISOString().split('T')[0];
            
            return await this.supabase
                .from('bookings')
                .select(`
                    *,
                    users:user_id(name, phone),
                    services:service_id(name_en, name_ar, duration_minutes)
                `)
                .eq('provider_id', providerId)
                .gte('booking_date', today)
                .in('status', ['pending', 'confirmed'])
                .order('booking_date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(10);
        });
        
        // Test 8: Revenue analytics
        await this.measureQuery('Revenue Analytics', async () => {
            const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
            
            return await this.supabase
                .from('bookings')
                .select('amount, provider_fee, platform_fee, booking_date')
                .eq('provider_id', providerId)
                .eq('status', 'completed')
                .gte('booking_date', this.testData.dates[29])
                .lte('booking_date', this.testData.dates[0]);
        });
    }

    async runOptimizedTests() {
        console.log('⚡ Running optimized performance tests...');
        
        // Test optimized functions if available
        try {
            // Test 1: Optimized provider booking list
            await this.measureQuery('Optimized Provider Booking List', async () => {
                const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
                return await this.supabase.rpc('get_provider_bookings_optimized', {
                    p_provider_id: providerId,
                    p_status: null,
                    p_date_from: null,
                    p_date_to: null,
                    p_limit: 20,
                    p_offset: 0
                });
            });
            
            // Test 2: Optimized conflict detection
            await this.measureQuery('Optimized Conflict Detection', async () => {
                const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
                const date = this.testData.dates[Math.floor(Math.random() * this.testData.dates.length)];
                
                return await this.supabase.rpc('check_booking_conflicts', {
                    p_provider_id: providerId,
                    p_booking_date: date,
                    p_start_time: '14:00',
                    p_end_time: '15:00'
                });
            });
            
            // Test 3: Optimized analytics
            await this.measureQuery('Optimized Analytics', async () => {
                const providerId = this.testData.providerIds[Math.floor(Math.random() * this.testData.providerIds.length)];
                
                return await this.supabase.rpc('get_booking_analytics_optimized', {
                    p_provider_id: providerId,
                    p_date_from: this.testData.dates[29],
                    p_date_to: this.testData.dates[0],
                    p_group_by: 'day'
                });
            });
            
            // Test 4: Materialized view query
            await this.measureQuery('Materialized View Query', async () => {
                return await this.supabase
                    .from('provider_performance_dashboard')
                    .select('*')
                    .limit(20);
            });
            
        } catch (error) {
            console.warn('⚠️ Optimized functions not available, running baseline tests with optimized indexes');
            await this.runBaselineTests();
        }
    }

    async saveResults() {
        const timestamp = new Date().toISOString();
        const benchmarkData = {
            timestamp,
            mode: config.mode,
            configuration: {
                iterations: config.iterations,
                warmupIterations: config.warmupIterations,
                supabaseUrl: config.supabaseUrl
            },
            testData: {
                providerCount: this.testData.providerIds.length,
                userCount: this.testData.userIds.length,
                serviceCount: this.testData.serviceIds.length,
                dateRange: this.testData.dates.length
            },
            results: this.results,
            summary: this.generateSummary()
        };
        
        // Save to file
        fs.writeFileSync(config.outputFile, JSON.stringify(benchmarkData, null, 2));
        
        // Also save mode-specific file
        const modeFile = path.join(__dirname, `benchmark-${config.mode}-${timestamp.split('T')[0]}.json`);
        fs.writeFileSync(modeFile, JSON.stringify(benchmarkData, null, 2));
        
        console.log(`📊 Results saved to ${config.outputFile} and ${modeFile}`);
    }

    generateSummary() {
        const summary = {
            totalQueries: this.results.length,
            totalExecutionTime: this.results.reduce((sum, r) => sum + r.avgExecutionTime, 0),
            avgExecutionTime: this.results.reduce((sum, r) => sum + r.avgExecutionTime, 0) / this.results.length,
            slowestQuery: this.results.reduce((slowest, r) => 
                r.avgExecutionTime > slowest.avgExecutionTime ? r : slowest
            ),
            fastestQuery: this.results.reduce((fastest, r) => 
                r.avgExecutionTime < fastest.avgExecutionTime ? r : fastest
            ),
            failureRate: this.results.reduce((sum, r) => sum + r.failedIterations, 0) / 
                         this.results.reduce((sum, r) => sum + r.totalIterations, 0),
            performanceGrades: this.results.map(r => ({
                queryName: r.queryName,
                grade: this.getPerformanceGrade(r.avgExecutionTime),
                executionTime: r.avgExecutionTime
            }))
        };
        
        return summary;
    }

    getPerformanceGrade(executionTime) {
        if (executionTime < 50) return 'A';
        if (executionTime < 100) return 'B';
        if (executionTime < 200) return 'C';
        if (executionTime < 500) return 'D';
        return 'F';
    }

    async compareResults() {
        console.log('🔍 Comparing performance results...');
        
        // Load baseline results
        const baselineFile = path.join(__dirname, 'benchmark-baseline.json');
        const optimizedFile = path.join(__dirname, 'benchmark-optimized.json');
        
        if (!fs.existsSync(baselineFile)) {
            console.error('❌ Baseline results not found. Run with --mode=baseline first.');
            return;
        }
        
        if (!fs.existsSync(optimizedFile)) {
            console.error('❌ Optimized results not found. Run with --mode=optimized first.');
            return;
        }
        
        const baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
        const optimizedData = JSON.parse(fs.readFileSync(optimizedFile, 'utf8'));
        
        const comparison = {
            timestamp: new Date().toISOString(),
            baseline: baselineData.summary,
            optimized: optimizedData.summary,
            improvements: {},
            queryComparisons: []
        };
        
        // Calculate overall improvements
        comparison.improvements = {
            avgExecutionTime: {
                baseline: baselineData.summary.avgExecutionTime,
                optimized: optimizedData.summary.avgExecutionTime,
                improvement: ((baselineData.summary.avgExecutionTime - optimizedData.summary.avgExecutionTime) / baselineData.summary.avgExecutionTime * 100).toFixed(2) + '%'
            },
            totalExecutionTime: {
                baseline: baselineData.summary.totalExecutionTime,
                optimized: optimizedData.summary.totalExecutionTime,
                improvement: ((baselineData.summary.totalExecutionTime - optimizedData.summary.totalExecutionTime) / baselineData.summary.totalExecutionTime * 100).toFixed(2) + '%'
            }
        };
        
        // Compare individual queries
        baselineData.results.forEach(baselineQuery => {
            const optimizedQuery = optimizedData.results.find(q => 
                q.queryName === baselineQuery.queryName || 
                q.queryName.includes(baselineQuery.queryName.split(' ')[0])
            );
            
            if (optimizedQuery) {
                const improvement = ((baselineQuery.avgExecutionTime - optimizedQuery.avgExecutionTime) / baselineQuery.avgExecutionTime * 100);
                
                comparison.queryComparisons.push({
                    queryName: baselineQuery.queryName,
                    baseline: {
                        avgTime: baselineQuery.avgExecutionTime,
                        p95Time: baselineQuery.p95ExecutionTime,
                        grade: this.getPerformanceGrade(baselineQuery.avgExecutionTime)
                    },
                    optimized: {
                        avgTime: optimizedQuery.avgExecutionTime,
                        p95Time: optimizedQuery.p95ExecutionTime,
                        grade: this.getPerformanceGrade(optimizedQuery.avgExecutionTime)
                    },
                    improvement: improvement.toFixed(2) + '%',
                    improvementRatio: improvement > 0 ? 'IMPROVED' : 'DEGRADED'
                });
            }
        });
        
        // Save comparison
        const comparisonFile = path.join(__dirname, 'benchmark-comparison.json');
        fs.writeFileSync(comparisonFile, JSON.stringify(comparison, null, 2));
        
        // Display results
        console.log('\n📊 PERFORMANCE COMPARISON RESULTS');
        console.log('=====================================');
        console.log(`Overall Average Execution Time: ${comparison.improvements.avgExecutionTime.improvement} improvement`);
        console.log(`Overall Total Execution Time: ${comparison.improvements.totalExecutionTime.improvement} improvement`);
        console.log('\nQuery-by-Query Analysis:');
        comparison.queryComparisons.forEach(query => {
            const status = query.improvementRatio === 'IMPROVED' ? '✅' : '❌';
            console.log(`${status} ${query.queryName}: ${query.improvement} (${query.baseline.avgTime.toFixed(2)}ms → ${query.optimized.avgTime.toFixed(2)}ms)`);
        });
        
        console.log(`\n📊 Detailed results saved to ${comparisonFile}`);
    }

    async printResults() {
        console.log('\n📊 PERFORMANCE BENCHMARK RESULTS');
        console.log('==================================');
        console.log(`Mode: ${config.mode}`);
        console.log(`Iterations per query: ${config.iterations}`);
        console.log(`Total queries tested: ${this.results.length}`);
        console.log(`Average execution time: ${this.generateSummary().avgExecutionTime.toFixed(2)}ms`);
        console.log(`Failure rate: ${(this.generateSummary().failureRate * 100).toFixed(2)}%`);
        
        console.log('\nQuery Performance Summary:');
        this.results.forEach(result => {
            const grade = this.getPerformanceGrade(result.avgExecutionTime);
            console.log(`  ${grade} ${result.queryName}: ${result.avgExecutionTime.toFixed(2)}ms avg, ${result.p95ExecutionTime.toFixed(2)}ms p95`);
        });
        
        console.log('\nTop 3 Slowest Queries:');
        const slowest = [...this.results]
            .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
            .slice(0, 3);
        
        slowest.forEach((query, index) => {
            console.log(`  ${index + 1}. ${query.queryName}: ${query.avgExecutionTime.toFixed(2)}ms`);
        });
    }

    async run() {
        try {
            await this.initialize();
            
            switch (config.mode) {
                case 'baseline':
                    await this.runBaselineTests();
                    break;
                case 'optimized':
                    await this.runOptimizedTests();
                    break;
                case 'compare':
                    await this.compareResults();
                    return;
                default:
                    console.error('Invalid mode. Use: baseline, optimized, or compare');
                    return;
            }
            
            await this.printResults();
            await this.saveResults();
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            process.exit(1);
        }
    }
}

// Run the benchmark
if (require.main === module) {
    const benchmark = new PerformanceBenchmark();
    benchmark.run();
}

module.exports = PerformanceBenchmark;