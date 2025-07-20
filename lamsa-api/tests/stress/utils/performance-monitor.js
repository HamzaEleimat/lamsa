/**
 * Performance Monitoring Utilities for Stress Tests
 * Provides real-time metrics collection and analysis
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      errors: [],
      responseTime: {
        min: Infinity,
        max: 0,
        sum: 0,
        count: 0,
        samples: []
      },
      concurrency: {
        peak: 0,
        current: 0,
        history: []
      },
      memory: {
        initial: process.memoryUsage(),
        peak: process.memoryUsage(),
        samples: []
      },
      database: {
        queries: [],
        connections: {
          active: 0,
          peak: 0
        }
      }
    };
    
    this.startTime = Date.now();
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs = 1000) {
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
    
    console.log('🔍 Performance monitoring started');
  }

  /**
   * Stop monitoring and return final report
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('⏹️  Performance monitoring stopped');
    
    return this.generateReport();
  }

  /**
   * Record a request start
   */
  requestStart(requestId, metadata = {}) {
    const request = {
      id: requestId,
      startTime: process.hrtime.bigint(),
      startTimestamp: Date.now(),
      metadata
    };
    
    this.metrics.requests.push(request);
    this.metrics.concurrency.current++;
    
    if (this.metrics.concurrency.current > this.metrics.concurrency.peak) {
      this.metrics.concurrency.peak = this.metrics.concurrency.current;
    }
    
    return request;
  }

  /**
   * Record a request completion
   */
  requestEnd(requestId, response = {}) {
    const request = this.metrics.requests.find(r => r.id === requestId);
    if (!request) return;

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - request.startTime) / 1000000; // Convert to milliseconds
    
    request.endTime = endTime;
    request.duration = duration;
    request.response = response;
    
    // Update response time metrics
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, duration);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, duration);
    this.metrics.responseTime.sum += duration;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.samples.push({
      timestamp: Date.now(),
      duration,
      requestId
    });
    
    this.metrics.concurrency.current--;
    
    // Track errors
    if (response.statusCode >= 400) {
      this.recordError(requestId, response);
    }
  }

  /**
   * Record an error
   */
  recordError(requestId, error) {
    this.metrics.errors.push({
      requestId,
      timestamp: Date.now(),
      error: {
        code: error.statusCode || error.code,
        message: error.message || error.body?.message,
        type: error.type || 'unknown'
      }
    });
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(query, duration, success = true) {
    this.metrics.database.queries.push({
      timestamp: Date.now(),
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration,
      success
    });
  }

  /**
   * Update database connection count
   */
  updateDatabaseConnections(activeConnections) {
    this.metrics.database.connections.active = activeConnections;
    if (activeConnections > this.metrics.database.connections.peak) {
      this.metrics.database.connections.peak = activeConnections;
    }
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const memory = process.memoryUsage();
    
    // Update peak memory usage
    if (memory.heapUsed > this.metrics.memory.peak.heapUsed) {
      this.metrics.memory.peak = memory;
    }
    
    // Store memory sample
    this.metrics.memory.samples.push({
      timestamp: Date.now(),
      ...memory
    });
    
    // Store concurrency sample
    this.metrics.concurrency.history.push({
      timestamp: Date.now(),
      current: this.metrics.concurrency.current
    });
    
    // Limit sample history to prevent memory bloat
    if (this.metrics.memory.samples.length > 1000) {
      this.metrics.memory.samples = this.metrics.memory.samples.slice(-500);
    }
    
    if (this.metrics.concurrency.history.length > 1000) {
      this.metrics.concurrency.history = this.metrics.concurrency.history.slice(-500);
    }
  }

  /**
   * Calculate percentiles from response time samples
   */
  calculatePercentiles() {
    const sortedTimes = this.metrics.responseTime.samples
      .map(s => s.duration)
      .sort((a, b) => a - b);
    
    if (sortedTimes.length === 0) return {};
    
    const percentiles = {};
    [50, 90, 95, 99].forEach(p => {
      const index = Math.ceil((p / 100) * sortedTimes.length) - 1;
      percentiles[`p${p}`] = sortedTimes[index] || 0;
    });
    
    return percentiles;
  }

  /**
   * Calculate error rates
   */
  calculateErrorRates() {
    const totalRequests = this.metrics.requests.length;
    const totalErrors = this.metrics.errors.length;
    
    if (totalRequests === 0) return { errorRate: 0, errorsByType: {} };
    
    const errorRate = (totalErrors / totalRequests) * 100;
    
    const errorsByType = this.metrics.errors.reduce((acc, error) => {
      const type = error.error.code || error.error.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return { errorRate, errorsByType };
  }

  /**
   * Calculate throughput metrics
   */
  calculateThroughput() {
    const completedRequests = this.metrics.requests.filter(r => r.endTime);
    const testDuration = (Date.now() - this.startTime) / 1000; // seconds
    
    return {
      requestsPerSecond: completedRequests.length / testDuration,
      totalRequests: this.metrics.requests.length,
      completedRequests: completedRequests.length,
      testDurationSeconds: testDuration
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport() {
    const percentiles = this.calculatePercentiles();
    const errorRates = this.calculateErrorRates();
    const throughput = this.calculateThroughput();
    
    const report = {
      summary: {
        testDuration: `${throughput.testDurationSeconds.toFixed(2)}s`,
        totalRequests: throughput.totalRequests,
        completedRequests: throughput.completedRequests,
        throughput: `${throughput.requestsPerSecond.toFixed(2)} req/s`,
        errorRate: `${errorRates.errorRate.toFixed(2)}%`,
        peakConcurrency: this.metrics.concurrency.peak
      },
      performance: {
        responseTime: {
          average: this.metrics.responseTime.count > 0 
            ? (this.metrics.responseTime.sum / this.metrics.responseTime.count).toFixed(2) + 'ms'
            : '0ms',
          min: this.metrics.responseTime.min === Infinity ? 0 : this.metrics.responseTime.min.toFixed(2) + 'ms',
          max: this.metrics.responseTime.max.toFixed(2) + 'ms',
          percentiles: Object.entries(percentiles).reduce((acc, [key, value]) => {
            acc[key] = value.toFixed(2) + 'ms';
            return acc;
          }, {})
        }
      },
      errors: {
        total: this.metrics.errors.length,
        rate: errorRates.errorRate.toFixed(2) + '%',
        byType: errorRates.errorsByType
      },
      resources: {
        memory: {
          initial: `${(this.metrics.memory.initial.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          peak: `${(this.metrics.memory.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          final: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
        },
        database: {
          queries: this.metrics.database.queries.length,
          peakConnections: this.metrics.database.connections.peak,
          averageQueryTime: this.metrics.database.queries.length > 0
            ? (this.metrics.database.queries.reduce((sum, q) => sum + q.duration, 0) / this.metrics.database.queries.length).toFixed(2) + 'ms'
            : '0ms'
        }
      }
    };
    
    return report;
  }

  /**
   * Print real-time status
   */
  printStatus() {
    const throughput = this.calculateThroughput();
    const errorRate = this.calculateErrorRates().errorRate;
    const memory = process.memoryUsage();
    
    console.log(`
📊 Live Metrics:
   Requests: ${throughput.completedRequests}/${throughput.totalRequests}
   Throughput: ${throughput.requestsPerSecond.toFixed(1)} req/s
   Concurrency: ${this.metrics.concurrency.current} (peak: ${this.metrics.concurrency.peak})
   Error Rate: ${errorRate.toFixed(1)}%
   Memory: ${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB
   Avg Response: ${this.metrics.responseTime.count > 0 
     ? (this.metrics.responseTime.sum / this.metrics.responseTime.count).toFixed(0) 
     : 0}ms
    `);
  }

  /**
   * Check if performance meets benchmarks
   */
  validateBenchmarks(benchmarks = {}) {
    const report = this.generateReport();
    const results = {};
    
    // Default benchmarks
    const defaultBenchmarks = {
      maxResponseTimeP95: 3000, // 3 seconds
      maxErrorRate: 1, // 1%
      minThroughput: 10, // 10 req/s
      maxMemoryUsage: 512 // 512MB
    };
    
    const activeBenchmarks = { ...defaultBenchmarks, ...benchmarks };
    
    // Validate response time
    const p95 = this.calculatePercentiles().p95;
    results.responseTime = {
      benchmark: activeBenchmarks.maxResponseTimeP95,
      actual: p95,
      passed: p95 <= activeBenchmarks.maxResponseTimeP95
    };
    
    // Validate error rate
    const errorRate = this.calculateErrorRates().errorRate;
    results.errorRate = {
      benchmark: activeBenchmarks.maxErrorRate,
      actual: errorRate,
      passed: errorRate <= activeBenchmarks.maxErrorRate
    };
    
    // Validate throughput
    const throughput = this.calculateThroughput().requestsPerSecond;
    results.throughput = {
      benchmark: activeBenchmarks.minThroughput,
      actual: throughput,
      passed: throughput >= activeBenchmarks.minThroughput
    };
    
    // Validate memory usage
    const memoryMB = this.metrics.memory.peak.heapUsed / 1024 / 1024;
    results.memory = {
      benchmark: activeBenchmarks.maxMemoryUsage,
      actual: memoryMB,
      passed: memoryMB <= activeBenchmarks.maxMemoryUsage
    };
    
    results.allPassed = Object.values(results).every(r => r.passed);
    
    return results;
  }
}

/**
 * Utility function to create and start monitoring
 */
function createPerformanceMonitor() {
  return new PerformanceMonitor();
}

/**
 * Sleep utility for controlled delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create load testing pattern
 */
function createLoadPattern(totalRequests, concurrency, rampUpTimeMs = 0) {
  const pattern = [];
  const batchSize = Math.ceil(totalRequests / concurrency);
  const delayBetweenBatches = rampUpTimeMs / concurrency;
  
  for (let batch = 0; batch < concurrency; batch++) {
    const batchStart = batch * delayBetweenBatches;
    const requestsInBatch = Math.min(batchSize, totalRequests - (batch * batchSize));
    
    for (let i = 0; i < requestsInBatch; i++) {
      pattern.push({
        startTime: batchStart + (i * 10), // Small delay within batch
        batch,
        requestIndex: i
      });
    }
  }
  
  return pattern.sort((a, b) => a.startTime - b.startTime);
}

module.exports = {
  PerformanceMonitor,
  createPerformanceMonitor,
  sleep,
  generateRequestId,
  createLoadPattern
};