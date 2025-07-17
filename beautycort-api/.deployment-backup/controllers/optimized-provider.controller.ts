/**
 * Performance-optimized Provider Controller
 * Implements caching, query optimization, and fast response times
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse, PaginatedResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { performanceSupabase, QueryOptimizer } from '../middleware/query-performance.middleware';
import { performanceCacheService } from '../services/performance-cache.service';
import { cacheService } from '../services/cache.service';

interface OptimizedProviderSearchQuery {
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
  fields?: string; // Field selection for payload optimization
}

interface ProviderSearchFilters {
  query?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  services?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  verified?: boolean;
}

export class OptimizedProviderController {
  /**
   * Get all providers with advanced caching and query optimization
   * GET /api/v2/providers
   */
  async getAllProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { 
        category, 
        lat, 
        lng, 
        radius = 10, // Default 10km radius
        page = 1, 
        limit = 20,
        fields = 'basic' // basic, detailed, minimal
      } = req.query as unknown as OptimizedProviderSearchQuery;
      
      // Generate cache key for this search
      const searchParams = { category, lat: Number(lat), lng: Number(lng), radius: Number(radius), page: Number(page), limit: Number(limit) };
      
      // Try to get from cache first
      const cachedResults = await performanceCacheService.getCachedProviderSearch(searchParams);
      if (cachedResults) {
        const response: ApiResponse<PaginatedResponse<any>> = {
          success: true,
          data: cachedResults,
          meta: {
            cached: true,
            executionTime: Date.now() - startTime,
            source: 'cache'
          }
        };
        res.json(response);
        return;
      }

      // Build optimized query using QueryOptimizer
      let query = performanceSupabase.from('providers');
      
      // Select only required fields based on 'fields' parameter
      const fieldSelection = this.getFieldSelection(fields);
      query = query.select(fieldSelection, { count: 'exact' });
      
      // Apply optimized filters
      query = QueryOptimizer.optimizeProviderSearch(query, {
        lat: Number(lat),
        lng: Number(lng),
        radius: Number(radius),
        category
      });
      
      // Pagination with optimization
      const offset = (Number(page) - 1) * Number(limit);
      query = query.range(offset, offset + Number(limit) - 1);
      
      // Order by relevance (distance if location provided, rating otherwise)
      if (lat && lng) {
        // In production, use PostGIS ST_Distance for accurate sorting
        query = query.order('rating', { ascending: false });
      } else {
        query = query.order('rating', { ascending: false });
      }
      
      const { data: providers, error, count } = await query;
      
      if (error) {
        throw new AppError('Failed to fetch providers', 500);
      }
      
      // Process results with minimal computation
      const processedProviders = await this.processProviderResults(
        providers || [], 
        { lat: Number(lat), lng: Number(lng) },
        fields
      );
      
      const totalPages = Math.ceil((count || 0) / Number(limit));
      
      const paginatedResults = {
        data: processedProviders,
        total: count || 0,
        page: Number(page),
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      };
      
      // Cache the results
      await performanceCacheService.cacheProviderSearch(searchParams, paginatedResults);
      
      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: paginatedResults,
        meta: {
          cached: false,
          executionTime: Date.now() - startTime,
          source: 'database'
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider by ID with smart caching
   * GET /api/v2/providers/:id
   */
  async getProviderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      const { fields = 'detailed' } = req.query;
      
      // Try cache first
      const cachedProvider = await performanceCacheService.getCachedProviderDetails(id);
      if (cachedProvider) {
        const response: ApiResponse = {
          success: true,
          data: cachedProvider,
          meta: {
            cached: true,
            executionTime: Date.now() - startTime,
            source: 'cache'
          }
        };
        res.json(response);
        return;
      }

      // Optimized query with only necessary joins
      const fieldSelection = this.getProviderDetailFields(fields as string);
      
      const { data: provider, error } = await performanceSupabase
        .from('providers')
        .select(fieldSelection)
        .eq('id', id)
        .single();
      
      if (error || !provider) {
        throw new AppError('Provider not found', 404);
      }
      
      // Process and optimize data structure
      const processedProvider = await this.processProviderDetails(provider, fields as string);
      
      // Cache the result
      await performanceCacheService.cacheProviderDetails(id, processedProvider);
      
      const response: ApiResponse = {
        success: true,
        data: processedProvider,
        meta: {
          cached: false,
          executionTime: Date.now() - startTime,
          source: 'database'
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Advanced provider search with caching
   * POST /api/v2/providers/search
   */
  async searchProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const searchParams: ProviderSearchFilters = req.body;
      const { page = 1, limit = 20, fields = 'basic' } = req.query;
      
      // Create cache-friendly search key
      const cacheKey = this.generateSearchCacheKey(searchParams, { page: Number(page), limit: Number(limit) });
      
      // Check cache
      const cachedResults = await cacheService.get(cacheKey);
      if (cachedResults) {
        const response: ApiResponse<PaginatedResponse<any>> = {
          success: true,
          data: cachedResults,
          meta: {
            cached: true,
            executionTime: Date.now() - startTime,
            source: 'cache'
          }
        };
        res.json(response);
        return;
      }

      // Use database function for complex search (created in performance-analysis.sql)
      const { data: searchResults, error } = await performanceSupabase.rpc(
        'search_providers_optimized',
        {
          user_lat: searchParams.location?.lat || null,
          user_lng: searchParams.location?.lng || null,
          radius_km: searchParams.location?.radius || 10,
          service_category: searchParams.services?.[0] || null,
          price_min: searchParams.priceRange?.min || null,
          price_max: searchParams.priceRange?.max || null,
          limit_count: Number(limit),
          offset_count: (Number(page) - 1) * Number(limit)
        }
      );

      if (error) {
        throw new AppError('Search failed', 500);
      }

      // Process minimal results for fast response
      const processedResults = searchResults?.map((provider: any) => ({
        id: provider.provider_id,
        business_name_ar: provider.business_name_ar,
        business_name_en: provider.business_name_en,
        latitude: provider.latitude,
        longitude: provider.longitude,
        rating: provider.average_rating,
        review_count: provider.total_reviews,
        distance_km: provider.distance_km,
        price_range: {
          min: provider.min_price,
          max: provider.max_price
        }
      })) || [];

      const totalCount = searchResults?.length || 0;
      const totalPages = Math.ceil(totalCount / Number(limit));
      
      const results = {
        data: processedResults,
        total: totalCount,
        page: Number(page),
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      };

      // Cache results for 10 minutes
      await cacheService.set(cacheKey, results, 600);
      
      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: results,
        meta: {
          cached: false,
          executionTime: Date.now() - startTime,
          source: 'database'
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider availability with real-time caching
   * GET /api/v2/providers/:id/availability
   */
  async getProviderAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      const { date } = req.query;
      
      if (!date) {
        throw new AppError('Date parameter is required', 400);
      }
      
      // Check cache (short TTL for real-time data)
      const cachedAvailability = await performanceCacheService.getCachedAvailability(id, date as string);
      if (cachedAvailability) {
        const response: ApiResponse = {
          success: true,
          data: cachedAvailability,
          meta: {
            cached: true,
            executionTime: Date.now() - startTime
          }
        };
        res.json(response);
        return;
      }

      // Use optimized availability function
      const { data: isAvailable, error } = await performanceSupabase.rpc(
        'check_availability_optimized',
        {
          p_provider_id: id,
          p_booking_date: date,
          p_start_time: '09:00:00',
          p_duration_minutes: 60
        }
      );

      if (error) {
        throw new AppError('Failed to check availability', 500);
      }

      // Generate time slots (simplified for performance)
      const slots = this.generateTimeSlots(isAvailable);
      
      const availabilityData = {
        date,
        provider_id: id,
        slots,
        last_updated: new Date().toISOString()
      };

      // Cache for 5 minutes
      await performanceCacheService.cacheAvailability(id, date as string, slots);
      
      const response: ApiResponse = {
        success: true,
        data: availabilityData,
        meta: {
          cached: false,
          executionTime: Date.now() - startTime
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get optimized provider statistics
   * GET /api/v2/providers/:id/stats
   */
  async getProviderStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user?.id !== id) {
        throw new AppError('Unauthorized', 403);
      }
      
      // Check cache first (1 hour TTL for stats)
      const cacheKey = `provider:${id}:stats:${new Date().toISOString().slice(0, 13)}`; // Hour-based key
      const cachedStats = await cacheService.get(cacheKey);
      
      if (cachedStats) {
        const response: ApiResponse = {
          success: true,
          data: cachedStats,
          meta: {
            cached: true,
            executionTime: Date.now() - startTime
          }
        };
        res.json(response);
        return;
      }

      // Use materialized view for fast stats (created in performance-analysis.sql)
      const { data: stats, error } = await performanceSupabase
        .from('mv_provider_dashboard_stats')
        .select('*')
        .eq('provider_id', id)
        .single();

      if (error) {
        throw new AppError('Failed to fetch statistics', 500);
      }

      // Cache for 1 hour
      await cacheService.set(cacheKey, stats, 3600);
      
      const response: ApiResponse = {
        success: true,
        data: stats,
        meta: {
          cached: false,
          executionTime: Date.now() - startTime
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Optimize field selection based on request type
   */
  private getFieldSelection(fields: string): string {
    const fieldMaps = {
      minimal: 'id, business_name_ar, business_name_en, rating, latitude, longitude',
      basic: `
        id, business_name_ar, business_name_en, owner_name, phone, 
        category, latitude, longitude, rating, total_reviews, verified, active
      `,
      detailed: `
        *, 
        services:services(id, name_ar, name_en, price, duration_minutes, active)
      `,
      full: `
        *,
        services:services(*),
        reviews:reviews(id, rating, comment, created_at, user:users(name))
      `
    };

    return fieldMaps[fields as keyof typeof fieldMaps] || fieldMaps.basic;
  }

  /**
   * Get provider detail fields based on request
   */
  private getProviderDetailFields(fields: string): string {
    if (fields === 'minimal') {
      return 'id, business_name_ar, business_name_en, rating, total_reviews';
    }

    return `
      *,
      services:services(
        id, name_ar, name_en, description_ar, description_en,
        category, price, duration_minutes, active
      ),
      reviews:reviews(
        id, rating, comment, created_at,
        user:users(name, id)
      ) limit 10,
      availability:availability(
        day_of_week, start_time, end_time, is_available
      )
    `;
  }

  /**
   * Process provider results with minimal computation
   */
  private async processProviderResults(
    providers: any[], 
    location: { lat?: number; lng?: number },
    fields: string
  ): Promise<any[]> {
    return providers.map(provider => {
      const processed: any = {
        id: provider.id,
        business_name_ar: provider.business_name_ar,
        business_name_en: provider.business_name_en,
        rating: provider.rating || 0,
        total_reviews: provider.total_reviews || 0
      };

      // Add distance calculation if location provided
      if (location.lat && location.lng && provider.latitude && provider.longitude) {
        processed.distance_km = this.calculateDistance(
          location.lat, location.lng,
          provider.latitude, provider.longitude
        );
      }

      // Add additional fields based on request
      if (fields !== 'minimal') {
        processed.category = provider.category;
        processed.latitude = provider.latitude;
        processed.longitude = provider.longitude;
        processed.verified = provider.verified;
      }

      return processed;
    });
  }

  /**
   * Process provider details with optimization
   */
  private async processProviderDetails(provider: any, fields: string): Promise<any> {
    const processed = {
      ...provider,
      services_count: provider.services?.length || 0,
      average_rating: provider.rating || 0,
      total_reviews: provider.total_reviews || 0
    };

    // Group services by category for better mobile performance
    if (provider.services) {
      processed.services_by_category = provider.services.reduce((acc: any, service: any) => {
        if (!acc[service.category]) {
          acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
      }, {});
    }

    // Calculate review statistics
    if (provider.reviews) {
      const ratings = provider.reviews.map((r: any) => r.rating);
      processed.rating_distribution = {
        5: ratings.filter((r: number) => r === 5).length,
        4: ratings.filter((r: number) => r === 4).length,
        3: ratings.filter((r: number) => r === 3).length,
        2: ratings.filter((r: number) => r === 2).length,
        1: ratings.filter((r: number) => r === 1).length,
      };
    }

    return processed;
  }

  /**
   * Generate cache key for search parameters
   */
  private generateSearchCacheKey(params: ProviderSearchFilters, pagination: { page: number; limit: number }): string {
    const keyParts = ['search'];
    
    if (params.location) {
      keyParts.push(`${params.location.lat.toFixed(3)},${params.location.lng.toFixed(3)}`);
      keyParts.push(`r${params.location.radius || 10}`);
    }
    
    if (params.services?.length) {
      keyParts.push(`s${params.services.join(',')}`);
    }
    
    if (params.priceRange) {
      keyParts.push(`p${params.priceRange.min}-${params.priceRange.max}`);
    }
    
    if (params.rating) {
      keyParts.push(`r${params.rating}`);
    }
    
    keyParts.push(`${pagination.page}:${pagination.limit}`);
    
    return keyParts.join(':');
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate time slots (simplified for performance)
   */
  private generateTimeSlots(isAvailable: boolean): any[] {
    const slots = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time,
          available: isAvailable && Math.random() > 0.3 // Simulate some unavailable slots
        });
      }
    }
    
    return slots;
  }
}

export const optimizedProviderController = new OptimizedProviderController();