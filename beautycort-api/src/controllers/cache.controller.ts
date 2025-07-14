import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { cacheService } from '../services/cache.service';

export class CacheController {

  // Get cache statistics
  async getCacheStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await cacheService.getStats();
      const hitMissStats = await cacheService.getHitMissStats();

      const response: ApiResponse = {
        success: true,
        data: {
          ...stats,
          hitRate: hitMissStats.hits + hitMissStats.misses > 0 
            ? (hitMissStats.hits / (hitMissStats.hits + hitMissStats.misses)) * 100 
            : 0,
          ...hitMissStats
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Clear specific cache keys
  async clearCache(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { keys, pattern } = req.body;
      
      if (!keys && !pattern) {
        throw new AppError('Either keys array or pattern is required', 400);
      }

      let clearedCount = 0;

      if (keys && Array.isArray(keys)) {
        for (const key of keys) {
          await cacheService.delete(key);
          clearedCount++;
        }
      }

      if (pattern) {
        // For pattern-based clearing, we'd need to implement pattern matching
        // For now, just clear common patterns
        const commonPatterns = [
          `dashboard:${pattern}`,
          `analytics:${pattern}`,
          `revenue:${pattern}`,
          `customer:${pattern}`,
          `reviews:${pattern}`,
          `gamification:${pattern}`,
          `insights:${pattern}`
        ];

        for (const patternKey of commonPatterns) {
          await cacheService.delete(patternKey);
          clearedCount++;
        }
      }

      const response: ApiResponse = {
        success: true,
        message: `Cleared ${clearedCount} cache entries`,
        data: { clearedCount }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Clear all cache (admin only)
  async clearAllCache(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await cacheService.clear();

      const response: ApiResponse = {
        success: true,
        message: 'All cache entries cleared successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Warm up cache for a provider
  async warmUpCache(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      // Import services that we want to warm up
      const { DashboardService } = await import('../services/dashboard.service');
      const { AnalyticsService } = await import('../services/analytics.service');
      const { performanceInsightsService } = await import('../services/performance-insights.service');
      
      const dashboardService = new DashboardService();
      const analyticsService = new AnalyticsService();

      // Warm up common cache entries
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const warmUpTasks = [
        // Dashboard data
        dashboardService.getTodayStats(providerId, startOfToday, endOfToday),
        dashboardService.getRealtimeMetrics(providerId),
        dashboardService.getDailyGoals(providerId, today),
        
        // Analytics data
        analyticsService.getPeriodStatistics(providerId, startOfToday, endOfToday, 'day'),
        analyticsService.getReviewInsights(providerId),
        analyticsService.getBookingPatterns(providerId),
        
        // Performance insights
        performanceInsightsService.generatePerformanceInsights(providerId),
        performanceInsightsService.getMarketIntelligence(providerId)
      ];

      await Promise.allSettled(warmUpTasks);

      const response: ApiResponse = {
        success: true,
        message: 'Cache warmed up successfully',
        data: { 
          providerId,
          warmedUpSections: [
            'dashboard',
            'analytics', 
            'performance_insights',
            'market_intelligence'
          ]
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get cache health
  async getCacheHealth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await cacheService.getStats();
      const hitMissStats = await cacheService.getHitMissStats();
      
      const hitRate = hitMissStats.hits + hitMissStats.misses > 0 
        ? (hitMissStats.hits / (hitMissStats.hits + hitMissStats.misses)) * 100 
        : 0;

      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      const issues: string[] = [];

      if (hitRate < 50) {
        healthStatus = 'warning';
        issues.push('Low cache hit rate');
      }

      if (hitRate < 20) {
        healthStatus = 'critical';
      }

      if (stats.type === 'memory' && stats.totalKeys > 1000) {
        healthStatus = 'warning';
        issues.push('High memory cache usage');
      }

      const response: ApiResponse = {
        success: true,
        data: {
          status: healthStatus,
          hitRate: Math.round(hitRate * 100) / 100,
          totalKeys: stats.totalKeys,
          cacheType: stats.type,
          memoryUsage: stats.memoryUsage,
          uptime: stats.uptime,
          issues,
          recommendations: this.getCacheRecommendations(hitRate, stats)
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  private getCacheRecommendations(hitRate: number, stats: any): string[] {
    const recommendations: string[] = [];

    if (hitRate < 50) {
      recommendations.push('Increase cache TTL for frequently accessed data');
      recommendations.push('Implement cache warming for critical data');
    }

    if (stats.type === 'memory' && stats.totalKeys > 1000) {
      recommendations.push('Consider implementing Redis for better performance');
      recommendations.push('Reduce cache TTL for less critical data');
    }

    if (stats.type === 'redis' && stats.memoryUsage) {
      recommendations.push('Monitor Redis memory usage');
      recommendations.push('Consider implementing cache eviction policies');
    }

    return recommendations;
  }

  // Reset cache statistics
  async resetCacheStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      cacheService.resetStats();

      const response: ApiResponse = {
        success: true,
        message: 'Cache statistics reset successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Check if specific keys exist
  async checkCacheKeys(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { keys } = req.body;
      
      if (!keys || !Array.isArray(keys)) {
        throw new AppError('Keys array is required', 400);
      }

      const results: Record<string, boolean> = {};
      
      for (const key of keys) {
        results[key] = await cacheService.exists(key);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          results,
          existingCount: Object.values(results).filter(Boolean).length,
          totalChecked: keys.length
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get cache configuration
  async getCacheConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          redisEnabled: !!process.env.REDIS_URL,
          redisHost: process.env.REDIS_HOST || 'localhost',
          redisPort: process.env.REDIS_PORT || '6379',
          defaultTTL: process.env.CACHE_TTL || '300',
          cacheEndpoints: {
            stats: '/api/cache/stats',
            health: '/api/cache/health',
            clear: '/api/cache/clear',
            warmup: '/api/cache/warmup/:providerId'
          }
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const cacheController = new CacheController();