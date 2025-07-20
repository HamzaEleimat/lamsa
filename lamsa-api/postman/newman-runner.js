#!/usr/bin/env node

/**
 * Newman CLI Runner for BeautyCort API
 * 
 * This script provides automated testing capabilities for the BeautyCort API
 * using Newman (Postman CLI runner) with advanced features:
 * - Environment-specific test execution
 * - Parallel test execution
 * - Comprehensive reporting
 * - Performance monitoring
 * - CI/CD integration
 * - Test result analysis
 */

const newman = require('newman');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class BeautyCortTestRunner {
    constructor(options = {}) {
        this.options = {
            environment: options.environment || 'development',
            reporters: options.reporters || ['cli', 'json', 'html'],
            timeout: options.timeout || 300000, // 5 minutes
            delayRequest: options.delayRequest || 500,
            parallel: options.parallel || false,
            verbose: options.verbose || false,
            outputDir: options.outputDir || './test-results',
            ...options
        };

        this.collectionPath = path.join(__dirname, 'BeautyCort-API.postman_collection.json');
        this.environmentPath = path.join(__dirname, 'environments', `${this.options.environment}.postman_environment.json`);
        this.results = [];
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * Validate required files exist
     */
    validateFiles() {
        const requiredFiles = [
            { path: this.collectionPath, name: 'Collection' },
            { path: this.environmentPath, name: 'Environment' }
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file.path)) {
                throw new Error(`${file.name} file not found: ${file.path}`);
            }
        }

        if (this.options.verbose) {
            console.log('✓ All required files validated');
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
     * Run the complete test suite
     */
    async runTests() {
        try {
            this.validateFiles();
            this.ensureOutputDir();

            console.log(`🚀 Starting BeautyCort API Tests`);
            console.log(`📍 Environment: ${this.options.environment}`);
            console.log(`📊 Reporters: ${this.options.reporters.join(', ')}`);
            console.log(`⏱️  Timeout: ${this.options.timeout}ms`);
            console.log(`📁 Output Directory: ${this.options.outputDir}`);

            this.startTime = performance.now();

            if (this.options.parallel) {
                await this.runParallelTests();
            } else {
                await this.runSequentialTests();
            }

            this.endTime = performance.now();
            await this.generateSummaryReport();

        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Run tests sequentially (default mode)
     */
    async runSequentialTests() {
        const timestamp = this.getTimestamp();
        
        const runOptions = {
            collection: this.collectionPath,
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
                    export: path.join(this.options.outputDir, `results-${timestamp}.json`)
                },
                html: {
                    export: path.join(this.options.outputDir, `report-${timestamp}.html`)
                },
                junit: {
                    export: path.join(this.options.outputDir, `junit-${timestamp}.xml`)
                }
            },
            timeout: this.options.timeout,
            delayRequest: this.options.delayRequest,
            iterationCount: 1,
            bail: false,
            suppressExitCode: false,
            color: 'on'
        };

        return new Promise((resolve, reject) => {
            newman.run(runOptions, (err, summary) => {
                if (err) {
                    reject(err);
                } else {
                    this.results.push({
                        type: 'sequential',
                        summary: summary,
                        timestamp: timestamp
                    });
                    resolve(summary);
                }
            });
        });
    }

    /**
     * Run tests in parallel by folder
     */
    async runParallelTests() {
        const collection = JSON.parse(fs.readFileSync(this.collectionPath, 'utf8'));
        const folders = collection.item || [];
        
        console.log(`🔄 Running ${folders.length} test folders in parallel...`);

        const promises = folders.map((folder, index) => {
            return this.runFolderTests(folder, index);
        });

        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                this.results.push(result.value);
            } else {
                console.error(`❌ Folder ${index} failed:`, result.reason);
            }
        });
    }

    /**
     * Run tests for a specific folder
     */
    async runFolderTests(folder, index) {
        const timestamp = this.getTimestamp();
        const folderName = folder.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        
        // Create a temporary collection with only this folder
        const tempCollection = {
            ...JSON.parse(fs.readFileSync(this.collectionPath, 'utf8')),
            item: [folder]
        };

        const tempCollectionPath = path.join(this.options.outputDir, `temp-${folderName}-${timestamp}.json`);
        fs.writeFileSync(tempCollectionPath, JSON.stringify(tempCollection, null, 2));

        const runOptions = {
            collection: tempCollectionPath,
            environment: this.environmentPath,
            reporters: ['json'],
            reporter: {
                json: {
                    export: path.join(this.options.outputDir, `${folderName}-${timestamp}.json`)
                }
            },
            timeout: this.options.timeout,
            delayRequest: this.options.delayRequest,
            iterationCount: 1,
            bail: false,
            suppressExitCode: true,
            color: 'off'
        };

        return new Promise((resolve, reject) => {
            newman.run(runOptions, (err, summary) => {
                // Clean up temp file
                fs.unlinkSync(tempCollectionPath);

                if (err) {
                    reject(err);
                } else {
                    resolve({
                        type: 'parallel',
                        folder: folder.name,
                        summary: summary,
                        timestamp: timestamp,
                        index: index
                    });
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
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date(this.endTime).toISOString(),
                duration: Math.round(duration),
                type: this.options.parallel ? 'parallel' : 'sequential'
            },
            overallStats: this.calculateOverallStats(),
            folderResults: this.results.map(result => ({
                folder: result.folder || 'All Tests',
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
        lines.push('BeautyCort API Test Report');
        lines.push('='.repeat(80));
        lines.push('');
        
        // Test run info
        lines.push(`Environment: ${summaryData.testRun.environment}`);
        lines.push(`Execution Type: ${summaryData.testRun.type}`);
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

        // Folder results
        lines.push('Folder Results:');
        lines.push('-'.repeat(40));
        summaryData.folderResults.forEach(result => {
            lines.push(`${result.folder}:`);
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
        console.log('🎯 BeautyCort API Test Summary');
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
        } else if (arg === '--parallel' || arg === '-p') {
            options.parallel = true;
        } else if (arg === '--verbose' || arg === '-v') {
            options.verbose = true;
        } else if (arg === '--timeout' || arg === '-t') {
            options.timeout = parseInt(args[++i]);
        } else if (arg === '--output' || arg === '-o') {
            options.outputDir = args[++i];
        } else if (arg === '--delay' || arg === '-d') {
            options.delayRequest = parseInt(args[++i]);
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
BeautyCort API Test Runner

Usage: node newman-runner.js [options]

Options:
  -e, --environment <name>    Environment to test (development, production)
  -p, --parallel             Run tests in parallel by folder
  -v, --verbose              Verbose output
  -t, --timeout <ms>         Request timeout in milliseconds
  -o, --output <dir>         Output directory for reports
  -d, --delay <ms>           Delay between requests in milliseconds
  -h, --help                 Show this help message

Examples:
  node newman-runner.js --environment development --verbose
  node newman-runner.js --environment production --parallel --timeout 60000
  node newman-runner.js --environment development --output ./custom-reports
            `);
            process.exit(0);
        }
    }

    const runner = new BeautyCortTestRunner(options);
    runner.runTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = BeautyCortTestRunner;