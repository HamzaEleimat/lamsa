/**
 * Query Result Caching Service
 * Implements intelligent caching for frequent database queries to improve performance
 */

import { createHash } from 'crypto';
import { supabase } from '../config/supabase-simple';
import { AppError } from '../middleware/error.middleware';

interface CacheEntry {
    key: string;
    data: any;
    timestamp: number;
    ttl: number;
    hits: number;
    tags: string[];
}

interface CacheStats {
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    memoryUsage: number;
    entriesCount: number;
}

interface CacheOptions {
    ttl?: number; // Time to live in seconds
    tags?: string[]; // Tags for cache invalidation
    compress?: boolean; // Whether to compress large results
    refreshBackground?: boolean; // Whether to refresh in background before expiry
}

class QueryCacheService {
    private cache: Map<string, CacheEntry> = new Map();
    private stats: CacheStats = {
        totalQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        memoryUsage: 0,
        entriesCount: 0
    };

    // Default TTL values for different query types (in seconds)
    private readonly defaultTTL = {
        // Real-time data - short TTL
        availability: 30,
        upcomingBookings: 60,
        providerStatus: 30,
        
        // Frequently changing data - medium TTL
        bookingList: 300, // 5 minutes
        userBookings: 300,
        dashboardData: 300,
        
        // Analytics data - long TTL
        analytics: 1800, // 30 minutes
        reports: 3600, // 1 hour
        statistics: 7200, // 2 hours
        
        // Rarely changing data - very long TTL
        providerProfile: 3600,
        serviceDetails: 3600,
        categoryList: 7200
    };

    private readonly maxCacheSize = 1000; // Maximum number of cache entries
    private readonly maxMemoryUsage = 100 * 1024 * 1024; // 100MB

    constructor() {
        // Set up periodic cleanup
        setInterval(() => this.cleanup(), 60000); // Clean up every minute
        
        // Set up stats update
        setInterval(() => this.updateStats(), 5000); // Update stats every 5 seconds
    }

    /**
     * Generate cache key from query parameters
     */
    private generateCacheKey(queryName: string, params: any): string {
        const paramsString = JSON.stringify(params, Object.keys(params).sort());
        const hash = createHash('sha256').update(paramsString).digest('hex').substring(0, 16);
        return `${queryName}_${hash}`;
    }

    /**
     * Get data from cache or execute query
     */
    async get<T>(
        queryName: string,
        queryFunction: () => Promise<T>,
        params: any = {},
        options: CacheOptions = {}
    ): Promise<T> {
        const cacheKey = this.generateCacheKey(queryName, params);
        const ttl = options.ttl || this.defaultTTL[queryName as keyof typeof this.defaultTTL] || 300;
        
        this.stats.totalQueries++;
        
        // Check cache first
        const cachedEntry = this.cache.get(cacheKey);
        if (cachedEntry && this.isValidCacheEntry(cachedEntry)) {
            cachedEntry.hits++;
            this.stats.cacheHits++;
            
            // Background refresh if close to expiry
            if (options.refreshBackground && this.shouldRefreshBackground(cachedEntry)) {
                this.refreshBackground(cacheKey, queryFunction, params, options);
            }
            
            return cachedEntry.data;
        }

        // Cache miss - execute query
        this.stats.cacheMisses++;
        
        try {
            const startTime = Date.now();
            const result = await queryFunction();
            const executionTime = Date.now() - startTime;
            
            // Store in cache
            const cacheEntry: CacheEntry = {
                key: cacheKey,
                data: result,
                timestamp: Date.now(),
                ttl: ttl * 1000, // Convert to milliseconds
                hits: 1,
                tags: options.tags || [queryName]
            };
            
            this.cache.set(cacheKey, cacheEntry);
            
            // Log performance
            this.logCachePerformance(queryName, executionTime, 'MISS');
            
            return result;
            
        } catch (error) {
            console.error(`Query cache error for ${queryName}:`, error);
            throw error;
        }
    }

    /**
     * Cached booking queries
     */
    async getProviderBookings(
        providerId: string,
        filters: any = {},
        options: CacheOptions = {}
    ) {
        return this.get(
            'bookingList',
            async () => {
                const { data: bookings, error } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        users:user_id(name, phone),
                        providers:provider_id(business_name_en, business_name_ar),
                        services:service_id(name_en, name_ar, duration_minutes)
                    `)
                    .eq('provider_id', providerId)
                    .order('booking_date', { ascending: false })
                    .order('start_time', { ascending: false })
                    .limit(filters.limit || 20);
                
                if (error) throw error;
                return bookings;
            },
            { providerId, ...filters },
            { ttl: 300, tags: ['bookings', `provider:${providerId}`], ...options }
        );
    }

    async getUserBookings(
        userId: string,
        filters: any = {},
        options: CacheOptions = {}
    ) {
        return this.get(
            'userBookings',
            async () => {
                const { data: bookings, error } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        providers:provider_id(business_name_en, business_name_ar),
                        services:service_id(name_en, name_ar, duration_minutes)
                    `)
                    .eq('user_id', userId)
                    .order('booking_date', { ascending: false })
                    .limit(filters.limit || 20);
                
                if (error) throw error;
                return bookings;
            },
            { userId, ...filters },
            { ttl: 300, tags: ['bookings', `user:${userId}`], ...options }
        );
    }

    async getAvailabilitySlots(
        providerId: string,
        date: string,
        serviceId?: string,
        options: CacheOptions = {}
    ) {
        return this.get(
            'availability',
            async () => {
                // This would call the availability service
                // For now, placeholder implementation
                const { data: slots, error } = await supabase
                    .from('availability_slots')
                    .select('*')
                    .eq('provider_id', providerId)
                    .eq('slot_date', date)
                    .eq('available', true);
                
                if (error) throw error;
                return slots;
            },
            { providerId, date, serviceId },
            { ttl: 30, tags: ['availability', `provider:${providerId}`], ...options }
        );
    }

    async getProviderDashboard(
        providerId: string,
        period: string = 'week',
        options: CacheOptions = {}
    ) {
        return this.get(
            'dashboardData',
            async () => {
                // Get from materialized view if available
                const { data: dashboard, error } = await supabase
                    .from('provider_performance_dashboard')
                    .select('*')
                    .eq('provider_id', providerId)
                    .single();
                
                if (error) throw error;
                return dashboard;
            },
            { providerId, period },
            { ttl: 300, tags: ['dashboard', `provider:${providerId}`], ...options }
        );
    }

    async getBookingAnalytics(
        providerId: string,
        dateRange: { from: string; to: string },
        options: CacheOptions = {}
    ) {
        return this.get(
            'analytics',
            async () => {
                const { data: analytics, error } = await supabase.rpc(
                    'get_booking_analytics_optimized',
                    {
                        p_provider_id: providerId,
                        p_date_from: dateRange.from,
                        p_date_to: dateRange.to,
                        p_group_by: 'day'
                    }
                );
                
                if (error) throw error;
                return analytics;
            },
            { providerId, dateRange },
            { ttl: 1800, tags: ['analytics', `provider:${providerId}`], ...options }
        );
    }

    async getProviderProfile(
        providerId: string,
        options: CacheOptions = {}
    ) {
        return this.get(
            'providerProfile',
            async () => {
                const { data: provider, error } = await supabase
                    .from('providers')
                    .select(`
                        *,
                        services:services(*)
                    `)
                    .eq('id', providerId)
                    .single();
                
                if (error) throw error;
                return provider;
            },
            { providerId },
            { ttl: 3600, tags: ['provider', `provider:${providerId}`], ...options }
        );
    }

    async getServiceDetails(
        serviceId: string,
        options: CacheOptions = {}
    ) {
        return this.get(
            'serviceDetails',
            async () => {
                const { data: service, error } = await supabase
                    .from('services')
                    .select(`
                        *,
                        providers:provider_id(business_name_en, business_name_ar),
                        service_categories:category_id(name_en, name_ar)
                    `)
                    .eq('id', serviceId)
                    .single();
                
                if (error) throw error;
                return service;
            },
            { serviceId },
            { ttl: 3600, tags: ['service', `service:${serviceId}`], ...options }
        );
    }

    /**
     * Invalidate cache entries by tags
     */
    invalidate(tags: string[]): number {
        let invalidatedCount = 0;
        
        for (const [key, entry] of this.cache) {
            if (tags.some(tag => entry.tags.includes(tag))) {
                this.cache.delete(key);
                invalidatedCount++;
            }
        }
        
        console.log(`Cache invalidated: ${invalidatedCount} entries for tags: ${tags.join(', ')}`);
        return invalidatedCount;
    }

    /**
     * Invalidate cache when bookings change
     */
    invalidateBookingCache(bookingData: any) {
        const tagsToInvalidate = [
            'bookings',
            'availability',
            'dashboard',
            `provider:${bookingData.providerId}`,
            `user:${bookingData.userId}`
        ];
        
        if (bookingData.serviceId) {
            tagsToInvalidate.push(`service:${bookingData.serviceId}`);
        }
        
        this.invalidate(tagsToInvalidate);
    }

    /**
     * Invalidate cache when provider data changes
     */
    invalidateProviderCache(providerId: string) {
        this.invalidate([
            'provider',
            'availability',
            'dashboard',
            `provider:${providerId}`
        ]);
    }

    /**
     * Check if cache entry is still valid
     */
    private isValidCacheEntry(entry: CacheEntry): boolean {
        return (Date.now() - entry.timestamp) < entry.ttl;
    }

    /**
     * Check if entry should be refreshed in background
     */
    private shouldRefreshBackground(entry: CacheEntry): boolean {
        const age = Date.now() - entry.timestamp;
        const refreshThreshold = entry.ttl * 0.8; // Refresh when 80% of TTL elapsed
        return age > refreshThreshold;
    }

    /**
     * Refresh cache entry in background
     */
    private async refreshBackground(
        cacheKey: string,
        queryFunction: () => Promise<any>,
        params: any,
        options: CacheOptions
    ) {
        try {
            const result = await queryFunction();
            const ttl = options.ttl || 300;
            
            const cacheEntry: CacheEntry = {
                key: cacheKey,
                data: result,
                timestamp: Date.now(),
                ttl: ttl * 1000,
                hits: 1,
                tags: options.tags || []
            };
            
            this.cache.set(cacheKey, cacheEntry);
            console.log(`Background refresh completed for ${cacheKey}`);
            
        } catch (error) {
            console.error(`Background refresh failed for ${cacheKey}:`, error);
        }
    }

    /**
     * Clean up expired entries
     */
    private cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, entry] of this.cache) {
            if (!this.isValidCacheEntry(entry)) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        // Also clean up if cache is too large
        if (this.cache.size > this.maxCacheSize) {
            const sortedEntries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toDelete = sortedEntries.slice(0, this.cache.size - this.maxCacheSize);
            toDelete.forEach(([key]) => {
                this.cache.delete(key);
                cleanedCount++;
            });
        }
        
        if (cleanedCount > 0) {
            console.log(`Cache cleanup: ${cleanedCount} entries removed`);
        }
    }

    /**
     * Update cache statistics
     */
    private updateStats() {
        this.stats.entriesCount = this.cache.size;
        this.stats.hitRate = this.stats.totalQueries > 0 ? 
            (this.stats.cacheHits / this.stats.totalQueries) * 100 : 0;
        
        // Calculate memory usage (approximate)
        this.stats.memoryUsage = Array.from(this.cache.values())
            .reduce((total, entry) => total + JSON.stringify(entry.data).length, 0);
    }

    /**
     * Log cache performance
     */
    private logCachePerformance(queryName: string, executionTime: number, type: 'HIT' | 'MISS') {
        // Log to optimization schema if available
        supabase.rpc('log_query_performance', {
            p_query_type: 'cached_query',
            p_operation: `${queryName}_${type}`,
            p_execution_time_ms: executionTime,
            p_rows_affected: 1,
            p_index_used: type === 'HIT' ? 'cache' : 'database'
        }).catch(error => {
            // Ignore logging errors
        });
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats = {
            totalQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            memoryUsage: 0,
            entriesCount: 0
        };
        console.log('Cache cleared');
    }

    /**
     * Get cache entry details
     */
    getCacheInfo(): Array<{
        key: string;
        tags: string[];
        hits: number;
        age: number;
        ttl: number;
        size: number;
    }> {
        const now = Date.now();
        return Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            tags: entry.tags,
            hits: entry.hits,
            age: now - entry.timestamp,
            ttl: entry.ttl,
            size: JSON.stringify(entry.data).length
        }));
    }

    /**
     * Warm up cache with frequently accessed data
     */
    async warmUp(providerIds: string[], userIds: string[]) {
        console.log('Warming up cache...');
        
        const promises = [];
        
        // Warm up provider profiles
        for (const providerId of providerIds.slice(0, 10)) {
            promises.push(this.getProviderProfile(providerId));
        }
        
        // Warm up recent bookings
        for (const providerId of providerIds.slice(0, 5)) {
            promises.push(this.getProviderBookings(providerId));
        }
        
        // Warm up user bookings
        for (const userId of userIds.slice(0, 5)) {
            promises.push(this.getUserBookings(userId));
        }
        
        await Promise.allSettled(promises);
        console.log(`Cache warmed up with ${promises.length} queries`);
    }
}

// Export singleton instance
export const queryCacheService = new QueryCacheService();

// Export cache invalidation hooks for use in controllers
export const cacheInvalidationHooks = {
    onBookingCreated: (bookingData: any) => queryCacheService.invalidateBookingCache(bookingData),
    onBookingUpdated: (bookingData: any) => queryCacheService.invalidateBookingCache(bookingData),
    onBookingDeleted: (bookingData: any) => queryCacheService.invalidateBookingCache(bookingData),
    onProviderUpdated: (providerId: string) => queryCacheService.invalidateProviderCache(providerId),
    onServiceUpdated: (serviceId: string) => queryCacheService.invalidate([`service:${serviceId}`])
};

export default queryCacheService;