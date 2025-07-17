/**
 * Stress Test Helper Utilities
 * Common utilities for stress testing scenarios
 */

const request = require('supertest');
const { createPerformanceMonitor, generateRequestId, sleep } = require('./performance-monitor');

/**
 * Stress Test Configuration
 */
const StressConfig = {
  // Default test parameters
  DEFAULT_CONCURRENCY: 50,
  DEFAULT_DURATION: 60000, // 1 minute
  DEFAULT_RAMP_UP: 10000,  // 10 seconds
  
  // Performance benchmarks
  BENCHMARKS: {
    maxResponseTimeP95: 3000, // 3 seconds
    maxErrorRate: 1,          // 1%
    minThroughput: 10,        // 10 req/s
    maxMemoryUsage: 512       // 512MB
  },
  
  // Rate limiting
  RATE_LIMITS: {
    booking: 100,     // requests per minute
    availability: 200,
    general: 500
  }
};

/**
 * HTTP Client for Stress Testing
 */
class StressTestClient {
  constructor(app, baseUrl = '') {
    this.app = app;
    this.baseUrl = baseUrl;
    this.tokens = new Map(); // Store auth tokens
  }

  /**
   * Authenticate a user and store token
   */
  async authenticate(userType = 'customer', userData = null) {
    const authData = userData || this.generateAuthData(userType);
    
    try {
      // Send OTP
      const otpResponse = await request(this.app)
        .post('/api/auth/send-otp')
        .send({ phone: authData.phone });
      
      if (otpResponse.status !== 200) {
        throw new Error(`OTP request failed: ${otpResponse.status}`);
      }
      
      // Verify OTP (use mock OTP in test environment)
      const verifyResponse = await request(this.app)
        .post('/api/auth/verify-otp')
        .send({ 
          phone: authData.phone, 
          otp: process.env.NODE_ENV === 'test' ? '123456' : otpResponse.body.mockOtp 
        });
      
      if (verifyResponse.status === 200 && verifyResponse.body.token) {
        const userId = verifyResponse.body.user.id;
        this.tokens.set(userId, verifyResponse.body.token);
        return { userId, token: verifyResponse.body.token, user: verifyResponse.body.user };
      }
      
      throw new Error(`Authentication failed: ${verifyResponse.status}`);
    } catch (error) {
      throw new Error(`Authentication error: ${error.message}`);
    }
  }

  /**
   * Make authenticated request
   */
  async makeRequest(method, path, data = null, userId = null, options = {}) {
    const requestId = generateRequestId();
    let req = request(this.app)[method.toLowerCase()](this.baseUrl + path);
    
    // Add authentication if userId provided
    if (userId && this.tokens.has(userId)) {
      req = req.set('Authorization', `Bearer ${this.tokens.get(userId)}`);
    }
    
    // Add custom headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }
    
    // Add request body
    if (data) {
      req = req.send(data);
    }
    
    // Set timeout
    if (options.timeout) {
      req = req.timeout(options.timeout);
    }
    
    return { request: req, requestId };
  }

  /**
   * Generate authentication data
   */
  generateAuthData(userType) {
    const phone = `+962771${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    
    if (userType === 'provider') {
      return {
        phone,
        businessName: 'Test Salon صالون الاختبار',
        businessNameAr: 'صالون الاختبار للسيدات',
        ownerName: 'Test Owner',
        ownerNameAr: 'مالك الاختبار',
        email: `provider${Date.now()}@test.com`,
        businessType: 'beauty_salon'
      };
    }
    
    return {
      phone,
      name: 'Test Customer',
      nameAr: 'عميل الاختبار',
      email: `customer${Date.now()}@test.com`
    };
  }
}

/**
 * Concurrent Request Executor
 */
class ConcurrentExecutor {
  constructor(client, monitor) {
    this.client = client;
    this.monitor = monitor;
    this.activeRequests = new Set();
  }

  /**
   * Execute multiple requests concurrently
   */
  async executeConcurrent(requests, options = {}) {
    const {
      maxConcurrency = 50,
      rampUpMs = 0,
      delayBetweenRequests = 0
    } = options;
    
    const results = [];
    const batches = this.createBatches(requests, maxConcurrency);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Ramp up delay
      if (rampUpMs > 0 && batchIndex > 0) {
        await sleep(rampUpMs / batches.length);
      }
      
      // Execute batch concurrently
      const batchPromises = batch.map(async (requestConfig, index) => {
        // Small delay within batch
        if (delayBetweenRequests > 0 && index > 0) {
          await sleep(delayBetweenRequests);
        }
        
        return this.executeRequest(requestConfig);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Execute single request with monitoring
   */
  async executeRequest(requestConfig) {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      this.monitor.requestStart(requestId, {
        method: requestConfig.method,
        path: requestConfig.path,
        userId: requestConfig.userId
      });
      
      this.activeRequests.add(requestId);
      
      const { request: req } = await this.client.makeRequest(
        requestConfig.method,
        requestConfig.path,
        requestConfig.data,
        requestConfig.userId,
        requestConfig.options
      );
      
      const response = await req;
      
      this.monitor.requestEnd(requestId, {
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        body: response.body
      });
      
      this.activeRequests.delete(requestId);
      
      return {
        success: true,
        response,
        requestId,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      this.monitor.requestEnd(requestId, {
        statusCode: error.status || 500,
        responseTime: Date.now() - startTime,
        error: error.message
      });
      
      this.activeRequests.delete(requestId);
      
      return {
        success: false,
        error,
        requestId,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Create batches for concurrent execution
   */
  createBatches(requests, batchSize) {
    const batches = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get active request count
   */
  getActiveRequestCount() {
    return this.activeRequests.size;
  }
}

/**
 * Load Pattern Generator
 */
class LoadPatternGenerator {
  /**
   * Generate steady load pattern
   */
  static steadyLoad(requestsPerSecond, durationSeconds) {
    const totalRequests = requestsPerSecond * durationSeconds;
    const interval = 1000 / requestsPerSecond; // ms between requests
    
    const pattern = [];
    for (let i = 0; i < totalRequests; i++) {
      pattern.push({
        startTime: i * interval,
        requestIndex: i
      });
    }
    
    return pattern;
  }

  /**
   * Generate burst load pattern
   */
  static burstLoad(burstSize, burstInterval, totalBursts) {
    const pattern = [];
    let requestIndex = 0;
    
    for (let burst = 0; burst < totalBursts; burst++) {
      const burstStartTime = burst * burstInterval;
      
      for (let i = 0; i < burstSize; i++) {
        pattern.push({
          startTime: burstStartTime + (i * 10), // 10ms between requests in burst
          requestIndex: requestIndex++,
          burst
        });
      }
    }
    
    return pattern;
  }

  /**
   * Generate ramp-up load pattern
   */
  static rampUpLoad(startRps, endRps, durationSeconds) {
    const totalRequests = ((startRps + endRps) / 2) * durationSeconds;
    const rpsIncrement = (endRps - startRps) / durationSeconds;
    
    const pattern = [];
    let currentTime = 0;
    let requestIndex = 0;
    
    for (let second = 0; second < durationSeconds; second++) {
      const currentRps = startRps + (rpsIncrement * second);
      const requestsThisSecond = Math.round(currentRps);
      const interval = 1000 / requestsThisSecond;
      
      for (let i = 0; i < requestsThisSecond; i++) {
        pattern.push({
          startTime: currentTime + (i * interval),
          requestIndex: requestIndex++,
          rps: currentRps
        });
      }
      
      currentTime += 1000;
    }
    
    return pattern;
  }
}

/**
 * Database State Manager
 */
class DatabaseStateManager {
  constructor() {
    this.snapshots = new Map();
  }

  /**
   * Create database snapshot
   */
  async createSnapshot(name, queryFunction) {
    try {
      const snapshot = await queryFunction();
      this.snapshots.set(name, {
        timestamp: Date.now(),
        data: snapshot
      });
      return snapshot;
    } catch (error) {
      throw new Error(`Failed to create snapshot '${name}': ${error.message}`);
    }
  }

  /**
   * Compare current state with snapshot
   */
  async compareWithSnapshot(name, queryFunction) {
    if (!this.snapshots.has(name)) {
      throw new Error(`Snapshot '${name}' not found`);
    }
    
    const snapshot = this.snapshots.get(name);
    const currentState = await queryFunction();
    
    return {
      snapshot: snapshot.data,
      current: currentState,
      timestamp: snapshot.timestamp,
      differences: this.findDifferences(snapshot.data, currentState)
    };
  }

  /**
   * Find differences between two states
   */
  findDifferences(snapshot, current) {
    const differences = {};
    
    // Compare basic properties
    Object.keys(snapshot).forEach(key => {
      if (snapshot[key] !== current[key]) {
        differences[key] = {
          before: snapshot[key],
          after: current[key]
        };
      }
    });
    
    return differences;
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots() {
    this.snapshots.clear();
  }
}

/**
 * Test Result Analyzer
 */
class TestResultAnalyzer {
  /**
   * Analyze concurrent booking results
   */
  static analyzeConcurrentBookings(results, expectedSlot) {
    const successful = results.filter(r => r.success && r.response.status < 400);
    const failed = results.filter(r => !r.success || r.response.status >= 400);
    const conflicts = results.filter(r => 
      r.response && r.response.status === 409 // Conflict status
    );
    
    // Check for race condition issues
    const successfulBookings = successful.filter(r => 
      r.response.status === 201 // Created
    );
    
    const analysis = {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      conflicts: conflicts.length,
      successfulBookings: successfulBookings.length,
      
      // Race condition analysis
      raceConditionPrevented: successfulBookings.length <= 1,
      
      // Performance analysis
      averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      maxResponseTime: Math.max(...results.map(r => r.duration)),
      minResponseTime: Math.min(...results.map(r => r.duration)),
      
      // Error analysis
      errorTypes: this.categorizeErrors(failed)
    };
    
    return analysis;
  }

  /**
   * Categorize errors by type
   */
  static categorizeErrors(failedResults) {
    const categories = {};
    
    failedResults.forEach(result => {
      const status = result.response?.status || 'network_error';
      const errorType = this.getErrorType(status);
      
      if (!categories[errorType]) {
        categories[errorType] = {
          count: 0,
          examples: []
        };
      }
      
      categories[errorType].count++;
      if (categories[errorType].examples.length < 3) {
        categories[errorType].examples.push({
          status,
          message: result.error?.message || result.response?.body?.message
        });
      }
    });
    
    return categories;
  }

  /**
   * Get error type from status code
   */
  static getErrorType(status) {
    if (status >= 400 && status < 500) {
      switch (status) {
        case 409: return 'conflict';
        case 429: return 'rate_limit';
        case 400: return 'validation';
        case 401: return 'authentication';
        case 403: return 'authorization';
        default: return 'client_error';
      }
    } else if (status >= 500) {
      return 'server_error';
    } else {
      return 'network_error';
    }
  }

  /**
   * Generate performance report
   */
  static generatePerformanceReport(monitor, analysis = {}) {
    const report = monitor.generateReport();
    const benchmarks = monitor.validateBenchmarks(StressConfig.BENCHMARKS);
    
    return {
      ...report,
      benchmarks,
      analysis,
      recommendations: this.generateRecommendations(report, benchmarks, analysis)
    };
  }

  /**
   * Generate performance recommendations
   */
  static generateRecommendations(report, benchmarks, analysis) {
    const recommendations = [];
    
    // Response time recommendations
    if (!benchmarks.responseTime.passed) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        issue: 'Response time exceeds benchmark',
        recommendation: 'Consider optimizing database queries, adding caching, or increasing server resources'
      });
    }
    
    // Error rate recommendations
    if (!benchmarks.errorRate.passed) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        issue: 'High error rate detected',
        recommendation: 'Investigate error patterns and improve error handling'
      });
    }
    
    // Memory recommendations
    if (!benchmarks.memory.passed) {
      recommendations.push({
        type: 'resource',
        priority: 'medium',
        issue: 'High memory usage',
        recommendation: 'Check for memory leaks and optimize memory allocation'
      });
    }
    
    // Concurrency recommendations
    if (analysis.raceConditionPrevented === false) {
      recommendations.push({
        type: 'concurrency',
        priority: 'critical',
        issue: 'Race conditions detected',
        recommendation: 'Implement proper locking mechanisms or optimistic concurrency control'
      });
    }
    
    return recommendations;
  }
}

/**
 * Utility functions
 */
const StressTestUtils = {
  /**
   * Wait for all requests to complete
   */
  async waitForCompletion(executor, maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (executor.getActiveRequestCount() > 0) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Timeout waiting for requests to complete');
      }
      await sleep(100);
    }
  },

  /**
   * Create test environment
   */
  createTestEnvironment(app) {
    const monitor = createPerformanceMonitor();
    const client = new StressTestClient(app);
    const executor = new ConcurrentExecutor(client, monitor);
    const dbManager = new DatabaseStateManager();
    
    return {
      monitor,
      client,
      executor,
      dbManager
    };
  },

  /**
   * Clean up test environment
   */
  cleanupTestEnvironment(environment) {
    environment.monitor.stopMonitoring();
    environment.dbManager.clearSnapshots();
  }
};

module.exports = {
  StressConfig,
  StressTestClient,
  ConcurrentExecutor,
  LoadPatternGenerator,
  DatabaseStateManager,
  TestResultAnalyzer,
  StressTestUtils
};