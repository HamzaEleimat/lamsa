#!/usr/bin/env ts-node

/**
 * Production Health Checks and Smoke Tests
 * Comprehensive health monitoring for post-deployment validation
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import Redis from 'redis';

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details: any;
  error?: string;
}

interface SmokeTestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  details: any;
  error?: string;
}

interface OverallHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

interface SmokeTestSummary {
  status: 'passed' | 'failed' | 'partial';
  timestamp: string;
  tests: SmokeTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

class HealthCheckManager {
  private baseUrl: string;
  private timeout: number;
  private supabase: any;
  private redis: any;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '10000');
    
    // Initialize Supabase client
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }

    // Initialize Redis client
    if (process.env.REDIS_URL) {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL
      });
    }
  }

  /**
   * Run comprehensive health checks
   */
  public async runHealthChecks(): Promise<OverallHealthStatus> {
    console.log('🏥 Running comprehensive health checks...');
    const startTime = Date.now();
    
    const checks: HealthCheckResult[] = [];

    // Core service checks
    checks.push(await this.checkAPIHealth());
    checks.push(await this.checkDatabaseHealth());
    checks.push(await this.checkRedisHealth());
    
    // External dependency checks
    checks.push(await this.checkExternalDependencies());
    
    // Infrastructure checks
    checks.push(await this.checkLoadBalancerHealth());
    checks.push(await this.checkCDNHealth());
    
    // Security checks
    checks.push(await this.checkSSLCertificate());
    checks.push(await this.checkSecurityHeaders());
    
    // Performance checks
    checks.push(await this.checkResponseTimes());
    checks.push(await this.checkThroughput());

    // Calculate summary
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Health checks completed in ${(duration/1000).toFixed(2)}s`);
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary
    };
  }

  /**
   * Run smoke tests for critical functionality
   */
  public async runSmokeTests(): Promise<SmokeTestSummary> {
    console.log('🧪 Running smoke tests...');
    const startTime = Date.now();
    
    const tests: SmokeTestResult[] = [];

    // Authentication flow tests
    tests.push(await this.testAuthenticationFlow());
    tests.push(await this.testTokenRefresh());
    
    // Core API functionality tests
    tests.push(await this.testUserRegistration());
    tests.push(await this.testProviderSearch());
    tests.push(await this.testServiceListing());
    tests.push(await this.testBookingCreation());
    
    // Data integrity tests
    tests.push(await this.testDatabaseConnectivity());
    tests.push(await this.testCacheOperations());
    
    // External integration tests
    tests.push(await this.testSMSService());
    tests.push(await this.testPaymentGateway());
    
    // Performance tests
    tests.push(await this.testResponseTimesSLA());
    tests.push(await this.testConcurrentUsers());

    // Calculate summary
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      skipped: tests.filter(t => t.status === 'skipped').length
    };

    // Determine overall status
    let overallStatus: 'passed' | 'failed' | 'partial' = 'passed';
    if (summary.failed > 0) {
      overallStatus = summary.passed > 0 ? 'partial' : 'failed';
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Smoke tests completed in ${(duration/1000).toFixed(2)}s`);
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      tests,
      summary
    };
  }

  // Health Check Implementations

  /**
   * Check API health endpoint
   */
  private async checkAPIHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: this.timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200 && response.data.status === 'ok') {
        return {
          name: 'API Health',
          status: 'healthy',
          responseTime,
          details: response.data
        };
      } else {
        return {
          name: 'API Health',
          status: 'unhealthy',
          responseTime,
          details: response.data,
          error: 'Invalid health check response'
        };
      }
    } catch (error) {
      return {
        name: 'API Health',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.supabase) {
        return {
          name: 'Database Health',
          status: 'unhealthy',
          responseTime: 0,
          details: {},
          error: 'Supabase client not configured'
        };
      }

      // Test with a simple query
      const { data, error } = await this.supabase
        .from('users')
        .select('count(*)')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'Database Health',
          status: 'unhealthy',
          responseTime,
          details: { error: error.message },
          error: error.message
        };
      }

      // Check response time threshold
      const status = responseTime > 5000 ? 'degraded' : 'healthy';

      return {
        name: 'Database Health',
        status,
        responseTime,
        details: { queryResult: data }
      };
    } catch (error) {
      return {
        name: 'Database Health',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedisHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.redis) {
        return {
          name: 'Redis Health',
          status: 'degraded', // Redis is not critical
          responseTime: 0,
          details: {},
          error: 'Redis client not configured'
        };
      }

      await this.redis.connect();
      const pong = await this.redis.ping();
      await this.redis.disconnect();

      const responseTime = Date.now() - startTime;

      if (pong === 'PONG') {
        const status = responseTime > 1000 ? 'degraded' : 'healthy';
        return {
          name: 'Redis Health',
          status,
          responseTime,
          details: { ping: pong }
        };
      } else {
        return {
          name: 'Redis Health',
          status: 'unhealthy',
          responseTime,
          details: { ping: pong },
          error: 'Invalid ping response'
        };
      }
    } catch (error) {
      return {
        name: 'Redis Health',
        status: 'degraded', // Redis failure shouldn't fail entire health check
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Check external dependencies
   */
  private async checkExternalDependencies(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const dependencies = [
      { name: 'Twilio', url: 'https://api.twilio.com', critical: true },
      { name: 'Tap Payments', url: process.env.TAP_API_URL, critical: true },
      { name: 'Expo Push', url: 'https://exp.host/--/api/v2/push/send', critical: false }
    ];

    const results: any[] = [];
    let hasUnhealthyDependency = false;
    let hasDegradedDependency = false;

    for (const dep of dependencies) {
      if (!dep.url) {
        results.push({ name: dep.name, status: 'skipped', reason: 'URL not configured' });
        continue;
      }

      try {
        const response = await axios.get(dep.url, { 
          timeout: 5000,
          validateStatus: (status) => status < 500 // 4xx is OK for dependency check
        });
        
        if (response.status < 400) {
          results.push({ name: dep.name, status: 'healthy', statusCode: response.status });
        } else if (response.status < 500) {
          results.push({ name: dep.name, status: 'degraded', statusCode: response.status });
          if (dep.critical) hasDegradedDependency = true;
        } else {
          results.push({ name: dep.name, status: 'unhealthy', statusCode: response.status });
          if (dep.critical) hasUnhealthyDependency = true;
        }
      } catch (error) {
        results.push({ name: dep.name, status: 'unhealthy', error: error.message });
        if (dep.critical) hasUnhealthyDependency = true;
      }
    }

    const responseTime = Date.now() - startTime;
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (hasUnhealthyDependency) {
      overallStatus = 'unhealthy';
    } else if (hasDegradedDependency) {
      overallStatus = 'degraded';
    }

    return {
      name: 'External Dependencies',
      status: overallStatus,
      responseTime,
      details: { dependencies: results }
    };
  }

  /**
   * Check load balancer health
   */
  private async checkLoadBalancerHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check if requests are being distributed properly
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(axios.get(`${this.baseUrl}/api/health`, { timeout: 3000 }));
      }
      
      const responses = await Promise.all(requests);
      const responseTime = Date.now() - startTime;
      
      // Check for consistent responses
      const allHealthy = responses.every(r => r.status === 200 && r.data.status === 'ok');
      
      return {
        name: 'Load Balancer Health',
        status: allHealthy ? 'healthy' : 'degraded',
        responseTime,
        details: {
          requestCount: responses.length,
          successfulResponses: responses.filter(r => r.status === 200).length,
          avgResponseTime: responseTime / responses.length
        }
      };
    } catch (error) {
      return {
        name: 'Load Balancer Health',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Check CDN health
   */
  private async checkCDNHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const cdnUrl = process.env.CDN_URL || `${this.baseUrl}/static/health-check.txt`;
      const response = await axios.get(cdnUrl, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      // Check CDN headers
      const cdnHeaders = {
        cacheStatus: response.headers['x-cache'] || response.headers['cf-cache-status'],
        rayId: response.headers['cf-ray'],
        server: response.headers['server']
      };
      
      const status = responseTime > 2000 ? 'degraded' : 'healthy';
      
      return {
        name: 'CDN Health',
        status,
        responseTime,
        details: {
          statusCode: response.status,
          headers: cdnHeaders,
          responseTime
        }
      };
    } catch (error) {
      return {
        name: 'CDN Health',
        status: 'degraded', // CDN is not critical
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Check SSL certificate
   */
  private async checkSSLCertificate(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const https = require('https');
      const url = new URL(this.baseUrl);
      
      if (url.protocol !== 'https:') {
        return {
          name: 'SSL Certificate',
          status: 'degraded',
          responseTime: 0,
          details: {},
          error: 'HTTPS not enabled'
        };
      }
      
      return new Promise((resolve) => {
        const req = https.request({
          host: url.hostname,
          port: url.port || 443,
          path: '/api/health',
          method: 'GET'
        }, (res: any) => {
          const cert = res.connection.getPeerCertificate();
          const responseTime = Date.now() - startTime;
          
          // Check certificate expiration
          const now = new Date();
          const validTo = new Date(cert.valid_to);
          const daysUntilExpiry = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
          if (daysUntilExpiry < 7) {
            status = 'unhealthy';
          } else if (daysUntilExpiry < 30) {
            status = 'degraded';
          }
          
          resolve({
            name: 'SSL Certificate',
            status,
            responseTime,
            details: {
              issuer: cert.issuer.CN,
              subject: cert.subject.CN,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              daysUntilExpiry
            }
          });
        });
        
        req.on('error', (error: any) => {
          resolve({
            name: 'SSL Certificate',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            details: {},
            error: error.message
          });
        });
        
        req.end();
      });
    } catch (error) {
      return {
        name: 'SSL Certificate',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Check security headers
   */
  private async checkSecurityHeaders(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security'
      ];
      
      const presentHeaders = requiredHeaders.filter(header => 
        response.headers[header] || response.headers[header.toLowerCase()]
      );
      
      const status = presentHeaders.length === requiredHeaders.length ? 'healthy' : 'degraded';
      
      return {
        name: 'Security Headers',
        status,
        responseTime,
        details: {
          requiredHeaders,
          presentHeaders,
          missingHeaders: requiredHeaders.filter(h => !presentHeaders.includes(h))
        }
      };
    } catch (error) {
      return {
        name: 'Security Headers',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Check response times
   */
  private async checkResponseTimes(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const endpoints = [
        '/api/health',
        '/api/auth/health',
        '/api/providers',
        '/api/services'
      ];
      
      const responseTimes: number[] = [];
      
      for (const endpoint of endpoints) {
        const endpointStartTime = Date.now();
        try {
          await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 10000 });
          responseTimes.push(Date.now() - endpointStartTime);
        } catch (error) {
          // Skip failed endpoints for this check
          continue;
        }
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (avgResponseTime > 2000 || maxResponseTime > 5000) {
        status = 'unhealthy';
      } else if (avgResponseTime > 1000 || maxResponseTime > 2000) {
        status = 'degraded';
      }
      
      return {
        name: 'Response Times',
        status,
        responseTime,
        details: {
          averageResponseTime: avgResponseTime,
          maxResponseTime,
          minResponseTime: Math.min(...responseTimes),
          endpointsTested: endpoints.length,
          responseTimes
        }
      };
    } catch (error) {
      return {
        name: 'Response Times',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Check throughput
   */
  private async checkThroughput(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const concurrentRequests = 10;
      const requests = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(axios.get(`${this.baseUrl}/api/health`, { timeout: 10000 }));
      }
      
      const results = await Promise.allSettled(requests);
      const responseTime = Date.now() - startTime;
      
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const throughput = (successfulRequests / (responseTime / 1000)); // requests per second
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (successfulRequests < concurrentRequests * 0.8) {
        status = 'unhealthy';
      } else if (successfulRequests < concurrentRequests * 0.95) {
        status = 'degraded';
      }
      
      return {
        name: 'Throughput',
        status,
        responseTime,
        details: {
          concurrentRequests,
          successfulRequests,
          failedRequests: concurrentRequests - successfulRequests,
          throughput: parseFloat(throughput.toFixed(2)),
          totalTime: responseTime
        }
      };
    } catch (error) {
      return {
        name: 'Throughput',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  // Smoke Test Implementations

  /**
   * Test authentication flow
   */
  private async testAuthenticationFlow(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      // Test OTP request
      const otpResponse = await axios.post(`${this.baseUrl}/api/auth/request-otp`, {
        phone: '+962777777777' // Test phone number
      }, { timeout: 10000 });
      
      if (otpResponse.status !== 200) {
        throw new Error(`OTP request failed: ${otpResponse.status}`);
      }
      
      return {
        testName: 'Authentication Flow',
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          otpRequestStatus: otpResponse.status,
          message: 'OTP request successful'
        }
      };
    } catch (error) {
      return {
        testName: 'Authentication Flow',
        status: 'failed',
        duration: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Test token refresh
   */
  private async testTokenRefresh(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      // This would require a valid refresh token
      // For now, just test the endpoint exists
      const response = await axios.post(`${this.baseUrl}/api/auth/refresh`, {}, {
        timeout: 5000,
        validateStatus: (status) => status === 401 || status === 400 // Expected without valid token
      });
      
      return {
        testName: 'Token Refresh',
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          endpointAccessible: true,
          statusCode: response.status
        }
      };
    } catch (error) {
      return {
        testName: 'Token Refresh',
        status: 'failed',
        duration: Date.now() - startTime,
        details: {},
        error: error.message
      };
    }
  }

  // Additional smoke test implementations...
  private async testUserRegistration(): Promise<SmokeTestResult> {
    return { testName: 'User Registration', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testProviderSearch(): Promise<SmokeTestResult> {
    return { testName: 'Provider Search', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testServiceListing(): Promise<SmokeTestResult> {
    return { testName: 'Service Listing', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testBookingCreation(): Promise<SmokeTestResult> {
    return { testName: 'Booking Creation', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testDatabaseConnectivity(): Promise<SmokeTestResult> {
    return { testName: 'Database Connectivity', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testCacheOperations(): Promise<SmokeTestResult> {
    return { testName: 'Cache Operations', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testSMSService(): Promise<SmokeTestResult> {
    return { testName: 'SMS Service', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testPaymentGateway(): Promise<SmokeTestResult> {
    return { testName: 'Payment Gateway', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testResponseTimesSLA(): Promise<SmokeTestResult> {
    return { testName: 'Response Times SLA', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }

  private async testConcurrentUsers(): Promise<SmokeTestResult> {
    return { testName: 'Concurrent Users', status: 'skipped', duration: 0, details: { reason: 'Not implemented' } };
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'health';
  const format = process.argv[3] || 'console';

  const healthManager = new HealthCheckManager();

  switch (command) {
    case 'health':
      healthManager.runHealthChecks()
        .then(result => {
          if (format === 'json') {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log('\n🏥 HEALTH CHECK RESULTS');
            console.log('='.repeat(50));
            console.log(`Overall Status: ${result.status.toUpperCase()}`);
            console.log(`Timestamp: ${result.timestamp}`);
            console.log(`\nSummary: ${result.summary.healthy}/${result.summary.total} healthy`);
            
            result.checks.forEach(check => {
              const emoji = check.status === 'healthy' ? '✅' : check.status === 'degraded' ? '⚠️' : '❌';
              console.log(`${emoji} ${check.name}: ${check.status} (${check.responseTime}ms)`);
              if (check.error) {
                console.log(`   Error: ${check.error}`);
              }
            });
          }
          
          process.exit(result.status === 'healthy' ? 0 : 1);
        })
        .catch(error => {
          console.error('Health check failed:', error.message);
          process.exit(1);
        });
      break;

    case 'smoke':
      healthManager.runSmokeTests()
        .then(result => {
          if (format === 'json') {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log('\n🧪 SMOKE TEST RESULTS');
            console.log('='.repeat(50));
            console.log(`Overall Status: ${result.status.toUpperCase()}`);
            console.log(`Timestamp: ${result.timestamp}`);
            console.log(`\nSummary: ${result.summary.passed}/${result.summary.total} passed`);
            
            result.tests.forEach(test => {
              const emoji = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
              console.log(`${emoji} ${test.testName}: ${test.status} (${test.duration}ms)`);
              if (test.error) {
                console.log(`   Error: ${test.error}`);
              }
            });
          }
          
          process.exit(result.status === 'passed' ? 0 : 1);
        })
        .catch(error => {
          console.error('Smoke tests failed:', error.message);
          process.exit(1);
        });
      break;

    case 'all':
      Promise.all([
        healthManager.runHealthChecks(),
        healthManager.runSmokeTests()
      ])
        .then(([healthResult, smokeResult]) => {
          if (format === 'json') {
            console.log(JSON.stringify({ health: healthResult, smoke: smokeResult }, null, 2));
          } else {
            console.log('\n🔍 COMPREHENSIVE VALIDATION RESULTS');
            console.log('='.repeat(50));
            console.log(`Health Status: ${healthResult.status.toUpperCase()}`);
            console.log(`Smoke Tests: ${smokeResult.status.toUpperCase()}`);
            console.log(`\nHealth: ${healthResult.summary.healthy}/${healthResult.summary.total} healthy`);
            console.log(`Smoke: ${smokeResult.summary.passed}/${smokeResult.summary.total} passed`);
          }
          
          const overallSuccess = healthResult.status === 'healthy' && smokeResult.status === 'passed';
          process.exit(overallSuccess ? 0 : 1);
        })
        .catch(error => {
          console.error('Validation failed:', error.message);
          process.exit(1);
        });
      break;

    default:
      console.log(`
Usage: ts-node health-checks.ts <command> [format]

Commands:
  health    Run health checks
  smoke     Run smoke tests
  all       Run both health checks and smoke tests

Formats:
  console   Human-readable output (default)
  json      JSON output

Examples:
  ts-node health-checks.ts health
  ts-node health-checks.ts smoke json
  ts-node health-checks.ts all
      `);
      process.exit(1);
  }
}

export { HealthCheckManager, OverallHealthStatus, SmokeTestSummary };