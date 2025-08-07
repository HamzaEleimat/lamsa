#!/usr/bin/env node

/**
 * Newman CLI Runner for Lamsa API - Refactored Collections
 * 
 * This script provides automated testing capabilities for the Lamsa API
 * using Newman (Postman CLI runner) with support for multiple collections:
 * - Run individual collections or all collections
 * - Environment-specific test execution
 * - Comprehensive reporting
 * - Performance monitoring
 * - CI/CD integration
 */

const newman = require('newman');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class LamsaTestRunner {
    constructor(options = {}) {
        this.options = {
            environment: options.environment || 'local',
            collection: options.collection || 'all',
            reporters: options.reporters || ['cli', 'json', 'html'],
            timeout: options.timeout || 300000, // 5 minutes
            delayRequest: options.delayRequest || 500,
            verbose: options.verbose || false,
            outputDir: options.outputDir || './test-results',
            bail: options.bail || false,
            ...options
        };

        this.collectionsDir = path.join(__dirname, '../collections');
        this.environmentPath = path.join(__dirname, '../environments', `${this.options.environment}.postman_environment.json`);
        this.results = [];
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * Get all available collections
     */
    getAvailableCollections() {
        const collections = [];
        const dirs = fs.readdirSync(this.collectionsDir);
        
        dirs.forEach(dir => {
            const dirPath = path.join(this.collectionsDir, dir);
            if (fs.statSync(dirPath).isDirectory()) {
                const files = fs.readdirSync(dirPath);
                files.forEach(file => {
                    if (file.endsWith('.postman_collection.json')) {
                        collections.push({
                            name: dir,
                            file: file,
                            path: path.join(dirPath, file)
                        });
                    }
                });
            }
        });
        
        return collections;
    }

    /**
     * Validate required files exist
     */
    validateFiles() {
        // Check environment file
        if (!fs.existsSync(this.environmentPath)) {
            throw new Error(`Environment file not found: ${this.environmentPath}`);
        }

        // Check collections
        const collections = this.getAvailableCollections();
        if (collections.length === 0) {
            throw new Error('No collections found in collections directory');
        }

        if (this.options.collection !== 'all') {
            const collection = collections.find(c => c.name === this.options.collection);
            if (!collection) {
                throw new Error(`Collection not found: ${this.options.collection}`);
            }
        }

        if (this.options.verbose) {
            console.log('✓ All required files validated');
            console.log(`✓ Found ${collections.length} collections`);
        }
    }

    /**
     * Ensure output directory exists
     */
    ensureOutputDir() {
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }
    }

    /**
     * Generate timestamp for file naming
     */
    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-');
    }

    /**
     * Run the test suite
     */
    async runTests() {
        try {
            this.validateFiles();
            this.ensureOutputDir();

            console.log(`🚀 Starting Lamsa API Tests`);
            console.log(`📍 Environment: ${this.options.environment}`);
            console.log(`📊 Collection: ${this.options.collection}`);
            console.log(`📊 Reporters: ${this.options.reporters.join(', ')}`);
            console.log(`⏱️  Timeout: ${this.options.timeout}ms`);
            console.log(`📁 Output Directory: ${this.options.outputDir}`);

            this.startTime = performance.now();

            if (this.options.collection === 'all') {
                await this.runAllCollections();
            } else {
                await this.runSingleCollection();
            }

            this.endTime = performance.now();
            await this.generateSummaryReport();

        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Run a single collection
     */
    async runSingleCollection() {
        const collections = this.getAvailableCollections();
        const collection = collections.find(c => c.name === this.options.collection);
        
        if (!collection) {
            throw new Error(`Collection not found: ${this.options.collection}`);
        }

        await this.runCollection(collection);
    }

    /**
     * Run all collections
     */
    async runAllCollections() {
        const collections = this.getAvailableCollections();
        console.log(`\n🔄 Running ${collections.length} collections...`);

        // Define execution order
        const executionOrder = ['auth', 'providers', 'bookings', 'journeys', 'testing'];
        
        // Sort collections by execution order
        const sortedCollections = collections.sort((a, b) => {
            const aIndex = executionOrder.indexOf(a.name) !== -1 ? executionOrder.indexOf(a.name) : 999;
            const bIndex = executionOrder.indexOf(b.name) !== -1 ? executionOrder.indexOf(b.name) : 999;
            return aIndex - bIndex;
        });

        for (const collection of sortedCollections) {
            console.log(`\n📂 Running collection: ${collection.name}`);
            await this.runCollection(collection);
            
            // Delay between collections
            if (sortedCollections.indexOf(collection) < sortedCollections.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Run a specific collection
     */
    async runCollection(collection) {
        const timestamp = this.getTimestamp();
        const collectionName = collection.name;
        
        const runOptions = {
            collection: collection.path,
            environment: this.environmentPath,
            reporters: this.options.reporters,
            reporter: {
                cli: {
                    silent: !this.options.verbose,
                    noAssertions: false,
                    noFailures: false,
                    noSummary: false
                },
                json: {
                    export: path.join(this.options.outputDir, `${collectionName}-results-${timestamp}.json`)
                },
                html: {
                    export: path.join(this.options.outputDir, `${collectionName}-report-${timestamp}.html`)
                },
                junit: {
                    export: path.join(this.options.outputDir, `${collectionName}-junit-${timestamp}.xml`)
                }
            },
            timeout: this.options.timeout,
            delayRequest: this.options.delayRequest,
            iterationCount: 1,
            bail: this.options.bail,
            suppressExitCode: true,
            color: 'on'
        };

        return new Promise((resolve, reject) => {
            newman.run(runOptions, (err, summary) => {
                if (err) {
                    reject(err);
                } else {
                    this.results.push({
                        collection: collectionName,
                        summary: summary,
                        timestamp: timestamp
                    });
                    resolve(summary);
                }
            });
        });
    }

    /**
     * Generate comprehensive summary report
     */
    async generateSummaryReport() {
        const duration = this.endTime - this.startTime;
        const timestamp = this.getTimestamp();
        
        const summaryData = {
            testRun: {
                environment: this.options.environment,
                collection: this.options.collection,
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date(this.endTime).toISOString(),
                duration: Math.round(duration)
            },
            overallStats: this.calculateOverallStats(),
            collectionResults: this.results.map(result => ({
                collection: result.collection,
                stats: this.extractStats(result.summary),
                timestamp: result.timestamp
            })),
            performance: this.analyzePerformance(),
            recommendations: this.generateRecommendations()
        };

        // Write summary report
        const summaryPath = path.join(this.options.outputDir, `summary-${timestamp}.json`);
        fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));

        // Generate human-readable report
        const readableReport = this.generateReadableReport(summaryData);
        const reportPath = path.join(this.options.outputDir, `readable-report-${timestamp}.txt`);
        fs.writeFileSync(reportPath, readableReport);

        // Console output
        this.displaySummary(summaryData);
    }

    /**
     * Calculate overall statistics
     */
    calculateOverallStats() {
        const totals = {
            requests: 0,
            assertions: 0,
            failures: 0,
            errors: 0,
            skipped: 0
        };

        this.results.forEach(result => {
            const stats = this.extractStats(result.summary);
            totals.requests += stats.requests;
            totals.assertions += stats.assertions;
            totals.failures += stats.failures;
            totals.errors += stats.errors;
            totals.skipped += stats.skipped;
        });

        return {
            ...totals,
            successRate: totals.requests > 0 ? ((totals.requests - totals.failures) / totals.requests * 100).toFixed(2) : 0,
            assertionPassRate: totals.assertions > 0 ? ((totals.assertions - totals.failures) / totals.assertions * 100).toFixed(2) : 0
        };
    }

    /**
     * Extract statistics from Newman summary
     */
    extractStats(summary) {
        if (!summary || !summary.run) {
            return {
                requests: 0,
                assertions: 0,
                failures: 0,
                errors: 0,
                skipped: 0,
                averageResponseTime: 0
            };
        }

        const stats = summary.run.stats;
        const timings = summary.run.timings;

        return {
            requests: stats.requests.total,
            assertions: stats.assertions.total,
            failures: stats.assertions.failed,
            errors: stats.requests.failed,
            skipped: stats.requests.pending,
            averageResponseTime: timings.responseAverage || 0
        };
    }

    /**
     * Analyze performance metrics
     */
    analyzePerformance() {
        const responseTimes = [];
        const failureReasons = [];

        this.results.forEach(result => {
            if (result.summary && result.summary.run) {
                const executions = result.summary.run.executions || [];
                
                executions.forEach(execution => {
                    if (execution.response && execution.response.responseTime) {
                        responseTimes.push(execution.response.responseTime);
                    }

                    if (execution.assertions) {
                        execution.assertions.forEach(assertion => {
                            if (assertion.error) {
                                failureReasons.push(assertion.error.message);
                            }
                        });
                    }
                });
            }
        });

        const sortedTimes = responseTimes.sort((a, b) => a - b);
        const count = sortedTimes.length;

        return {
            responseTime: count > 0 ? {
                min: sortedTimes[0],
                max: sortedTimes[count - 1],
                average: sortedTimes.reduce((a, b) => a + b, 0) / count,
                median: sortedTimes[Math.floor(count / 2)],
                p95: sortedTimes[Math.floor(count * 0.95)],
                p99: sortedTimes[Math.floor(count * 0.99)]
            } : null,
            commonFailures: this.getTopFailures(failureReasons),
            totalResponseTime: sortedTimes.reduce((a, b) => a + b, 0)
        };
    }

    /**
     * Get most common failure reasons
     */
    getTopFailures(failureReasons) {
        const counts = {};
        failureReasons.forEach(reason => {
            counts[reason] = (counts[reason] || 0) + 1;
        });

        return Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([reason, count]) => ({ reason, count }));
    }

    /**
     * Generate recommendations based on results
     */
    generateRecommendations() {
        const recommendations = [];
        const overallStats = this.calculateOverallStats();
        const performance = this.analyzePerformance();

        // Success rate recommendations
        if (overallStats.successRate < 95) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                message: `Success rate is ${overallStats.successRate}%. Investigate failing tests.`
            });
        }

        // Performance recommendations
        if (performance.responseTime && performance.responseTime.average > 2000) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: `Average response time is ${performance.responseTime.average}ms. Consider optimization.`
            });
        }

        // Rate limiting recommendations
        if (performance.commonFailures.some(f => f.reason.includes('rate limit'))) {
            recommendations.push({
                type: 'rate-limiting',
                priority: 'low',
                message: 'Rate limiting detected. Consider adding delays between requests.'
            });
        }

        return recommendations;
    }

    /**
     * Generate human-readable report
     */
    generateReadableReport(summaryData) {
        const lines = [];
        lines.push('='.repeat(80));
        lines.push('Lamsa API Test Report');
        lines.push('='.repeat(80));
        lines.push('');
        
        // Test run info
        lines.push(`Environment: ${summaryData.testRun.environment}`);
        lines.push(`Collection: ${summaryData.testRun.collection}`);
        lines.push(`Start Time: ${summaryData.testRun.startTime}`);
        lines.push(`End Time: ${summaryData.testRun.endTime}`);
        lines.push(`Total Duration: ${summaryData.testRun.duration}ms`);
        lines.push('');

        // Overall statistics
        lines.push('Overall Statistics:');
        lines.push('-'.repeat(40));
        lines.push(`Total Requests: ${summaryData.overallStats.requests}`);
        lines.push(`Total Assertions: ${summaryData.overallStats.assertions}`);
        lines.push(`Failures: ${summaryData.overallStats.failures}`);
        lines.push(`Errors: ${summaryData.overallStats.errors}`);
        lines.push(`Success Rate: ${summaryData.overallStats.successRate}%`);
        lines.push(`Assertion Pass Rate: ${summaryData.overallStats.assertionPassRate}%`);
        lines.push('');

        // Performance metrics
        if (summaryData.performance.responseTime) {
            lines.push('Performance Metrics:');
            lines.push('-'.repeat(40));
            lines.push(`Average Response Time: ${summaryData.performance.responseTime.average}ms`);
            lines.push(`Min Response Time: ${summaryData.performance.responseTime.min}ms`);
            lines.push(`Max Response Time: ${summaryData.performance.responseTime.max}ms`);
            lines.push(`95th Percentile: ${summaryData.performance.responseTime.p95}ms`);
            lines.push(`99th Percentile: ${summaryData.performance.responseTime.p99}ms`);
            lines.push('');
        }

        // Recommendations
        if (summaryData.recommendations.length > 0) {
            lines.push('Recommendations:');
            lines.push('-'.repeat(40));
            summaryData.recommendations.forEach((rec, index) => {
                lines.push(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
            });
            lines.push('');
        }

        // Collection results
        lines.push('Collection Results:');
        lines.push('-'.repeat(40));
        summaryData.collectionResults.forEach(result => {
            lines.push(`${result.collection}:`);
            lines.push(`  Requests: ${result.stats.requests}`);
            lines.push(`  Assertions: ${result.stats.assertions}`);
            lines.push(`  Failures: ${result.stats.failures}`);
            lines.push(`  Avg Response Time: ${result.stats.averageResponseTime}ms`);
            lines.push('');
        });

        return lines.join('\n');
    }

    /**
     * Display summary to console
     */
    displaySummary(summaryData) {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 Lamsa API Test Summary');
        console.log('='.repeat(60));

        const stats = summaryData.overallStats;
        const duration = summaryData.testRun.duration;

        console.log(`\n📊 Results:`);
        console.log(`   Total Requests: ${stats.requests}`);
        console.log(`   Total Assertions: ${stats.assertions}`);
        console.log(`   Failures: ${stats.failures}`);
        console.log(`   Success Rate: ${stats.successRate}%`);
        console.log(`   Duration: ${duration}ms`);

        if (summaryData.performance.responseTime) {
            console.log(`\n⚡ Performance:`);
            console.log(`   Average Response Time: ${summaryData.performance.responseTime.average}ms`);
            console.log(`   95th Percentile: ${summaryData.performance.responseTime.p95}ms`);
        }

        if (summaryData.recommendations.length > 0) {
            console.log(`\n💡 Recommendations:`);
            summaryData.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        
        // Exit with appropriate code
        if (stats.failures > 0) {
            console.log('❌ Tests failed. See detailed reports for more information.');
            process.exit(1);
        } else {
            console.log('✅ All tests passed successfully!');
            process.exit(0);
        }
    }

    /**
     * List available collections
     */
    listCollections() {
        const collections = this.getAvailableCollections();
        console.log('\n📚 Available Collections:');
        console.log('='.repeat(40));
        collections.forEach(collection => {
            console.log(`  - ${collection.name}`);
        });
        console.log('\nUse --collection <name> to run a specific collection');
        console.log('Use --collection all to run all collections\n');
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--environment' || arg === '-e') {
            options.environment = args[++i];
        } else if (arg === '--collection' || arg === '-c') {
            options.collection = args[++i];
        } else if (arg === '--verbose' || arg === '-v') {
            options.verbose = true;
        } else if (arg === '--timeout' || arg === '-t') {
            options.timeout = parseInt(args[++i]);
        } else if (arg === '--output' || arg === '-o') {
            options.outputDir = args[++i];
        } else if (arg === '--delay' || arg === '-d') {
            options.delayRequest = parseInt(args[++i]);
        } else if (arg === '--bail' || arg === '-b') {
            options.bail = true;
        } else if (arg === '--list' || arg === '-l') {
            const runner = new LamsaTestRunner(options);
            runner.listCollections();
            process.exit(0);
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Lamsa API Test Runner - Refactored Collections

Usage: node newman-runner.js [options]

Options:
  -e, --environment <name>    Environment to test (local, development, staging, production)
  -c, --collection <name>     Collection to run (auth, bookings, providers, journeys, testing, all)
  -v, --verbose              Verbose output
  -t, --timeout <ms>         Request timeout in milliseconds
  -o, --output <dir>         Output directory for reports
  -d, --delay <ms>           Delay between requests in milliseconds
  -b, --bail                 Stop on first failure
  -l, --list                 List available collections
  -h, --help                 Show this help message

Examples:
  node newman-runner.js --list
  node newman-runner.js --environment local --collection auth --verbose
  node newman-runner.js --environment production --collection all
  node newman-runner.js --environment staging --collection bookings --bail
            `);
            process.exit(0);
        }
    }

    const runner = new LamsaTestRunner(options);
    runner.runTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = LamsaTestRunner;