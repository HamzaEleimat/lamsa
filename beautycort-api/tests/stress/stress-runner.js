#!/usr/bin/env node

/**
 * Stress Test Runner CLI Tool
 * Provides convenient interface for running stress tests with various configurations
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const STRESS_TESTS = {
  'concurrent-booking': {
    file: 'concurrent-booking-stress.test.js',
    description: 'Tests concurrent booking race conditions and platform fee calculations',
    timeout: 60000
  },
  'rate-limiting': {
    file: 'rate-limiting-stress.test.js',
    description: 'Tests API rate limiting effectiveness under various load patterns',
    timeout: 120000
  },
  'availability': {
    file: 'availability-stress.test.js',
    description: 'Tests availability calculation performance with Jordan cultural considerations',
    timeout: 45000
  },
  'database': {
    file: 'database-stress.test.js',
    description: 'Tests database connection pooling and transaction handling under load',
    timeout: 50000
  },
  'notification': {
    file: 'notification-stress.test.js',
    description: 'Tests notification queue processing and delivery timing',
    timeout: 40000
  },
  'mixed-workload': {
    file: 'mixed-workload-stress.test.js',
    description: 'Tests realistic production traffic patterns and system stability',
    timeout: 50000
  }
};

class StressTestRunner {
  constructor() {
    this.args = process.argv.slice(2);
    this.testDir = path.join(__dirname);
    this.reportDir = path.join(__dirname, 'reports');
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  showHelp() {
    console.log(`
🧪 BeautyCort API Stress Test Runner

Usage: node stress-runner.js [command] [options]

Commands:
  list                List all available stress tests
  run <test>          Run a specific stress test
  run-all             Run all stress tests sequentially
  benchmark           Run performance benchmark suite
  help                Show this help message

Test Names:
${Object.entries(STRESS_TESTS).map(([name, config]) => 
  `  ${name.padEnd(18)} ${config.description}`
).join('\n')}

Options:
  --timeout <ms>      Override default timeout (in milliseconds)
  --verbose           Enable verbose output
  --report <format>   Generate report (json, html, markdown)
  --parallel          Run tests in parallel (for run-all)
  --env <name>        Specify test environment (test, staging, load)

Examples:
  node stress-runner.js list
  node stress-runner.js run concurrent-booking
  node stress-runner.js run-all --report json
  node stress-runner.js benchmark --verbose
  node stress-runner.js run availability --timeout 60000
    `);
  }

  listTests() {
    console.log('\n📋 Available Stress Tests:\n');
    
    Object.entries(STRESS_TESTS).forEach(([name, config]) => {
      console.log(`🔹 ${name}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   File: ${config.file}`);
      console.log(`   Default Timeout: ${config.timeout}ms`);
      console.log('');
    });
  }

  async runTest(testName, options = {}) {
    const testConfig = STRESS_TESTS[testName];
    if (!testConfig) {
      console.error(`❌ Unknown test: ${testName}`);
      console.log('Available tests:', Object.keys(STRESS_TESTS).join(', '));
      process.exit(1);
    }

    const testFile = path.join(this.testDir, testConfig.file);
    if (!fs.existsSync(testFile)) {
      console.error(`❌ Test file not found: ${testFile}`);
      process.exit(1);
    }

    console.log(`\n🚀 Running stress test: ${testName}`);
    console.log(`📄 Description: ${testConfig.description}`);
    console.log(`⏱️  Timeout: ${options.timeout || testConfig.timeout}ms\n`);

    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const jestArgs = [
        testFile,
        '--verbose',
        '--detectOpenHandles',
        '--forceExit',
        `--testTimeout=${options.timeout || testConfig.timeout}`
      ];

      if (options.reportFormat) {
        const reportFile = path.join(this.reportDir, `${testName}-${Date.now()}.${options.reportFormat}`);
        if (options.reportFormat === 'json') {
          jestArgs.push('--json', `--outputFile=${reportFile}`);
        }
      }

      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: options.verbose ? 'inherit' : 'pipe',
        env: {
          ...process.env,
          NODE_ENV: options.env || 'test',
          STRESS_TEST_MODE: 'true'
        }
      });

      let output = '';
      let errorOutput = '';

      if (!options.verbose) {
        jest.stdout?.on('data', (data) => {
          output += data.toString();
        });

        jest.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          console.log(`✅ Test ${testName} completed successfully in ${duration}ms`);
          
          if (!options.verbose && output) {
            // Extract key metrics from output
            this.extractAndDisplayMetrics(output, testName);
          }
          
          resolve({ success: true, duration, output });
        } else {
          console.error(`❌ Test ${testName} failed with code ${code}`);
          
          if (!options.verbose && errorOutput) {
            console.error('Error output:', errorOutput);
          }
          
          reject({ success: false, code, duration, error: errorOutput });
        }
      });

      jest.on('error', (error) => {
        console.error(`❌ Failed to start test ${testName}:`, error.message);
        reject(error);
      });
    });
  }

  extractAndDisplayMetrics(output, testName) {
    console.log(`\n📊 ${testName} Test Metrics:`);
    
    // Extract common metrics patterns
    const patterns = {
      'Total Requests': /Total Requests?: (\d+)/g,
      'Successful': /Successful: (\d+)/g,
      'Success Rate': /Success Rate: ([\d.]+)%/g,
      'Avg Response Time': /Avg Response Time: ([\d.]+)ms/g,
      'P95 Response Time': /P95 Response Time: ([\d.]+)ms/g,
      'Rate Limited': /Rate Limited.*?: (\d+)/g,
      'Concurrent Users': /concurrent.*?(\d+).*?users?/gi
    };

    Object.entries(patterns).forEach(([metric, pattern]) => {
      const matches = [...output.matchAll(pattern)];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        console.log(`  ${metric}: ${lastMatch[1]}${metric.includes('Rate') ? '%' : metric.includes('Time') ? 'ms' : ''}`);
      }
    });

    // Check for performance benchmarks
    if (output.includes('Performance benchmarks')) {
      console.log('  📈 Performance Benchmarks: PASSED');
    }

    // Check for errors or failures
    const errors = output.match(/❌.*|Error:.*|Failed:.*|FAIL.*/g);
    if (errors && errors.length > 0) {
      console.log(`  ⚠️  Issues Found: ${errors.length}`);
    }
  }

  async runAllTests(options = {}) {
    console.log('\n🏃‍♂️ Running all stress tests...\n');
    
    const testNames = Object.keys(STRESS_TESTS);
    const results = [];
    const startTime = Date.now();

    if (options.parallel) {
      console.log('⚡ Running tests in parallel...');
      
      const promises = testNames.map(testName => 
        this.runTest(testName, options).catch(error => ({ 
          testName, 
          success: false, 
          error 
        }))
      );
      
      const parallelResults = await Promise.allSettled(promises);
      results.push(...parallelResults.map((result, index) => ({
        testName: testNames[index],
        ...result.value || { success: false, error: result.reason }
      })));
      
    } else {
      console.log('🔄 Running tests sequentially...');
      
      for (const testName of testNames) {
        try {
          const result = await this.runTest(testName, options);
          results.push({ testName, ...result });
        } catch (error) {
          results.push({ testName, success: false, error });
        }
        
        // Brief pause between tests
        if (testNames.indexOf(testName) < testNames.length - 1) {
          console.log('\n⏸️  Pausing 5 seconds between tests...\n');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    this.displayTestSummary(results, totalDuration, options);
  }

  displayTestSummary(results, totalDuration, options) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 STRESS TEST SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n🎯 Overall Results:`);
    console.log(`  Total Tests: ${results.length}`);
    console.log(`  Successful: ${successful.length}`);
    console.log(`  Failed: ${failed.length}`);
    console.log(`  Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%`);
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    if (successful.length > 0) {
      console.log(`\n✅ Successful Tests:`);
      successful.forEach(result => {
        console.log(`  ${result.testName} (${(result.duration / 1000).toFixed(2)}s)`);
      });
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      failed.forEach(result => {
        console.log(`  ${result.testName} - ${result.error?.message || 'Unknown error'}`);
      });
    }

    // Generate report if requested
    if (options.reportFormat) {
      this.generateReport(results, totalDuration, options.reportFormat);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with appropriate code
    process.exit(failed.length > 0 ? 1 : 0);
  }

  async runBenchmark(options = {}) {
    console.log('\n🏁 Running Performance Benchmark Suite...\n');
    
    const benchmarkTests = [
      'concurrent-booking',
      'availability', 
      'rate-limiting'
    ];
    
    const benchmarkOptions = {
      ...options,
      env: 'benchmark',
      verbose: true
    };
    
    console.log('📋 Benchmark Configuration:');
    console.log('  Environment: benchmark');
    console.log('  Tests:', benchmarkTests.join(', '));
    console.log('  Target: Sub-3-second response times under load\n');
    
    const results = [];
    for (const testName of benchmarkTests) {
      try {
        console.log(`\n🔥 Benchmarking: ${testName}`);
        const result = await this.runTest(testName, benchmarkOptions);
        results.push({ testName, ...result });
      } catch (error) {
        results.push({ testName, success: false, error });
      }
    }
    
    console.log('\n🏆 Benchmark Results Summary:');
    results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${result.testName}: ${status}`);
    });
  }

  generateReport(results, totalDuration, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(this.reportDir, `stress-test-report-${timestamp}.${format}`);
    
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      summary: {
        totalTests: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        successRate: (results.filter(r => r.success).length / results.length * 100).toFixed(2)
      },
      results
    };
    
    try {
      if (format === 'json') {
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      } else if (format === 'markdown') {
        const markdown = this.generateMarkdownReport(report);
        fs.writeFileSync(reportFile, markdown);
      }
      
      console.log(`\n📄 Report generated: ${reportFile}`);
    } catch (error) {
      console.error(`❌ Failed to generate report: ${error.message}`);
    }
  }

  generateMarkdownReport(report) {
    return `# BeautyCort API Stress Test Report

**Generated:** ${report.timestamp}
**Duration:** ${(report.totalDuration / 1000).toFixed(2)}s

## Summary

- **Total Tests:** ${report.summary.totalTests}
- **Successful:** ${report.summary.successful}
- **Failed:** ${report.summary.failed}
- **Success Rate:** ${report.summary.successRate}%

## Test Results

${report.results.map(result => `
### ${result.testName}

- **Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}
- **Duration:** ${result.duration ? (result.duration / 1000).toFixed(2) + 's' : 'N/A'}
${result.error ? `- **Error:** ${result.error.message || 'Unknown error'}` : ''}
`).join('\n')}

## Performance Benchmarks

All tests are designed to validate sub-3-second response times under load with:
- Concurrent booking race condition prevention
- Rate limiting effectiveness (10/20/50 req/min)
- Availability calculation with Jordan cultural considerations
- Database connection pooling and deadlock prevention
- Notification queue processing with delivery timing
- Mixed workload simulation and breaking point analysis
`;
  }

  parseOptions() {
    const options = {};
    
    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      
      switch (arg) {
        case '--timeout':
          options.timeout = parseInt(this.args[++i]);
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--report':
          options.reportFormat = this.args[++i];
          break;
        case '--parallel':
          options.parallel = true;
          break;
        case '--env':
          options.env = this.args[++i];
          break;
      }
    }
    
    return options;
  }

  async run() {
    if (this.args.length === 0) {
      this.showHelp();
      return;
    }

    const command = this.args[0];
    const options = this.parseOptions();

    try {
      switch (command) {
        case 'help':
          this.showHelp();
          break;
          
        case 'list':
          this.listTests();
          break;
          
        case 'run':
          if (!this.args[1]) {
            console.error('❌ Please specify a test name');
            console.log('Available tests:', Object.keys(STRESS_TESTS).join(', '));
            process.exit(1);
          }
          await this.runTest(this.args[1], options);
          break;
          
        case 'run-all':
          await this.runAllTests(options);
          break;
          
        case 'benchmark':
          await this.runBenchmark(options);
          break;
          
        default:
          console.error(`❌ Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error running stress tests:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new StressTestRunner();
  runner.run().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = StressTestRunner;