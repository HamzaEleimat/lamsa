import { createClient, RedisClientType } from 'redis';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
  ttl: number; // Time to live in seconds
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private client: RedisClientType | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private useRedis: boolean = false;
  private defaultTTL: number = 300; // 5 minutes

  constructor(config?: CacheConfig) {
    if (config && process.env.REDIS_URL) {
      this.useRedis = true;
      this.defaultTTL = config.ttl || 300;
      this.initializeRedis(config);
    } else {
      console.log('Redis not configured, using in-memory cache');
      this.startMemoryCacheCleanup();
    }
  }

  private async initializeRedis(config: CacheConfig): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || `redis://${config.host}:${config.port}`,
        password: config.password,
        database: config.database || 0
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.useRedis = false;
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis cache');
      });

      this.client.on('disconnect', () => {
        console.log('Disconnected from Redis cache');
        this.useRedis = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.useRedis = false;
    }
  }

  private startMemoryCacheCleanup(): void {
    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp > entry.ttl * 1000) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000);
  }

  // Set cache entry
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.defaultTTL;
    
    if (this.useRedis && this.client) {
      try {
        await this.client.setEx(key, actualTTL, JSON.stringify(value));
      } catch (error) {
        console.error('Redis set error:', error);
        this.setMemoryCache(key, value, actualTTL);
      }
    } else {
      this.setMemoryCache(key, value, actualTTL);
    }
  }

  private setMemoryCache<T>(key: string, value: T, ttl: number): void {
    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    });
  }

  // Get cache entry
  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && this.client) {
      try {
        const result = await this.client.get(key);
        return result ? JSON.parse(result) : null;
      } catch (error) {
        console.error('Redis get error:', error);
        return this.getMemoryCache<T>(key);
      }
    } else {
      return this.getMemoryCache<T>(key);
    }
  }

  private getMemoryCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Delete cache entry
  async delete(key: string): Promise<void> {
    if (this.useRedis && this.client) {
      try {
        await this.client.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }
    this.memoryCache.delete(key);
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (this.useRedis && this.client) {
      try {
        return (await this.client.exists(key)) > 0;
      } catch (error) {
        console.error('Redis exists error:', error);
        return this.memoryCache.has(key);
      }
    } else {
      return this.memoryCache.has(key);
    }
  }

  // Get multiple keys
  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    
    if (this.useRedis && this.client && keys.length > 0) {
      try {
        const values = await this.client.mGet(keys);
        keys.forEach((key, index) => {
          result[key] = values[index] ? JSON.parse(values[index]!) : null;
        });
        return result;
      } catch (error) {
        console.error('Redis mGet error:', error);
      }
    }

    // Fallback to memory cache
    for (const key of keys) {
      result[key] = this.getMemoryCache<T>(key);
    }
    
    return result;
  }

  // Set multiple keys
  async setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.defaultTTL;
    
    if (this.useRedis && this.client) {
      try {
        const pipeline = this.client.multi();
        Object.entries(entries).forEach(([key, value]) => {
          pipeline.setEx(key, actualTTL, JSON.stringify(value));
        });
        await pipeline.exec();
        return;
      } catch (error) {
        console.error('Redis mSet error:', error);
      }
    }

    // Fallback to memory cache
    Object.entries(entries).forEach(([key, value]) => {
      this.setMemoryCache(key, value, actualTTL);
    });
  }

  // Clear all cache entries
  async clear(): Promise<void> {
    if (this.useRedis && this.client) {
      try {
        await this.client.flushDb();
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
    this.memoryCache.clear();
  }

  // Get cache statistics
  async getStats(): Promise<{
    type: 'redis' | 'memory';
    totalKeys: number;
    memoryUsage?: string;
    uptime?: number;
  }> {
    if (this.useRedis && this.client) {
      try {
        const info = await this.client.info('memory');
        const keyCount = await this.client.dbSize();
        
        return {
          type: 'redis',
          totalKeys: keyCount,
          memoryUsage: this.parseRedisMemoryUsage(info),
          uptime: this.parseRedisUptime(info)
        };
      } catch (error) {
        console.error('Redis stats error:', error);
      }
    }

    return {
      type: 'memory',
      totalKeys: this.memoryCache.size,
      memoryUsage: `${(JSON.stringify([...this.memoryCache.values()]).length / 1024).toFixed(2)} KB`
    };
  }

  private parseRedisMemoryUsage(info: string): string {
    const match = info.match(/used_memory_human:(.+)/);
    return match ? match[1].trim() : 'Unknown';
  }

  private parseRedisUptime(info: string): number {
    const match = info.match(/uptime_in_seconds:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Increment a counter
  async increment(key: string, amount: number = 1, ttl?: number): Promise<number> {
    if (this.useRedis && this.client) {
      try {
        const result = await this.client.incrBy(key, amount);
        if (ttl) {
          await this.client.expire(key, ttl);
        }
        return result;
      } catch (error) {
        console.error('Redis increment error:', error);
      }
    }

    // Memory cache fallback
    const current = this.getMemoryCache<number>(key) || 0;
    const newValue = current + amount;
    this.setMemoryCache(key, newValue, ttl || this.defaultTTL);
    return newValue;
  }

  // Get cache hit/miss statistics
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0
  };

  async getHitMissStats(): Promise<typeof this.stats> {
    return { ...this.stats };
  }

  // Reset statistics
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  // Disconnect from cache
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Redis:', error);
      }
    }
    this.memoryCache.clear();
  }

  // Cache decorator for methods
  cached<T>(keyGenerator: (...args: any[]) => string, ttl?: number) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      
      descriptor.value = async function (...args: any[]): Promise<T> {
        const cacheKey = keyGenerator(...args);
        
        // Try to get from cache first
        let cached = await cacheService.get<T>(cacheKey);
        if (cached !== null) {
          cacheService.stats.hits++;
          return cached;
        }

        // Execute original method
        const result = await method.apply(this, args);
        
        // Cache the result
        await cacheService.set(cacheKey, result, ttl);
        cacheService.stats.misses++;
        cacheService.stats.sets++;
        
        return result;
      };
    };
  }
}

// Create singleton instance
export const cacheService = new CacheService({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  ttl: parseInt(process.env.CACHE_TTL || '300')
});

// Cache key builders for different data types
export class CacheKeys {
  static dashboard(providerId: string, date?: string): string {
    return `dashboard:${providerId}:${date || 'today'}`;
  }

  static analytics(providerId: string, period: string, startDate: string): string {
    return `analytics:${providerId}:${period}:${startDate}`;
  }

  static revenue(providerId: string, period: string, startDate: string): string {
    return `revenue:${providerId}:${period}:${startDate}`;
  }

  static customer(providerId: string, type: string): string {
    return `customer:${providerId}:${type}`;
  }

  static reviews(providerId: string, filters: string): string {
    return `reviews:${providerId}:${filters}`;
  }

  static gamification(providerId: string, type: string): string {
    return `gamification:${providerId}:${type}`;
  }

  static insights(providerId: string): string {
    return `insights:${providerId}`;
  }

  static marketIntelligence(providerId: string): string {
    return `market:${providerId}`;
  }

  static predictions(providerId: string): string {
    return `predictions:${providerId}`;
  }

  static provider(providerId: string): string {
    return `provider:${providerId}`;
  }

  static service(serviceId: string): string {
    return `service:${serviceId}`;
  }

  static booking(bookingId: string): string {
    return `booking:${bookingId}`;
  }
}