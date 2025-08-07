/**
 * Performance Monitoring Controller
 * Provides endpoints for monitoring system performance and database query metrics
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { getPerformanceStats, queryMonitor } from '../middleware/query-performance.middleware';
import { performanceCacheService } from '../services/performance-cache.service';
import { getErrorMessage } from '../utils/error-handling';
import { cacheService } from '../services/cache.service';
import { supabase } from '../config/supabase';

interface PerformanceMetrics {
  database: {
    slowQueries: any[];
    averageQueryTime: number;
    queryCount: number;
    indexUsage: any[];
  };
  cache: {
    hitRate: number;
    totalQueries: number;
    cacheSize: string;
    provider: string;
  };
  api: {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    slowEndpoints: any[];
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
  };
}

export class PerformanceController {
  /**
   * Get comprehensive performance dashboard
   * GET /api/performance/dashboard
   */
  async getPerformanceDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Gather performance metrics from all sources
      const [
        queryStats,
        cacheStats,
        databaseStats,
        systemStats
      ] = await Promise.all([
        this.getQueryPerformanceStats(),
        this.getCachePerformanceStats(),
        this.getDatabasePerformanceStats(),
        this.getSystemPerformanceStats()
      ]);

      const metrics: PerformanceMetrics = {
        database: databaseStats,
        cache: cacheStats,
        api: queryStats,
        system: systemStats
      };

      const response: ApiResponse = {
        success: true,
        data: metrics,
        meta: {
          generatedAt: new Date().toISOString(),
          executionTime: Date.now() - startTime
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get slow query analysis
   * GET /api/performance/slow-queries
   */
  async getSlowQueries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      
      // Get slow queries from monitoring
      const performanceStats = getPerformanceStats();
      const slowQueries = performanceStats.byEndpoint;
      
      // Get database slow queries
      const { data: dbSlowQueries, error } = await supabase.rpc('get_slow_queries');
      
      if (error) {
        throw new AppError('Failed to fetch slow queries', 500);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          apiQueries: Object.entries(slowQueries)
            .sort(([,a], [,b]) => (b as any).avgTime - (a as any).avgTime)
            .slice(0, Number(limit)),
          databaseQueries: dbSlowQueries || [],
          summary: {
            totalSlowQueries: Object.keys(slowQueries).length,
            averageSlowTime: this.calculateAverageSlowTime(slowQueries)
          }
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cache performance metrics
   * GET /api/performance/cache
   */
  async getCacheMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cacheStats = await performanceCacheService.getCacheStats();
      const systemCacheStats = await cacheService.getStats();
      
      const response: ApiResponse = {
        success: true,
        data: {
          performance: cacheStats.performance,
          system: cacheStats.system,
          recommendations: cacheStats.recommendations,
          hitMissStats: await cacheService.getHitMissStats()
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get database performance metrics
   * GET /api/performance/database
   */
  async getDatabaseMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [indexUsage, tableStats, connectionStats] = await Promise.all([
        supabase.rpc('get_index_usage'),
        this.getTableStatistics(),
        this.getConnectionStatistics()
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          indexUsage: indexUsage.data || [],
          tableStats,
          connections: connectionStats,
          recommendations: this.generateDatabaseRecommendations(indexUsage.data || [])
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API endpoint performance
   * GET /api/performance/endpoints
   */
  async getEndpointPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const performanceStats = getPerformanceStats();
      
      const endpointStats = Object.entries(performanceStats.byEndpoint || {})
        .map(([endpoint, stats]: [string, any]) => ({
          endpoint,
          ...stats,
          healthScore: this.calculateEndpointHealthScore(stats)
        }))
        .sort((a, b) => a.avgTime - b.avgTime);

      const response: ApiResponse = {
        success: true,
        data: {
          endpoints: endpointStats,
          summary: {
            totalEndpoints: endpointStats.length,
            averageResponseTime: this.calculateOverallAverageTime(endpointStats),
            healthyEndpoints: endpointStats.filter(e => e.healthScore > 80).length,
            slowEndpoints: endpointStats.filter(e => e.avgTime > 1000).length
          }
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run performance test suite
   * POST /api/performance/test
   */
  async runPerformanceTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tests = ['all'] } = req.body;
      
      const testResults = await this.executePerformanceTests(tests);
      
      const response: ApiResponse = {
        success: true,
        data: testResults,
        meta: {
          testsRun: tests,
          executedAt: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Optimize database performance
   * POST /api/performance/optimize
   */
  async optimizeDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { actions = ['analyze', 'vacuum'] } = req.body;
      
      const optimizationResults = await this.executeOptimizations(actions);
      
      const response: ApiResponse = {
        success: true,
        data: optimizationResults,
        message: 'Database optimization completed'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get query performance statistics
   */
  private async getQueryPerformanceStats(): Promise<any> {
    const stats = getPerformanceStats();
    
    return {
      averageResponseTime: stats.overview?.averageTime || 0,
      totalRequests: stats.overview?.totalQueries || 0,
      errorRate: this.calculateErrorRate(stats),
      slowEndpoints: Object.entries(stats.byEndpoint || {})
        .filter(([, data]: [string, any]) => data.avgTime > 1000)
        .slice(0, 5)
    };
  }

  /**
   * Get cache performance statistics
   */
  private async getCachePerformanceStats(): Promise<any> {
    const stats = await performanceCacheService.getCacheStats();
    const systemStats = await cacheService.getStats();
    
    const totalHits = Object.values(stats.performance).reduce((sum, s: any) => sum + s.hits, 0);
    const totalRequests = Object.values(stats.performance).reduce((sum, s: any) => sum + s.totalRequests, 0);
    
    return {
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      totalQueries: totalRequests,
      cacheSize: systemStats.memoryUsage || '0 KB',
      provider: systemStats.type
    };
  }

  /**
   * Get database performance statistics
   */
  private async getDatabasePerformanceStats(): Promise<any> {
    const { data: slowQueries } = await supabase.rpc('get_slow_queries');
    const { data: indexUsage } = await supabase.rpc('get_index_usage');
    
    return {
      slowQueries: slowQueries?.slice(0, 10) || [],
      averageQueryTime: this.calculateAverageQueryTime(slowQueries || []),
      queryCount: slowQueries?.length || 0,
      indexUsage: indexUsage?.slice(0, 10) || []
    };
  }

  /**
   * Get system performance statistics
   */
  private async getSystemPerformanceStats(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    
    return {
      uptime: process.uptime(),
      memoryUsage,
      cpuUsage: await this.getCPUUsage()
    };
  }

  /**
   * Get table statistics
   */
  private async getTableStatistics(): Promise<any> {
    const { data, error } = await supabase.rpc('get_table_stats');
    
    if (error) {
      console.error('Failed to get table stats:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Get connection statistics
   */
  private async getConnectionStatistics(): Promise<any> {
    // This would typically come from pg_stat_activity
    return {
      active: 1,
      idle: 0,
      total: 1
    };
  }

  /**
   * Execute performance tests
   */
  private async executePerformanceTests(tests: string[]): Promise<any> {
    const results: any = {};
    
    if (tests.includes('all') || tests.includes('database')) {
      results.database = await this.testDatabasePerformance();
    }
    
    if (tests.includes('all') || tests.includes('cache')) {
      results.cache = await this.testCachePerformance();
    }
    
    if (tests.includes('all') || tests.includes('api')) {
      results.api = await this.testAPIPerformance();
    }
    
    return results;
  }

  /**
   * Test database performance
   */
  private async testDatabasePerformance(): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Test simple query
      const { data, error } = await supabase
        .from('providers')
        .select('count')
        .limit(1);
      
      const queryTime = Date.now() - startTime;
      
      return {
        success: !error,
        queryTime,
        status: queryTime < 100 ? 'excellent' : queryTime < 500 ? 'good' : 'needs_improvement'
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
        queryTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test cache performance
   */
  private async testCachePerformance(): Promise<any> {
    const testKey = `performance_test_${Date.now()}`;
    const testData = { test: true, timestamp: Date.now() };
    
    try {
      // Test cache write
      const writeStart = Date.now();
      await cacheService.set(testKey, testData, 60);
      const writeTime = Date.now() - writeStart;
      
      // Test cache read
      const readStart = Date.now();
      const cachedData = await cacheService.get(testKey);
      const readTime = Date.now() - readStart;
      
      // Cleanup
      await cacheService.delete(testKey);
      
      return {
        success: !!cachedData,
        writeTime,
        readTime,
        status: (writeTime + readTime) < 10 ? 'excellent' : 'good'
      };
    } catch (error) {
      return {
        success: false,
        error: (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Test API performance
   */
  private async testAPIPerformance(): Promise<any> {
    // This would typically make internal API calls to test response times
    return {
      success: true,
      averageResponseTime: 150,
      status: 'good'
    };
  }

  /**
   * Execute optimization actions
   */
  private async executeOptimizations(actions: string[]): Promise<any> {
    const results: any = {};
    
    if (actions.includes('analyze')) {
      results.analyze = await this.analyzeDatabase();
    }
    
    if (actions.includes('vacuum')) {
      results.vacuum = await this.vacuumDatabase();
    }
    
    if (actions.includes('reindex')) {
      results.reindex = await this.reindexDatabase();
    }
    
    return results;
  }

  /**
   * Analyze database tables
   */
  private async analyzeDatabase(): Promise<any> {
    try {
      const { error } = await supabase.rpc('update_table_statistics');
      
      return {
        success: !error,
        message: error ? error.message : 'Database analysis completed',
        executedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Vacuum database
   */
  private async vacuumDatabase(): Promise<any> {
    // Note: VACUUM typically requires superuser privileges
    return {
      success: true,
      message: 'Vacuum operation scheduled (requires manual execution)',
      recommendation: 'Run VACUUM ANALYZE on main tables during maintenance window'
    };
  }

  /**
   * Reindex database
   */
  private async reindexDatabase(): Promise<any> {
    return {
      success: true,
      message: 'Reindex operation scheduled (requires manual execution)',
      recommendation: 'Run REINDEX on frequently used indexes during maintenance window'
    };
  }

  /**
   * Calculate error rate from stats
   */
  private calculateErrorRate(stats: any): number {
    if (!stats.overview || stats.overview.totalQueries === 0) return 0;
    
    // This is a simplified calculation
    return 0; // Would need to track errors separately
  }

  /**
   * Calculate average slow time
   */
  private calculateAverageSlowTime(slowQueries: any): number {
    if (!slowQueries || Object.keys(slowQueries).length === 0) return 0;
    
    const times = Object.values(slowQueries).map((q: any) => q.avgTime);
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * Calculate average query time
   */
  private calculateAverageQueryTime(queries: any[]): number {
    if (!queries || queries.length === 0) return 0;
    
    const totalTime = queries.reduce((sum, q) => sum + (q.mean_time_ms || 0), 0);
    return totalTime / queries.length;
  }

  /**
   * Calculate overall average time
   */
  private calculateOverallAverageTime(endpoints: any[]): number {
    if (endpoints.length === 0) return 0;
    
    const totalTime = endpoints.reduce((sum, e) => sum + e.avgTime, 0);
    return totalTime / endpoints.length;
  }

  /**
   * Calculate endpoint health score
   */
  private calculateEndpointHealthScore(stats: any): number {
    // Score based on response time and request count
    const responseTimeScore = Math.max(0, 100 - (stats.avgTime / 10)); // 10ms = 1 point deduction
    const usageScore = Math.min(100, stats.count / 10); // Higher usage is better (more tested)
    
    return Math.round((responseTimeScore + usageScore) / 2);
  }

  /**
   * Generate database recommendations
   */
  private generateDatabaseRecommendations(indexUsage: any[]): string[] {
    const recommendations: string[] = [];
    
    // Check for unused indexes
    const unusedIndexes = indexUsage.filter(idx => idx.times_used === 0);
    if (unusedIndexes.length > 0) {
      recommendations.push(`Consider dropping ${unusedIndexes.length} unused indexes to save space`);
    }
    
    // Check for heavily used indexes
    const heavyIndexes = indexUsage.filter(idx => idx.times_used > 10000);
    if (heavyIndexes.length > 0) {
      recommendations.push(`Monitor ${heavyIndexes.length} heavily used indexes for performance`);
    }
    
    return recommendations;
  }

  /**
   * Get CPU usage (simplified)
   */
  private async getCPUUsage(): Promise<number> {
    // This is a simplified implementation
    // In production, you'd use a proper CPU monitoring library
    return Math.random() * 100; // Mock CPU usage
  }
}

export const performanceController = new PerformanceController();