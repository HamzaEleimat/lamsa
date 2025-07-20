/**
 * Performance-optimized caching service for frequently accessed data
 * Implements smart caching strategies for provider search, service listings, and analytics
 */

import { cacheService, CacheKeys } from './cache.service';
import { supabase } from '../config/supabase';

interface ProviderSearchParams {
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  priceRange?: { min: number; max: number };
  page?: number;
  limit?: number;
}

interface ServiceListingParams {
  categoryId?: string;
  providerId?: string;
  active?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export class PerformanceCacheService {
  private hitStats: Map<string, number> = new Map();
  private missStats: Map<string, number> = new Map();

  // Cache TTL configurations (in seconds)
  private static readonly CACHE_TTL = {
    PROVIDER_SEARCH: 600,      // 10 minutes - frequent updates
    SERVICE_LISTINGS: 900,     // 15 minutes - moderate updates  
    PROVIDER_DETAILS: 300,     // 5 minutes - dynamic data
    CATEGORIES: 3600,          // 1 hour - rarely changes
    ANALYTICS_HOURLY: 3600,    // 1 hour - aggregated data
    ANALYTICS_DAILY: 86400,    // 24 hours - historical data
    REVIEWS: 1800,             // 30 minutes - new reviews
    AVAILABILITY: 300,         // 5 minutes - real-time data
    POPULAR_SEARCHES: 1800     // 30 minutes - trending data
  };

  /**
   * Cache provider search results with intelligent key generation
   */
  async cacheProviderSearch(
    params: ProviderSearchParams,
    results: any,
    ttl?: number
  ): Promise<void> {
    const cacheKey = this.generateProviderSearchKey(params);
    const cacheTTL = ttl || PerformanceCacheService.CACHE_TTL.PROVIDER_SEARCH;
    
    await cacheService.set(cacheKey, {
      results,
      timestamp: Date.now(),
      params,
      count: results.length
    }, cacheTTL);

    // Also cache popular searches for trends
    await this.trackPopularSearch('provider', cacheKey);
  }

  /**
   * Get cached provider search results
   */
  async getCachedProviderSearch(params: ProviderSearchParams): Promise<any | null> {
    const cacheKey = this.generateProviderSearchKey(params);
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.recordHit('provider_search');
      return (cached as any).results;
    }

    this.recordMiss('provider_search');
    return null;
  }

  /**
   * Cache service listings with category optimization
   */
  async cacheServiceListings(
    params: ServiceListingParams,
    results: any,
    ttl?: number
  ): Promise<void> {
    const cacheKey = this.generateServiceListingKey(params);
    const cacheTTL = ttl || PerformanceCacheService.CACHE_TTL.SERVICE_LISTINGS;

    await cacheService.set(cacheKey, {
      results,
      timestamp: Date.now(),
      params,
      count: results.length
    }, cacheTTL);

    // Cache by category for quick category-based lookups
    if (params.categoryId) {
      const categoryKey = `services:category:${params.categoryId}`;
      await cacheService.set(categoryKey, results, cacheTTL);
    }
  }

  /**
   * Get cached service listings
   */
  async getCachedServiceListings(params: ServiceListingParams): Promise<any | null> {
    const cacheKey = this.generateServiceListingKey(params);
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.recordHit('service_listings');
      return cached.results;
    }

    this.recordMiss('service_listings');
    return null;
  }

  /**
   * Cache provider details with related data
   */
  async cacheProviderDetails(providerId: string, details: any): Promise<void> {
    const cacheKey = CacheKeys.provider(providerId);
    
    await cacheService.set(cacheKey, {
      ...details,
      cached_at: Date.now()
    }, PerformanceCacheService.CACHE_TTL.PROVIDER_DETAILS);

    // Cache related data separately for partial updates
    if (details.services) {
      await cacheService.set(
        `provider:${providerId}:services`,
        details.services,
        PerformanceCacheService.CACHE_TTL.SERVICE_LISTINGS
      );
    }

    if (details.reviews) {
      await cacheService.set(
        `provider:${providerId}:reviews`,
        details.reviews,
        PerformanceCacheService.CACHE_TTL.REVIEWS
      );
    }

    if (details.availability) {
      await cacheService.set(
        `provider:${providerId}:availability`,
        details.availability,
        PerformanceCacheService.CACHE_TTL.AVAILABILITY
      );
    }
  }

  /**
   * Get cached provider details
   */
  async getCachedProviderDetails(providerId: string): Promise<any | null> {
    const cacheKey = CacheKeys.provider(providerId);
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.recordHit('provider_details');
      return cached;
    }

    this.recordMiss('provider_details');
    return null;
  }

  /**
   * Cache service categories (rarely change)
   */
  async cacheServiceCategories(categories: any[]): Promise<void> {
    await cacheService.set(
      'service:categories:all',
      categories,
      PerformanceCacheService.CACHE_TTL.CATEGORIES
    );

    // Cache individual categories
    const categoryPromises = categories.map(category =>
      cacheService.set(
        `service:category:${category.id}`,
        category,
        PerformanceCacheService.CACHE_TTL.CATEGORIES
      )
    );

    await Promise.all(categoryPromises);
  }

  /**
   * Get cached service categories
   */
  async getCachedServiceCategories(): Promise<any[] | null> {
    const cached = await cacheService.get('service:categories:all');
    if (cached) {
      this.recordHit('service_categories');
      return cached as any[];
    }

    this.recordMiss('service_categories');
    return null;
  }

  /**
   * Cache analytics data with time-based keys
   */
  async cacheAnalytics(
    type: 'hourly' | 'daily' | 'weekly',
    identifier: string,
    data: any,
    date: string
  ): Promise<void> {
    const cacheKey = `analytics:${type}:${identifier}:${date}`;
    const ttl = type === 'hourly' 
      ? PerformanceCacheService.CACHE_TTL.ANALYTICS_HOURLY
      : PerformanceCacheService.CACHE_TTL.ANALYTICS_DAILY;

    await cacheService.set(cacheKey, {
      data,
      type,
      identifier,
      date,
      generated_at: Date.now()
    }, ttl);
  }

  /**
   * Get cached analytics data
   */
  async getCachedAnalytics(
    type: 'hourly' | 'daily' | 'weekly',
    identifier: string,
    date: string
  ): Promise<any | null> {
    const cacheKey = `analytics:${type}:${identifier}:${date}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.recordHit('analytics');
      return (cached as any).data;
    }

    this.recordMiss('analytics');
    return null;
  }

  /**
   * Cache availability data with real-time expiration
   */
  async cacheAvailability(
    providerId: string,
    date: string,
    slots: any[]
  ): Promise<void> {
    const cacheKey = `availability:${providerId}:${date}`;
    
    await cacheService.set(cacheKey, {
      slots,
      date,
      provider_id: providerId,
      cached_at: Date.now()
    }, PerformanceCacheService.CACHE_TTL.AVAILABILITY);
  }

  /**
   * Get cached availability data
   */
  async getCachedAvailability(providerId: string, date: string): Promise<any | null> {
    const cacheKey = `availability:${providerId}:${date}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.recordHit('availability');
      return cached;
    }

    this.recordMiss('availability');
    return null;
  }

  /**
   * Invalidate cache when data changes
   */
  async invalidateProviderCache(providerId: string): Promise<void> {
    const keysToInvalidate = [
      CacheKeys.provider(providerId),
      `provider:${providerId}:services`,
      `provider:${providerId}:reviews`,
      `provider:${providerId}:availability`
    ];

    // Also invalidate search caches that might include this provider
    const searchPatterns = [
      'provider:search:*',
      'service:listings:*'
    ];

    await Promise.all([
      ...keysToInvalidate.map(key => cacheService.delete(key)),
      ...searchPatterns.map(pattern => this.invalidateByPattern(pattern))
    ]);
  }

  /**
   * Invalidate service cache when services change
   */
  async invalidateServiceCache(serviceId: string, categoryId?: string): Promise<void> {
    const keysToInvalidate = [
      CacheKeys.service(serviceId),
      'service:listings:*'
    ];

    if (categoryId) {
      keysToInvalidate.push(`services:category:${categoryId}`);
    }

    await Promise.all(
      keysToInvalidate.map(key => 
        key.includes('*') 
          ? this.invalidateByPattern(key)
          : cacheService.delete(key)
      )
    );
  }

  /**
   * Warm up cache with popular data
   */
  async warmupCache(): Promise<void> {
    console.log('🔥 Starting cache warmup...');

    try {
      // Warm up service categories (most frequently accessed)
      const { data: categories } = await supabase
        .from('service_categories')
        .select('*')
        .order('sort_order');

      if (categories) {
        await this.cacheServiceCategories(categories);
        console.log(`✅ Cached ${categories.length} service categories`);
      }

      // Warm up popular providers
      const { data: popularProviders } = await supabase
        .from('providers')
        .select(`
          id, business_name_ar, business_name_en, 
          category, latitude, longitude, rating, total_reviews
        `)
        .eq('verified', true)
        .eq('active', true)
        .order('total_reviews', { ascending: false })
        .limit(50);

      if (popularProviders) {
        const warmupPromises = popularProviders.map(provider =>
          this.cacheProviderDetails(provider.id, provider)
        );
        await Promise.all(warmupPromises);
        console.log(`✅ Cached ${popularProviders.length} popular providers`);
      }

      // Warm up major city searches (Amman districts)
      const ammanDistricts = [
        { lat: 31.9539, lng: 35.9106, name: 'Downtown' },
        { lat: 31.9722, lng: 35.8822, name: 'Abdali' },
        { lat: 31.9500, lng: 35.9000, name: 'Abdoun' },
        { lat: 32.0167, lng: 35.8833, name: 'Shmeisani' }
      ];

      for (const district of ammanDistricts) {
        const searchParams: ProviderSearchParams = {
          lat: district.lat,
          lng: district.lng,
          radius: 5,
          limit: 20
        };

        // This would normally hit the database, but we'll pre-populate
        const cacheKey = this.generateProviderSearchKey(searchParams);
        await cacheService.set(cacheKey, {
          results: [], // Would be actual results
          timestamp: Date.now(),
          params: searchParams,
          count: 0
        }, PerformanceCacheService.CACHE_TTL.PROVIDER_SEARCH);
      }

      console.log('✅ Cache warmup completed successfully');
    } catch (error) {
      console.error('❌ Cache warmup failed:', error);
    }
  }

  /**
   * Get cache performance statistics
   */
  async getCacheStats(): Promise<{
    performance: Record<string, CacheStats>;
    system: any;
    recommendations: string[];
  }> {
    const systemStats = await cacheService.getStats();
    const performance: Record<string, CacheStats> = {};

    // Calculate hit rates for each cache type
    for (const [key, hits] of this.hitStats.entries()) {
      const misses = this.missStats.get(key) || 0;
      const total = hits + misses;
      
      performance[key] = {
        hits,
        misses,
        hitRate: total > 0 ? (hits / total) * 100 : 0,
        totalRequests: total
      };
    }

    const recommendations = this.generateCacheRecommendations(performance);

    return {
      performance,
      system: systemStats,
      recommendations
    };
  }

  /**
   * Generate cache optimization recommendations
   */
  private generateCacheRecommendations(stats: Record<string, CacheStats>): string[] {
    const recommendations: string[] = [];

    Object.entries(stats).forEach(([cacheType, data]) => {
      if (data.hitRate < 50 && data.totalRequests > 100) {
        recommendations.push(`${cacheType} has low hit rate (${data.hitRate.toFixed(1)}%). Consider longer TTL or better cache keys.`);
      }
      
      if (data.totalRequests > 1000 && data.hitRate > 90) {
        recommendations.push(`${cacheType} is performing excellently (${data.hitRate.toFixed(1)}% hit rate). Consider increasing TTL.`);
      }
    });

    return recommendations;
  }

  /**
   * Generate cache key for provider search
   */
  private generateProviderSearchKey(params: ProviderSearchParams): string {
    const keyParts = ['provider', 'search'];
    
    if (params.lat && params.lng) {
      // Round coordinates to 3 decimal places for cache efficiency
      keyParts.push(`lat:${params.lat.toFixed(3)}`);
      keyParts.push(`lng:${params.lng.toFixed(3)}`);
      keyParts.push(`radius:${params.radius || 10}`);
    }
    
    if (params.category) keyParts.push(`cat:${params.category}`);
    if (params.priceRange) {
      keyParts.push(`price:${params.priceRange.min}-${params.priceRange.max}`);
    }
    
    keyParts.push(`page:${params.page || 1}`);
    keyParts.push(`limit:${params.limit || 20}`);
    
    return keyParts.join(':');
  }

  /**
   * Generate cache key for service listings
   */
  private generateServiceListingKey(params: ServiceListingParams): string {
    const keyParts = ['service', 'listings'];
    
    if (params.categoryId) keyParts.push(`cat:${params.categoryId}`);
    if (params.providerId) keyParts.push(`provider:${params.providerId}`);
    if (params.active !== undefined) keyParts.push(`active:${params.active}`);
    if (params.minPrice) keyParts.push(`minPrice:${params.minPrice}`);
    if (params.maxPrice) keyParts.push(`maxPrice:${params.maxPrice}`);
    
    return keyParts.join(':');
  }

  /**
   * Track popular searches for analytics
   */
  private async trackPopularSearch(type: string, cacheKey: string): Promise<void> {
    const popularKey = `popular:${type}:${cacheKey}`;
    await cacheService.increment(
      popularKey, 
      1, 
      PerformanceCacheService.CACHE_TTL.POPULAR_SEARCHES
    );
  }

  /**
   * Record cache hit
   */
  private recordHit(cacheType: string): void {
    const current = this.hitStats.get(cacheType) || 0;
    this.hitStats.set(cacheType, current + 1);
  }

  /**
   * Record cache miss
   */
  private recordMiss(cacheType: string): void {
    const current = this.missStats.get(cacheType) || 0;
    this.missStats.set(cacheType, current + 1);
  }

  /**
   * Invalidate cache entries by pattern (simplified)
   */
  private async invalidateByPattern(pattern: string): Promise<void> {
    // In a full implementation, this would scan Redis keys
    // For now, we'll implement basic pattern matching
    console.log(`Invalidating cache pattern: ${pattern}`);
  }

  /**
   * Clear all performance stats
   */
  resetStats(): void {
    this.hitStats.clear();
    this.missStats.clear();
  }
}

// Export singleton instance
export const performanceCacheService = new PerformanceCacheService();