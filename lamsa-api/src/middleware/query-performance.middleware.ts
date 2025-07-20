/**
 * Query Performance Monitoring Middleware
 * Tracks database query execution times and identifies slow queries
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  endpoint: string;
  method: string;
  userId?: string;
  success: boolean;
  errorMessage?: string;
}

interface PerformanceThresholds {
  warning: number;  // ms
  critical: number; // ms
}

class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private thresholds: PerformanceThresholds = {
    warning: 300,   // 300ms
    critical: 1000  // 1 second
  };

  // Store metrics in memory (in production, use Redis or database)
  private slowQueryLog: QueryMetrics[] = [];
  private maxLogSize = 1000;

  /**
   * Track query performance
   */
  trackQuery(metrics: QueryMetrics) {
    this.metrics.push(metrics);
    
    // Log slow queries
    if (metrics.executionTime > this.thresholds.warning) {
      this.slowQueryLog.unshift(metrics);
      
      // Keep log size manageable
      if (this.slowQueryLog.length > this.maxLogSize) {
        this.slowQueryLog = this.slowQueryLog.slice(0, this.maxLogSize);
      }
      
      // Log critical queries immediately
      if (metrics.executionTime > this.thresholds.critical) {
        console.warn(`🐌 CRITICAL SLOW QUERY: ${metrics.executionTime}ms`, {
          endpoint: metrics.endpoint,
          method: metrics.method,
          query: metrics.query.substring(0, 200),
          timestamp: metrics.timestamp
        });
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    if (this.metrics.length === 0) return null;

    const executionTimes = this.metrics.map(m => m.executionTime);
    const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    
    return {
      totalQueries: this.metrics.length,
      averageTime: Math.round(avgTime * 100) / 100,
      slowQueries: this.slowQueryLog.length,
      criticalQueries: this.slowQueryLog.filter(q => q.executionTime > this.thresholds.critical).length,
      longestQuery: Math.max(...executionTimes),
      shortestQuery: Math.min(...executionTimes),
      recentSlowQueries: this.slowQueryLog.slice(0, 10)
    };
  }

  /**
   * Get slow queries by endpoint
   */
  getSlowQueriesByEndpoint() {
    const endpointStats: Record<string, {
      count: number;
      avgTime: number;
      maxTime: number;
      queries: QueryMetrics[];
    }> = {};

    this.slowQueryLog.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      
      if (!endpointStats[key]) {
        endpointStats[key] = {
          count: 0,
          avgTime: 0,
          maxTime: 0,
          queries: []
        };
      }

      endpointStats[key].count++;
      endpointStats[key].queries.push(metric);
      endpointStats[key].maxTime = Math.max(endpointStats[key].maxTime, metric.executionTime);
    });

    // Calculate averages
    Object.keys(endpointStats).forEach(key => {
      const stats = endpointStats[key];
      stats.avgTime = stats.queries.reduce((sum, q) => sum + q.executionTime, 0) / stats.count;
    });

    return endpointStats;
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = [];
    this.slowQueryLog = [];
  }
}

export const queryMonitor = new QueryPerformanceMonitor();

/**
 * Middleware to track query performance
 */
export function queryPerformanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalJson = res.json;
  const originalSend = res.send;

  // Track when response is sent
  res.json = function(data: any) {
    trackRequestCompletion();
    return originalJson.call(this, data);
  };

  res.send = function(data: any) {
    trackRequestCompletion();
    return originalSend.call(this, data);
  };

  function trackRequestCompletion() {
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    const metrics: QueryMetrics = {
      query: `${req.method} ${req.path}`,
      executionTime,
      timestamp: new Date(),
      endpoint: req.path,
      method: req.method,
      userId: (req as any).user?.id,
      success: res.statusCode < 400
    };

    if (res.statusCode >= 400) {
      metrics.errorMessage = `HTTP ${res.statusCode}`;
    }

    queryMonitor.trackQuery(metrics);
  }

  next();
}

/**
 * Enhanced Supabase client with performance tracking
 */
export class PerformanceTrackingSupabaseClient {
  private supabaseClient: any;

  constructor(client: any) {
    this.supabaseClient = client;
  }

  /**
   * Enhanced from() method with performance tracking
   */
  from(table: string) {
    const self = this;
    const originalFrom = this.supabaseClient.from(table);

    return new Proxy(originalFrom, {
      get(target, prop, receiver) {
        const originalMethod = target[prop];

        // Track select, insert, update, delete operations
        if (['select', 'insert', 'update', 'delete', 'upsert'].includes(prop as string)) {
          return function(...args: any[]) {
            const startTime = Date.now();
            const result = originalMethod.apply(target, args);

            // If it's a thenable (Promise-like), track the completion
            if (result && typeof result.then === 'function') {
              return result.then((data: any) => {
                const executionTime = Date.now() - startTime;
                
                queryMonitor.trackQuery({
                  query: `${prop} ${table}`,
                  executionTime,
                  timestamp: new Date(),
                  endpoint: 'database',
                  method: prop as string,
                  success: !data.error
                });

                return data;
              });
            }

            return result;
          };
        }

        return Reflect.get(target, prop, receiver);
      }
    });
  }

  /**
   * Enhanced rpc() method with performance tracking
   */
  rpc(fn: string, params?: any) {
    const startTime = Date.now();
    const result = this.supabaseClient.rpc(fn, params);

    if (result && typeof result.then === 'function') {
      return result.then((data: any) => {
        const executionTime = Date.now() - startTime;
        
        queryMonitor.trackQuery({
          query: `rpc ${fn}`,
          executionTime,
          timestamp: new Date(),
          endpoint: 'database-rpc',
          method: 'rpc',
          success: !data.error
        });

        return data;
      });
    }

    return result;
  }

  /**
   * Pass through other methods
   */
  auth = this.supabaseClient.auth;
  storage = this.supabaseClient.storage;
  functions = this.supabaseClient.functions;
  realtime = this.supabaseClient.realtime;
}

/**
 * Create performance-tracked Supabase client
 */
export const performanceSupabase = new PerformanceTrackingSupabaseClient(supabase);

/**
 * Database query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Optimize provider search query
   */
  static optimizeProviderSearch(baseQuery: any, filters: {
    lat?: number;
    lng?: number;
    radius?: number;
    category?: string;
    priceRange?: { min: number; max: number };
  }) {
    let optimizedQuery = baseQuery;

    // Use spatial index for location-based queries
    if (filters.lat && filters.lng) {
      const radiusInDegrees = (filters.radius || 10) / 111; // Convert km to degrees
      
      optimizedQuery = optimizedQuery
        .gte('latitude', filters.lat - radiusInDegrees)
        .lte('latitude', filters.lat + radiusInDegrees)
        .gte('longitude', filters.lng - radiusInDegrees)
        .lte('longitude', filters.lng + radiusInDegrees);
    }

    // Use covering index for category filtering
    if (filters.category) {
      optimizedQuery = optimizedQuery.eq('category', filters.category);
    }

    // Optimize with verified and active filtering (uses composite index)
    optimizedQuery = optimizedQuery
      .eq('verified', true)
      .eq('active', true);

    return optimizedQuery;
  }

  /**
   * Optimize booking queries
   */
  static optimizeBookingQuery(baseQuery: any, filters: {
    providerId?: string;
    userId?: string;
    dateRange?: { start: string; end: string };
    status?: string[];
  }) {
    let optimizedQuery = baseQuery;

    // Use composite index for provider booking queries
    if (filters.providerId) {
      optimizedQuery = optimizedQuery.eq('provider_id', filters.providerId);
    }

    // Use user history index
    if (filters.userId) {
      optimizedQuery = optimizedQuery.eq('user_id', filters.userId);
    }

    // Use date range index
    if (filters.dateRange) {
      optimizedQuery = optimizedQuery
        .gte('booking_date', filters.dateRange.start)
        .lte('booking_date', filters.dateRange.end);
    }

    // Use status index
    if (filters.status && filters.status.length > 0) {
      optimizedQuery = optimizedQuery.in('status', filters.status);
    }

    return optimizedQuery;
  }

  /**
   * Optimize review queries
   */
  static optimizeReviewQuery(baseQuery: any, filters: {
    providerId?: string;
    minRating?: number;
    limit?: number;
  }) {
    let optimizedQuery = baseQuery;

    // Use provider review index
    if (filters.providerId) {
      optimizedQuery = optimizedQuery.eq('provider_id', filters.providerId);
    }

    // Filter by rating if specified
    if (filters.minRating) {
      optimizedQuery = optimizedQuery.gte('rating', filters.minRating);
    }

    // Order by date for latest reviews (uses index)
    optimizedQuery = optimizedQuery.order('created_at', { ascending: false });

    // Limit results
    if (filters.limit) {
      optimizedQuery = optimizedQuery.limit(filters.limit);
    }

    return optimizedQuery;
  }
}

/**
 * Performance monitoring endpoint handler
 */
export function getPerformanceStats() {
  const stats = queryMonitor.getStats();
  const endpointStats = queryMonitor.getSlowQueriesByEndpoint();

  return {
    overview: stats,
    byEndpoint: endpointStats,
    thresholds: {
      warning: 300,
      critical: 1000
    },
    recommendations: generatePerformanceRecommendations(stats, endpointStats)
  };
}

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(
  stats: any, 
  endpointStats: any
): string[] {
  const recommendations: string[] = [];

  if (!stats) return recommendations;

  // Check average response time
  if (stats.averageTime > 500) {
    recommendations.push('Overall average response time is high. Consider implementing caching.');
  }

  // Check for critical queries
  if (stats.criticalQueries > 0) {
    recommendations.push(`${stats.criticalQueries} queries are taking over 1 second. Review and optimize these queries.`);
  }

  // Check endpoint-specific issues
  Object.entries(endpointStats).forEach(([endpoint, data]: [string, any]) => {
    if (data.avgTime > 800) {
      recommendations.push(`Endpoint ${endpoint} is consistently slow (${Math.round(data.avgTime)}ms avg). Consider optimization.`);
    }
  });

  // Check slow query percentage
  const slowQueryPercentage = (stats.slowQueries / stats.totalQueries) * 100;
  if (slowQueryPercentage > 10) {
    recommendations.push(`${Math.round(slowQueryPercentage)}% of queries are slow. Review database indexes and query patterns.`);
  }

  return recommendations;
}