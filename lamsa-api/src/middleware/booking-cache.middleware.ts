/**
 * Booking Cache Middleware
 * Implements request caching for read operations to improve performance
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  userRole?: string;
  userId?: string;
}

// In-memory cache store (in production, use Redis)
const cacheStore = new Map<string, CacheEntry>();

// Cache configuration
export const CACHE_CONFIG = {
  // Cache TTL in milliseconds
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  SHORT_TTL: 1 * 60 * 1000,   // 1 minute
  LONG_TTL: 15 * 60 * 1000,   // 15 minutes
  
  // Cache size limits
  MAX_CACHE_SIZE: 1000,
  
  // Endpoints that should be cached
  CACHEABLE_ENDPOINTS: [
    '/api/bookings/search',
    '/api/bookings/analytics/stats',
    '/api/bookings/dashboard',
    '/api/bookings/reminders',
    '/api/bookings/user',
    '/api/bookings/provider'
  ]
};

/**
 * Cache middleware for GET requests
 */
export const bookingCacheMiddleware = (ttl: number = CACHE_CONFIG.DEFAULT_TTL) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if endpoint is cacheable
    const isCacheable = CACHE_CONFIG.CACHEABLE_ENDPOINTS.some(endpoint => 
      req.path.startsWith(endpoint.replace('/api/bookings', ''))
    );

    if (!isCacheable) {
      return next();
    }

    // Generate cache key
    const cacheKey = generateCacheKey(req);
    
    // Check cache
    const cachedEntry = cacheStore.get(cacheKey);
    
    if (cachedEntry && !isCacheExpired(cachedEntry)) {
      // Cache hit - return cached data
      console.log(`📋 Cache HIT: ${cacheKey}`);
      
      res.setHeader('X-Cache-Status', 'HIT');
      res.setHeader('X-Cache-Age', Math.floor((Date.now() - cachedEntry.timestamp) / 1000));
      
      res.json(cachedEntry.data);
      return;
    }

    // Cache miss - continue to controller
    console.log(`📋 Cache MISS: ${cacheKey}`);
    res.setHeader('X-Cache-Status', 'MISS');

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCacheEntry(cacheKey, data, ttl, req.user?.role, req.user?.id);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Cache invalidation middleware for write operations
 */
export const bookingCacheInvalidator = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Only process write operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    // Override res.json to invalidate cache after successful write
    const originalJson = res.json;
    res.json = function(data: any) {
      // Invalidate cache on successful write operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateUserCache(req.user?.id, req.user?.role);
        invalidateEndpointCache(req.path);
      }
      
      return originalJson.call(this, data);
    };
  }

  next();
};

/**
 * Cache warming middleware for frequently accessed data
 */
export const bookingCacheWarmer = {
  /**
   * Warm up cache with user's booking data
   */
  warmUserCache: async (userId: string, userRole: string): Promise<void> => {
    try {
      // TODO: Implement cache warming logic
      // This would pre-fetch and cache frequently accessed user data
      console.log(`🔥 Warming cache for user ${userId} (${userRole})`);
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  },

  /**
   * Warm up cache with popular booking data
   */
  warmPopularCache: async (): Promise<void> => {
    try {
      // TODO: Implement popular data caching
      // This would pre-fetch and cache popular providers, services, etc.
      console.log('🔥 Warming popular booking cache');
    } catch (error) {
      console.error('Popular cache warming failed:', error);
    }
  }
};

/**
 * Cache statistics and management
 */
export const bookingCacheManager = {
  /**
   * Get cache statistics
   */
  getStats: () => {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;
    
    cacheStore.forEach((entry, key) => {
      if (isCacheExpired(entry)) {
        expiredEntries++;
      } else {
        activeEntries++;
      }
      totalSize += JSON.stringify(entry).length;
    });

    return {
      totalEntries: cacheStore.size,
      activeEntries,
      expiredEntries,
      totalSize,
      hitRate: getCacheHitRate(),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Clear all cache entries
   */
  clearAll: () => {
    cacheStore.clear();
    resetCacheMetrics();
    console.log('🧹 Cache cleared');
  },

  /**
   * Clear expired cache entries
   */
  clearExpired: () => {
    const now = Date.now();
    let clearedCount = 0;
    
    cacheStore.forEach((entry, key) => {
      if (isCacheExpired(entry)) {
        cacheStore.delete(key);
        clearedCount++;
      }
    });

    console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
    return clearedCount;
  },

  /**
   * Enforce cache size limits
   */
  enforceSizeLimit: () => {
    if (cacheStore.size <= CACHE_CONFIG.MAX_CACHE_SIZE) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(cacheStore.entries()).sort((a, b) => 
      a[1].timestamp - b[1].timestamp
    );

    const toRemove = entries.slice(0, entries.length - CACHE_CONFIG.MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => cacheStore.delete(key));

    console.log(`🧹 Removed ${toRemove.length} cache entries to enforce size limit`);
  }
};

// Cache metrics
let cacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0
};

// Helper functions

function generateCacheKey(req: AuthRequest): string {
  const baseKey = `${req.method}:${req.path}`;
  const queryString = new URLSearchParams(req.query as any).toString();
  const userContext = `${req.user?.role}:${req.user?.id}`;
  
  return `booking:${baseKey}:${queryString}:${userContext}`;
}

function isCacheExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

function setCacheEntry(key: string, data: any, ttl: number, userRole?: string, userId?: string): void {
  // Enforce cache size limit before adding new entry
  if (cacheStore.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
    bookingCacheManager.enforceSizeLimit();
  }

  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
    ttl,
    userRole,
    userId
  };

  cacheStore.set(key, entry);
  cacheMetrics.sets++;
  
  console.log(`📋 Cache SET: ${key} (TTL: ${ttl}ms)`);
}

function invalidateUserCache(userId?: string, userRole?: string): void {
  if (!userId) return;

  let invalidatedCount = 0;
  
  cacheStore.forEach((entry, key) => {
    if (entry.userId === userId || entry.userRole === userRole) {
      cacheStore.delete(key);
      invalidatedCount++;
    }
  });

  cacheMetrics.invalidations += invalidatedCount;
  console.log(`🧹 Invalidated ${invalidatedCount} cache entries for user ${userId}`);
}

function invalidateEndpointCache(path: string): void {
  let invalidatedCount = 0;
  
  cacheStore.forEach((entry, key) => {
    if (key.includes(path)) {
      cacheStore.delete(key);
      invalidatedCount++;
    }
  });

  cacheMetrics.invalidations += invalidatedCount;
  console.log(`🧹 Invalidated ${invalidatedCount} cache entries for endpoint ${path}`);
}

function getCacheHitRate(): number {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  return total > 0 ? (cacheMetrics.hits / total) * 100 : 0;
}

function resetCacheMetrics(): void {
  cacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0
  };
}

// Periodic cache cleanup
setInterval(() => {
  bookingCacheManager.clearExpired();
}, 5 * 60 * 1000); // Clean up every 5 minutes

export default {
  bookingCacheMiddleware,
  bookingCacheInvalidator,
  bookingCacheWarmer,
  bookingCacheManager,
  CACHE_CONFIG
};