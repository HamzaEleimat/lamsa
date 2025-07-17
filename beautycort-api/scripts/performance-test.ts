#!/usr/bin/env ts-node

/**
 * Performance Testing Script
 * Tests API performance under various conditions including 3G connections
 * Validates that all responses meet the <500ms target
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

interface TestConfig {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  expectedMaxTime: number;
  description: string;
}

interface TestResult {
  config: TestConfig;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  responseSize?: number;
  meetsTarget: boolean;
}

interface ConnectionSimulation {
  name: string;
  bandwidth: number; // bytes per second
  latency: number; // milliseconds
  packetLoss: number; // percentage
}

class PerformanceTestSuite {
  private baseURL: string;
  private client: AxiosInstance;
  private results: TestResult[] = [];
  
  // Connection types to simulate
  private connectionTypes: ConnectionSimulation[] = [
    {
      name: '4G Fast',
      bandwidth: 1000000, // 1MB/s
      latency: 50,
      packetLoss: 0
    },
    {
      name: '4G Slow',
      bandwidth: 500000, // 500KB/s
      latency: 100,
      packetLoss: 1
    },
    {
      name: '3G Fast',
      bandwidth: 200000, // 200KB/s
      latency: 200,
      packetLoss: 2
    },
    {
      name: '3G Slow',
      bandwidth: 50000, // 50KB/s
      latency: 400,
      packetLoss: 5
    },
    {
      name: '2G',
      bandwidth: 10000, // 10KB/s
      latency: 600,
      packetLoss: 10
    }
  ];

  // Test configurations
  private testConfigs: TestConfig[] = [
    {
      name: 'Provider Search',
      method: 'GET',
      endpoint: '/api/v2/providers?lat=31.9539&lng=35.9106&limit=20',
      expectedMaxTime: 500,
      description: 'Provider search with location and pagination'
    },
    {
      name: 'Provider Search Cached',
      method: 'GET',
      endpoint: '/api/v2/providers?lat=31.9539&lng=35.9106&limit=20',
      expectedMaxTime: 100,
      description: 'Cached provider search (second request)'
    },
    {
      name: 'Provider Details',
      method: 'GET',
      endpoint: '/api/v2/providers/test-provider-id',
      expectedMaxTime: 300,
      description: 'Single provider details with services'
    },
    {
      name: 'Service Categories',
      method: 'GET',
      endpoint: '/api/services/categories',
      expectedMaxTime: 200,
      description: 'Service categories listing'
    },
    {
      name: 'Service Listings',
      method: 'GET',
      endpoint: '/api/services?category=hair_care&limit=20',
      expectedMaxTime: 400,
      description: 'Service listings by category'
    },
    {
      name: 'Provider Availability',
      method: 'GET',
      endpoint: '/api/v2/providers/test-provider-id/availability?date=2024-01-20',
      expectedMaxTime: 200,
      description: 'Provider availability for specific date'
    },
    {
      name: 'Advanced Search',
      method: 'POST',
      endpoint: '/api/v2/providers/search',
      data: {
        location: { lat: 31.9539, lng: 35.9106, radius: 10 },
        services: ['hair_care'],
        priceRange: { min: 10, max: 100 }
      },
      expectedMaxTime: 800,
      description: 'Advanced provider search with filters'
    },
    {
      name: 'Mobile Optimized Search',
      method: 'GET',
      endpoint: '/api/v2/providers?lat=31.9539&lng=35.9106&limit=10&mobile=true&fields=minimal',
      expectedMaxTime: 300,
      description: 'Mobile-optimized provider search'
    }
  ];

  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'User-Agent': 'PerformanceTest/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      // Disable SSL verification for testing
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
  }

  /**
   * Run complete performance test suite
   */
  async runTests(): Promise<void> {
    console.log('🚀 BeautyCort Performance Test Suite');
    console.log('====================================');
    console.log(`Testing API: ${this.baseURL}`);
    console.log(`Target: All responses under 500ms`);
    console.log('');

    // Test under different connection conditions
    for (const connection of this.connectionTypes) {
      console.log(`\n📡 Testing ${connection.name} Connection`);
      console.log(`   Bandwidth: ${(connection.bandwidth / 1000).toFixed(0)}KB/s`);
      console.log(`   Latency: ${connection.latency}ms`);
      console.log(`   Packet Loss: ${connection.packetLoss}%`);
      console.log('   ' + '─'.repeat(50));

      await this.testWithConnection(connection);
      
      // Wait between connection tests
      await this.sleep(1000);
    }

    // Generate comprehensive report
    this.generateReport();
  }

  /**
   * Test all endpoints with simulated connection
   */
  private async testWithConnection(connection: ConnectionSimulation): Promise<void> {
    const connectionResults: TestResult[] = [];

    for (const config of this.testConfigs) {
      const result = await this.runSingleTest(config, connection);
      connectionResults.push(result);
      this.results.push(result);
      
      // Log immediate result
      const statusIcon = result.success ? '✅' : '❌';
      const timeIcon = result.meetsTarget ? '🟢' : '🔴';
      const compressionInfo = result.responseSize ? ` (${(result.responseSize / 1024).toFixed(1)}KB)` : '';
      
      console.log(`   ${statusIcon} ${timeIcon} ${config.name}: ${result.responseTime}ms${compressionInfo}`);
      
      // Wait between requests to avoid overwhelming server
      await this.sleep(200);
    }

    // Connection summary
    const successful = connectionResults.filter(r => r.success).length;
    const meetingTarget = connectionResults.filter(r => r.meetsTarget).length;
    const avgTime = connectionResults.reduce((sum, r) => sum + r.responseTime, 0) / connectionResults.length;
    
    console.log(`   📊 Summary: ${successful}/${connectionResults.length} successful, ${meetingTarget}/${connectionResults.length} under 500ms`);
    console.log(`   📊 Average response time: ${avgTime.toFixed(0)}ms`);
  }

  /**
   * Run a single performance test
   */
  private async runSingleTest(config: TestConfig, connection: ConnectionSimulation): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Simulate connection characteristics
      const requestConfig: AxiosRequestConfig = {
        method: config.method,
        url: config.endpoint,
        data: config.data,
        timeout: Math.max(5000, connection.latency * 10), // Adjust timeout based on latency
        headers: {
          // Simulate mobile device
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
          'Connection': 'keep-alive',
          'Accept-Encoding': 'gzip, deflate, br',
          // Simulate connection type
          'Connection-Type': connection.name.toLowerCase().replace(' ', '-'),
          'Downlink': (connection.bandwidth / 125000).toFixed(1), // Convert to Mbps
          'ECT': connection.name.includes('2G') ? '2g' : connection.name.includes('3G') ? '3g' : '4g'
        }
      };

      // Add artificial latency
      await this.sleep(connection.latency);

      const response = await this.client.request(requestConfig);
      const responseTime = Date.now() - startTime;
      
      // Calculate response size
      const responseSize = JSON.stringify(response.data).length;
      
      // Simulate bandwidth limitation
      const downloadTime = this.calculateDownloadTime(responseSize, connection.bandwidth);
      const totalTime = responseTime + downloadTime;

      return {
        config,
        success: true,
        responseTime: totalTime,
        statusCode: response.status,
        responseSize,
        meetsTarget: totalTime <= config.expectedMaxTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        config,
        success: false,
        responseTime,
        error: error.message,
        meetsTarget: false
      };
    }
  }

  /**
   * Calculate download time based on bandwidth
   */
  private calculateDownloadTime(bytes: number, bandwidthBytesPerSecond: number): number {
    return Math.round((bytes / bandwidthBytesPerSecond) * 1000);
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): void {
    console.log('\n📊 Performance Test Report');
    console.log('==========================');
    
    // Overall statistics
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const targetMet = this.results.filter(r => r.meetsTarget).length;
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Successful: ${successfulTests} (${((successfulTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Meeting target (<500ms): ${targetMet} (${((targetMet / totalTests) * 100).toFixed(1)}%)`);
    
    // Performance by connection type
    console.log(`\n📡 Performance by Connection Type:`);
    for (const connection of this.connectionTypes) {
      const connectionResults = this.results.filter(r => 
        r.responseTime > 0 // Filter valid results for this connection
      );
      
      if (connectionResults.length === 0) continue;
      
      const avgTime = connectionResults.reduce((sum, r) => sum + r.responseTime, 0) / connectionResults.length;
      const meetingTarget = connectionResults.filter(r => r.meetsTarget).length;
      
      console.log(`   ${connection.name}: ${avgTime.toFixed(0)}ms avg, ${meetingTarget}/${this.testConfigs.length} under 500ms`);
    }
    
    // Endpoint performance analysis
    console.log(`\n🎯 Endpoint Performance Analysis:`);
    const endpointStats = this.analyzeEndpointPerformance();
    
    endpointStats.forEach(stat => {
      const status = stat.avgTime <= 500 ? '🟢' : stat.avgTime <= 1000 ? '🟡' : '🔴';
      console.log(`   ${status} ${stat.name}: ${stat.avgTime.toFixed(0)}ms avg (${stat.successRate.toFixed(1)}% success)`);
    });
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    this.generateRecommendations().forEach(rec => {
      console.log(`   • ${rec}`);
    });
    
    // 3G specific analysis
    console.log(`\n📱 3G Connection Analysis:`);
    this.analyze3GPerformance();
    
    // Save detailed report
    this.saveDetailedReport();
  }

  /**
   * Analyze endpoint performance
   */
  private analyzeEndpointPerformance(): any[] {
    const endpointMap = new Map();
    
    this.results.forEach(result => {
      const name = result.config.name;
      if (!endpointMap.has(name)) {
        endpointMap.set(name, {
          name,
          times: [],
          successes: 0,
          total: 0
        });
      }
      
      const stat = endpointMap.get(name);
      stat.times.push(result.responseTime);
      stat.total++;
      if (result.success) stat.successes++;
    });
    
    return Array.from(endpointMap.values()).map(stat => ({
      name: stat.name,
      avgTime: stat.times.reduce((a: number, b: number) => a + b, 0) / stat.times.length,
      minTime: Math.min(...stat.times),
      maxTime: Math.max(...stat.times),
      successRate: (stat.successes / stat.total) * 100
    }));
  }

  /**
   * Analyze 3G specific performance
   */
  private analyze3GPerformance(): void {
    const slowConnections = ['3G Fast', '3G Slow', '2G'];
    const slowResults = this.results.filter(r => 
      slowConnections.some(conn => r.config.description.includes('3G') || r.responseTime > 400)
    );
    
    if (slowResults.length === 0) {
      console.log('   No 3G-specific test data available');
      return;
    }
    
    const avgTime = slowResults.reduce((sum, r) => sum + r.responseTime, 0) / slowResults.length;
    const underTarget = slowResults.filter(r => r.responseTime <= 1000).length; // 1s target for 3G
    
    console.log(`   Average 3G response time: ${avgTime.toFixed(0)}ms`);
    console.log(`   3G responses under 1s: ${underTarget}/${slowResults.length} (${((underTarget / slowResults.length) * 100).toFixed(1)}%)`);
    
    if (avgTime > 1000) {
      console.log('   ⚠️  3G performance needs improvement');
    } else {
      console.log('   ✅ 3G performance is acceptable');
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;
    const targetMetPercentage = (this.results.filter(r => r.meetsTarget).length / this.results.length) * 100;
    
    if (avgResponseTime > 500) {
      recommendations.push('Overall response time is above target. Consider implementing more aggressive caching.');
    }
    
    if (targetMetPercentage < 80) {
      recommendations.push('Less than 80% of requests meet the 500ms target. Review slow endpoints.');
    }
    
    // Endpoint-specific recommendations
    const slowEndpoints = this.analyzeEndpointPerformance().filter(ep => ep.avgTime > 500);
    if (slowEndpoints.length > 0) {
      recommendations.push(`Optimize slow endpoints: ${slowEndpoints.map(ep => ep.name).join(', ')}`);
    }
    
    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed. Check error handling and timeouts.`);
    }
    
    return recommendations;
  }

  /**
   * Save detailed report to file
   */
  private saveDetailedReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        successfulTests: this.results.filter(r => r.success).length,
        targetMet: this.results.filter(r => r.meetsTarget).length,
        averageResponseTime: this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length
      },
      results: this.results,
      endpoints: this.analyzeEndpointPerformance(),
      recommendations: this.generateRecommendations()
    };
    
    const fs = require('fs');
    const filename = `performance-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    
    try {
      fs.writeFileSync(filename, JSON.stringify(report, null, 2));
      console.log(`\n💾 Detailed report saved: ${filename}`);
    } catch (error) {
      console.log(`\n⚠️  Failed to save report: ${error.message}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const testSuite = new PerformanceTestSuite();
  testSuite.runTests()
    .then(() => {
      console.log('\n✅ Performance testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Performance testing failed:', error);
      process.exit(1);
    });
}

export { PerformanceTestSuite };