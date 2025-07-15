#!/usr/bin/env node

/**
 * Database Performance Validation Script
 * 
 * This script validates the effectiveness of database optimizations by:
 * 1. Running comprehensive performance tests
 * 2. Validating index usage
 * 3. Checking query execution plans
 * 4. Monitoring system impact
 * 5. Generating detailed reports
 * 
 * Usage:
 *   node validate-performance.js [options]
 * 
 * Options:
 *   --mode=full|quick|indexes|queries
 *   --output=console|file|both
 *   --verbose
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
    supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
    mode: process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'full',
    output: process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'both',
    verbose: process.argv.includes('--verbose'),
    reportFile: path.join(__dirname, 'performance-validation-report.json')
};

class PerformanceValidator {
    constructor() {
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
        this.results = {
            timestamp: new Date().toISOString(),
            mode: config.mode,
            tests: [],
            indexAnalysis: {},
            queryPlans: [],
            recommendations: [],
            summary: {}
        };
        this.testData = {};
    }

    async initialize() {
        this.log('🚀 Initializing performance validation...');
        
        // Generate test data
        await this.generateTestData();
        
        // Check if optimization functions exist
        await this.checkOptimizationSetup();
        
        this.log('✅ Initialization complete');
    }

    async generateTestData() {
        try {
            // Get sample data for testing
            const [providersResult, usersResult, servicesResult] = await Promise.all([
                this.supabase.from('providers').select('id').eq('verified', true).limit(10),
                this.supabase.from('users').select('id').limit(10),
                this.supabase.from('services').select('id').eq('active', true).limit(10)
            ]);

            this.testData = {
                providerIds: providersResult.data?.map(p => p.id) || [],
                userIds: usersResult.data?.map(u => u.id) || [],
                serviceIds: servicesResult.data?.map(s => s.id) || [],
                testDate: new Date().toISOString().split('T')[0]
            };

            this.log(`📊 Generated test data: ${this.testData.providerIds.length} providers, ${this.testData.userIds.length} users`);
        } catch (error) {
            this.log(`❌ Failed to generate test data: ${error.message}`);
        }
    }

    async checkOptimizationSetup() {
        this.log('🔍 Checking optimization setup...');
        
        try {
            // Check if optimization schema exists
            const { data: schemas } = await this.supabase
                .from('information_schema.schemata')
                .select('schema_name')
                .eq('schema_name', 'optimization');

            const optimizationExists = schemas && schemas.length > 0;
            
            // Check if optimized functions exist
            const { data: functions } = await this.supabase
                .from('information_schema.routines')
                .select('routine_name')
                .eq('routine_schema', 'optimization');

            const optimizedFunctions = functions?.map(f => f.routine_name) || [];
            
            this.results.optimizationSetup = {
                schemaExists: optimizationExists,
                functions: optimizedFunctions,
                functionsAvailable: optimizedFunctions.length > 0
            };

            this.log(`✅ Optimization setup: ${optimizationExists ? 'Schema exists' : 'Schema missing'}, ${optimizedFunctions.length} functions found`);
        } catch (error) {
            this.log(`⚠️ Could not check optimization setup: ${error.message}`);
        }
    }

    async runPerformanceTests() {
        this.log('🏃 Running performance tests...');
        
        const tests = [
            {
                name: 'Provider Booking List',
                type: 'frequent_query',
                test: () => this.testProviderBookingList()
            },
            {
                name: 'User Booking History',
                type: 'frequent_query',
                test: () => this.testUserBookingHistory()
            },
            {
                name: 'Availability Conflict Detection',
                type: 'critical_query',
                test: () => this.testAvailabilityConflict()
            },
            {
                name: 'Dashboard Analytics',
                type: 'analytics_query',
                test: () => this.testDashboardAnalytics()
            },
            {
                name: 'Booking Search with Filters',
                type: 'complex_query',
                test: () => this.testBookingSearch()
            },
            {
                name: 'Revenue Analytics',
                type: 'analytics_query',
                test: () => this.testRevenueAnalytics()
            }
        ];

        for (const test of tests) {
            if (this.testData.providerIds.length === 0 && test.type !== 'analytics_query') {
                this.log(`⏭️ Skipping ${test.name} - no test data`);
                continue;
            }

            try {
                const result = await this.runTest(test.name, test.test);
                this.results.tests.push(result);
            } catch (error) {
                this.log(`❌ Test failed: ${test.name} - ${error.message}`);
                this.results.tests.push({
                    name: test.name,
                    type: test.type,
                    success: false,
                    error: error.message,
                    executionTime: 0
                });
            }
        }
    }

    async runTest(testName, testFunction) {
        const iterations = config.mode === 'quick' ? 3 : 5;
        const measurements = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = process.hrtime.bigint();
            const result = await testFunction();
            const endTime = process.hrtime.bigint();
            
            const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            measurements.push({
                iteration: i + 1,
                executionTime,
                rowCount: result?.data?.length || result?.count || 0,
                success: true
            });
        }

        // Calculate statistics
        const executionTimes = measurements.map(m => m.executionTime);
        const avgExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const minExecutionTime = Math.min(...executionTimes);
        const maxExecutionTime = Math.max(...executionTimes);
        
        const testResult = {
            name: testName,
            type: 'performance',
            success: true,
            iterations,
            avgExecutionTime,
            minExecutionTime,
            maxExecutionTime,
            measurements,
            performance: this.getPerformanceGrade(avgExecutionTime)
        };

        this.log(`  ✅ ${testName}: ${avgExecutionTime.toFixed(2)}ms avg (${testResult.performance})`);
        return testResult;
    }

    async testProviderBookingList() {
        const providerId = this.testData.providerIds[0];
        
        // Test both old and new query if available
        if (this.results.optimizationSetup?.functionsAvailable) {
            return await this.supabase.rpc('get_provider_bookings_optimized', {
                p_provider_id: providerId,
                p_status: null,
                p_date_from: null,
                p_date_to: null,
                p_limit: 20,
                p_offset: 0
            });
        } else {
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
                .limit(20);
        }
    }

    async testUserBookingHistory() {
        const userId = this.testData.userIds[0];
        
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
    }

    async testAvailabilityConflict() {
        const providerId = this.testData.providerIds[0];
        
        if (this.results.optimizationSetup?.functionsAvailable) {
            return await this.supabase.rpc('check_booking_conflicts', {
                p_provider_id: providerId,
                p_booking_date: this.testData.testDate,
                p_start_time: '14:00',
                p_end_time: '15:00'
            });
        } else {
            return await this.supabase
                .from('bookings')
                .select('id, start_time, end_time')
                .eq('provider_id', providerId)
                .eq('booking_date', this.testData.testDate)
                .not('status', 'in', '(cancelled,no_show)');
        }
    }

    async testDashboardAnalytics() {
        const providerId = this.testData.providerIds[0];
        
        // Try materialized view first
        try {
            return await this.supabase
                .from('provider_performance_dashboard')
                .select('*')
                .eq('provider_id', providerId)
                .single();
        } catch (error) {
            // Fallback to regular query
            return await this.supabase
                .from('bookings')
                .select('status, amount, booking_date')
                .eq('provider_id', providerId)
                .gte('booking_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        }
    }

    async testBookingSearch() {
        return await this.supabase
            .from('bookings')
            .select('*')
            .in('status', ['pending', 'confirmed', 'completed'])
            .gte('booking_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('booking_date', { ascending: false })
            .limit(50);
    }

    async testRevenueAnalytics() {
        const providerId = this.testData.providerIds[0];
        
        if (this.results.optimizationSetup?.functionsAvailable) {
            return await this.supabase.rpc('get_booking_analytics_optimized', {
                p_provider_id: providerId,
                p_date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                p_date_to: this.testData.testDate,
                p_group_by: 'day'
            });
        } else {
            return await this.supabase
                .from('bookings')
                .select('amount, provider_fee, platform_fee, booking_date')
                .eq('provider_id', providerId)
                .eq('status', 'completed')
                .gte('booking_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        }
    }

    async analyzeIndexUsage() {
        this.log('📊 Analyzing index usage...');
        
        try {
            if (this.results.optimizationSetup?.functionsAvailable) {
                const { data: indexStats } = await this.supabase.rpc('analyze_index_usage');
                
                this.results.indexAnalysis = {
                    indexes: indexStats || [],
                    totalIndexes: indexStats?.length || 0,
                    unusedIndexes: indexStats?.filter(idx => idx.scans === 0).length || 0,
                    mostUsedIndex: indexStats?.reduce((max, idx) => 
                        idx.scans > max.scans ? idx : max, { scans: 0 }) || null
                };
            } else {
                // Basic index analysis
                const { data: indexes } = await this.supabase
                    .from('pg_stat_user_indexes')
                    .select('indexrelname, relname, idx_scan, idx_tup_read, idx_tup_fetch')
                    .eq('schemaname', 'public');

                this.results.indexAnalysis = {
                    indexes: indexes || [],
                    totalIndexes: indexes?.length || 0,
                    unusedIndexes: indexes?.filter(idx => idx.idx_scan === 0).length || 0,
                    mostUsedIndex: indexes?.reduce((max, idx) => 
                        idx.idx_scan > max.idx_scan ? idx : max, { idx_scan: 0 }) || null
                };
            }
            
            this.log(`📈 Index analysis: ${this.results.indexAnalysis.totalIndexes} indexes, ${this.results.indexAnalysis.unusedIndexes} unused`);
        } catch (error) {
            this.log(`❌ Index analysis failed: ${error.message}`);
        }
    }

    async analyzeQueryPlans() {
        this.log('🔍 Analyzing query execution plans...');
        
        const testQueries = [
            {
                name: 'Provider Booking List',
                query: `
                    SELECT * FROM bookings 
                    WHERE provider_id = $1 
                    AND status IN ('pending', 'confirmed')
                    ORDER BY booking_date DESC, start_time DESC
                    LIMIT 20
                `,
                params: [this.testData.providerIds[0]]
            },
            {
                name: 'Availability Conflict Check',
                query: `
                    SELECT COUNT(*) FROM bookings 
                    WHERE provider_id = $1 
                    AND booking_date = $2
                    AND status NOT IN ('cancelled', 'no_show')
                    AND (
                        (start_time <= $3 AND end_time > $3) OR
                        (start_time < $4 AND end_time >= $4) OR
                        (start_time >= $3 AND end_time <= $4)
                    )
                `,
                params: [this.testData.providerIds[0], this.testData.testDate, '14:00', '15:00']
            },
            {
                name: 'Dashboard Analytics',
                query: `
                    SELECT 
                        DATE_TRUNC('day', booking_date) as day,
                        COUNT(*) as booking_count,
                        SUM(amount) as total_amount
                    FROM bookings 
                    WHERE provider_id = $1 
                    AND booking_date >= $2
                    AND status = 'completed'
                    GROUP BY DATE_TRUNC('day', booking_date)
                `,
                params: [this.testData.providerIds[0], new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
            }
        ];

        for (const testQuery of testQueries) {
            try {
                const { data: plan } = await this.supabase.rpc('explain_query', {
                    query: testQuery.query,
                    params: testQuery.params
                });

                this.results.queryPlans.push({
                    name: testQuery.name,
                    plan: plan || 'Plan not available',
                    usesIndex: plan?.includes('Index') || false,
                    hasSeqScan: plan?.includes('Seq Scan') || false
                });
            } catch (error) {
                this.log(`⚠️ Could not analyze query plan for ${testQuery.name}: ${error.message}`);
            }
        }
    }

    generateRecommendations() {
        this.log('💡 Generating recommendations...');
        
        const recommendations = [];
        
        // Performance-based recommendations
        const slowQueries = this.results.tests.filter(test => test.avgExecutionTime > 500);
        if (slowQueries.length > 0) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: `${slowQueries.length} queries are running slower than 500ms. Consider further optimization.`,
                queries: slowQueries.map(q => q.name)
            });
        }

        // Index usage recommendations
        if (this.results.indexAnalysis.unusedIndexes > 0) {
            recommendations.push({
                type: 'indexes',
                priority: 'medium',
                message: `${this.results.indexAnalysis.unusedIndexes} indexes are not being used. Consider removing them to improve write performance.`
            });
        }

        // Query plan recommendations
        const seqScanQueries = this.results.queryPlans.filter(plan => plan.hasSeqScan);
        if (seqScanQueries.length > 0) {
            recommendations.push({
                type: 'query_optimization',
                priority: 'high',
                message: `${seqScanQueries.length} queries are using sequential scans. Consider adding indexes.`,
                queries: seqScanQueries.map(q => q.name)
            });
        }

        // Optimization setup recommendations
        if (!this.results.optimizationSetup?.functionsAvailable) {
            recommendations.push({
                type: 'setup',
                priority: 'high',
                message: 'Optimization functions are not available. Run the optimization script to enable advanced features.'
            });
        }

        this.results.recommendations = recommendations;
        this.log(`📋 Generated ${recommendations.length} recommendations`);
    }

    generateSummary() {
        const tests = this.results.tests.filter(test => test.success);
        const avgExecutionTime = tests.reduce((sum, test) => sum + test.avgExecutionTime, 0) / tests.length;
        
        const performanceGrades = tests.map(test => this.getPerformanceGrade(test.avgExecutionTime));
        const gradeDistribution = {
            A: performanceGrades.filter(g => g === 'A').length,
            B: performanceGrades.filter(g => g === 'B').length,
            C: performanceGrades.filter(g => g === 'C').length,
            D: performanceGrades.filter(g => g === 'D').length,
            F: performanceGrades.filter(g => g === 'F').length
        };

        this.results.summary = {
            testsRun: this.results.tests.length,
            successfulTests: tests.length,
            failedTests: this.results.tests.length - tests.length,
            averageExecutionTime: avgExecutionTime,
            performanceGrades: gradeDistribution,
            overallGrade: this.getOverallGrade(gradeDistribution),
            indexesAnalyzed: this.results.indexAnalysis.totalIndexes,
            unusedIndexes: this.results.indexAnalysis.unusedIndexes,
            recommendationsCount: this.results.recommendations.length,
            highPriorityRecommendations: this.results.recommendations.filter(r => r.priority === 'high').length
        };
    }

    getPerformanceGrade(executionTime) {
        if (executionTime < 50) return 'A';
        if (executionTime < 100) return 'B';
        if (executionTime < 200) return 'C';
        if (executionTime < 500) return 'D';
        return 'F';
    }

    getOverallGrade(gradeDistribution) {
        const totalTests = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);
        if (totalTests === 0) return 'F';
        
        const weightedScore = (gradeDistribution.A * 5 + gradeDistribution.B * 4 + gradeDistribution.C * 3 + gradeDistribution.D * 2 + gradeDistribution.F * 1) / totalTests;
        
        if (weightedScore >= 4.5) return 'A';
        if (weightedScore >= 3.5) return 'B';
        if (weightedScore >= 2.5) return 'C';
        if (weightedScore >= 1.5) return 'D';
        return 'F';
    }

    async saveReport() {
        if (config.output === 'console') return;
        
        fs.writeFileSync(config.reportFile, JSON.stringify(this.results, null, 2));
        this.log(`📄 Report saved to ${config.reportFile}`);
    }

    printReport() {
        if (config.output === 'file') return;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 DATABASE PERFORMANCE VALIDATION REPORT');
        console.log('='.repeat(60));
        
        console.log(`\nMode: ${config.mode}`);
        console.log(`Timestamp: ${this.results.timestamp}`);
        console.log(`Overall Grade: ${this.results.summary.overallGrade}`);
        
        console.log('\n📈 Performance Summary:');
        console.log(`  Tests Run: ${this.results.summary.testsRun}`);
        console.log(`  Successful: ${this.results.summary.successfulTests}`);
        console.log(`  Failed: ${this.results.summary.failedTests}`);
        console.log(`  Average Execution Time: ${this.results.summary.averageExecutionTime?.toFixed(2)}ms`);
        
        console.log('\n📊 Performance Grades:');
        Object.entries(this.results.summary.performanceGrades).forEach(([grade, count]) => {
            if (count > 0) {
                console.log(`  ${grade}: ${count} queries`);
            }
        });
        
        console.log('\n🔍 Index Analysis:');
        console.log(`  Total Indexes: ${this.results.summary.indexesAnalyzed}`);
        console.log(`  Unused Indexes: ${this.results.summary.unusedIndexes}`);
        
        console.log('\n💡 Recommendations:');
        console.log(`  Total: ${this.results.summary.recommendationsCount}`);
        console.log(`  High Priority: ${this.results.summary.highPriorityRecommendations}`);
        
        if (this.results.recommendations.length > 0) {
            console.log('\nTop Recommendations:');
            this.results.recommendations.slice(0, 3).forEach((rec, index) => {
                console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
    }

    log(message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        if (config.verbose || config.output !== 'file') {
            console.log(`[${timestamp}] ${message}`);
        }
    }

    async run() {
        try {
            await this.initialize();
            
            if (config.mode === 'full' || config.mode === 'quick') {
                await this.runPerformanceTests();
            }
            
            if (config.mode === 'full' || config.mode === 'indexes') {
                await this.analyzeIndexUsage();
            }
            
            if (config.mode === 'full' || config.mode === 'queries') {
                await this.analyzeQueryPlans();
            }
            
            this.generateRecommendations();
            this.generateSummary();
            
            this.printReport();
            await this.saveReport();
            
            this.log('✅ Performance validation completed successfully');
            
        } catch (error) {
            this.log(`❌ Validation failed: ${error.message}`);
            process.exit(1);
        }
    }
}

// Run the validator
if (require.main === module) {
    const validator = new PerformanceValidator();
    validator.run();
}

module.exports = PerformanceValidator;