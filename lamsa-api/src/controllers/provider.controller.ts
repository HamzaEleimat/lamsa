import { Request, Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse, PaginatedResponse } from '../types';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';
import { supabase, db } from '../config/supabase';
import SecureQueryBuilder from '../utils/secure-query';

// TypeScript Interfaces
interface ProviderSearchQuery {
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

interface ProviderSearchBody {
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
}

interface ProviderUpdateData {
  business_name_ar?: string;
  business_name_en?: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    district: string;
    country: string;
  };
  latitude?: number;
  longitude?: number;
  description_ar?: string;
  description_en?: string;
  working_hours?: any;
  license_number?: string;
  license_image?: string;
}

export class ProviderController {
  /**
   * Get all providers with filters
   * GET /api/providers
   * Query params: category, lat, lng, radius, page, limit
   */
  async getAllProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        category, 
        lat, 
        lng, 
        radius = 5000, // Default 5km radius
        page = 1, 
        limit = 20 
      } = req.query as unknown as ProviderSearchQuery;
      
      // Build query
      let query = supabase.from('providers').select(`
        *,
        reviews:reviews(rating),
        services:services(count)
      `);
      
      // Apply category filter
      if (category) {
        query = query.eq('category', category);
      }
      
      // Apply location-based search if coordinates provided
      if (lat && lng) {
        // For now, we'll do a simple bounding box search
        // In production, use PostGIS functions for accurate distance calculation
        const radiusInDegrees = Number(radius) / 111000; // Rough conversion
        query = query
          .gte('latitude', Number(lat) - radiusInDegrees)
          .lte('latitude', Number(lat) + radiusInDegrees)
          .gte('longitude', Number(lng) - radiusInDegrees)
          .lte('longitude', Number(lng) + radiusInDegrees);
      }
      
      // Only active providers
      query = query.eq('status', 'active');
      
      // Pagination
      const offset = (Number(page) - 1) * Number(limit);
      query = query.range(offset, offset + Number(limit) - 1);
      
      const { data: providers, error, count } = await query;
      
      if (error) {
        console.error('Supabase getAllProviders error:', error);
        // Mock data for development if database query fails
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Using mock provider data for development');
          const mockProviders = [
            {
              id: 'mock-provider-1',
              business_name_ar: 'صالون الجمال',
              business_name_en: 'Beauty Salon',
              owner_name: 'Sarah Ahmed',
              phone: '+962777123456',
              email: 'salon@example.com',
              latitude: 31.9539,
              longitude: 35.9106,
              address: { city: 'Amman', district: 'Abdali' },
              category: 'salon',
              verified: true,
              active: true,
              reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
              services: [{ count: 8 }]
            },
            {
              id: 'mock-provider-2',
              business_name_ar: 'مركز سبا',
              business_name_en: 'Spa Center',
              owner_name: 'Layla Hassan',
              phone: '+962788123456',
              email: 'spa@example.com',
              latitude: 31.9565,
              longitude: 35.8945,
              address: { city: 'Amman', district: 'Abdoun' },
              category: 'spa',
              verified: true,
              active: true,
              reviews: [{ rating: 4 }, { rating: 4 }],
              services: [{ count: 12 }]
            }
          ];
          
          const filteredProviders = mockProviders.filter(p => 
            (!category || p.category === category) &&
            (!lat || !lng || (
              Math.abs(p.latitude - Number(lat)) < 0.1 && 
              Math.abs(p.longitude - Number(lng)) < 0.1
            ))
          );
          
          const paginatedProviders = filteredProviders.slice(
            (Number(page) - 1) * Number(limit),
            Number(page) * Number(limit)
          );
          
          const providersWithRatings = paginatedProviders.map(provider => {
            const ratings = provider.reviews?.map((r: any) => r.rating) || [];
            const avgRating = ratings.length > 0 
              ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
              : 0;
            
            return {
              ...provider,
              average_rating: Math.round(avgRating * 10) / 10,
              review_count: ratings.length,
              service_count: provider.services?.[0]?.count || 0
            };
          });
          
          const totalPages = Math.ceil(filteredProviders.length / Number(limit));
          
          const response: ApiResponse<PaginatedResponse<any>> = {
            success: true,
            data: {
              data: providersWithRatings,
              total: filteredProviders.length,
              page: Number(page),
              totalPages,
              hasNext: Number(page) < totalPages,
              hasPrev: Number(page) > 1,
            },
          };

          res.json(response);
          return;
        }
        throw new BilingualAppError('Failed to fetch providers', 500);
      }
      
      // Calculate average ratings
      const providersWithRatings = providers?.map(provider => {
        const ratings = provider.reviews?.map((r: any) => r.rating) || [];
        const avgRating = ratings.length > 0 
          ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
          : 0;
        
        return {
          ...provider,
          average_rating: Math.round(avgRating * 10) / 10,
          review_count: ratings.length,
          service_count: provider.services?.[0]?.count || 0
        };
      }) || [];
      
      const totalPages = Math.ceil((count || 0) / Number(limit));
      
      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: providersWithRatings,
          total: count || 0,
          page: Number(page),
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider by ID with services and reviews
   * GET /api/providers/:id
   */
  async getProviderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Get requester ID if authenticated
      const requesterId = (req as AuthRequest).user?.id;
      
      // Fetch provider using encrypted database service
      const { data: provider, error: providerError } = await db.providers.findById(id);
      
      if (providerError || !provider) {
        throw new BilingualAppError('Provider not found', 404);
      }
      
      // Create a mutable provider object with additional properties
      const providerWithDetails: any = { ...provider };
      
      // Fetch related data separately
      const [servicesResult, reviewsResult, availabilityResult] = await Promise.all([
        supabase
          .from('services')
          .select(`
            id,
            name_ar,
            name_en,
            description_ar,
            description_en,
            category_id,
            price,
            duration_minutes,
            active
          `)
          .eq('provider_id', id)
          .eq('active', true),
        supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            user:users(name, id)
          `)
          .eq('provider_id', id),
        supabase
          .from('availability')
          .select(`
            day_of_week,
            start_time,
            end_time,
            is_available
          `)
          .eq('provider_id', id)
      ]);
      
      // Add related data to provider object
      providerWithDetails.services = servicesResult.data || [];
      providerWithDetails.reviews = reviewsResult.data || [];
      providerWithDetails.availability = availabilityResult.data || [];
      
      // Group services by category_id
      const servicesByCategory = providerWithDetails.services?.reduce((acc: any, service: any) => {
        if (!acc[service.category_id]) {
          acc[service.category_id] = [];
        }
        acc[service.category_id].push(service);
        return acc;
      }, {}) || {};
      
      // Calculate reviews summary
      const ratings = providerWithDetails.reviews?.map((r: any) => r.rating) || [];
      const reviewsSummary = {
        average_rating: ratings.length > 0 
          ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10 
          : 0,
        total_reviews: ratings.length,
        rating_distribution: {
          5: ratings.filter((r: number) => r === 5).length,
          4: ratings.filter((r: number) => r === 4).length,
          3: ratings.filter((r: number) => r === 3).length,
          2: ratings.filter((r: number) => r === 2).length,
          1: ratings.filter((r: number) => r === 1).length,
        }
      };
      
      const response: ApiResponse = {
        success: true,
        data: {
          ...providerWithDetails,
          services_by_category: servicesByCategory,
          reviews_summary: reviewsSummary,
          reviews: providerWithDetails.reviews?.slice(0, 10) // Latest 10 reviews
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update provider profile
   * PUT /api/providers/:id
   * Only provider can update own profile
   */
  async updateProvider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: ProviderUpdateData = req.body;
      
      // Authorization is handled by middleware (validateProviderOwnership)
      
      // Handle file upload for license if provided
      if (req.file) {
        // In production, upload to cloud storage (S3, Cloudinary, etc.)
        // For now, store as base64 or file path
        updateData.license_image = req.file.buffer.toString('base64');
      }
      
      // Update provider using Supabase
      const { data: updatedProvider, error } = await supabase
        .from('providers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw new BilingualAppError('Failed to update provider profile', 500);
      }
      
      if (!updatedProvider) {
        throw new BilingualAppError('Provider not found', 404);
      }

      const response: ApiResponse = {
        success: true,
        data: updatedProvider,
        message: 'Provider profile updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search providers with advanced filters
   * POST /api/providers/search
   */
  async searchProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const searchParams: ProviderSearchBody = req.body;
      const { page = 1, limit = 20 } = req.query;
      
      let query = supabase.from('providers').select(`
        *,
        reviews:reviews(rating),
        services:services(
          id,
          name_ar,
          name_en,
          category_id,
          price
        )
      `, { count: 'exact' });
      
      // Full text search on names and services (SQL injection safe)
      if (searchParams.query) {
        // Use SecureQueryBuilder to prevent SQL injection
        const escapedTerm = SecureQueryBuilder.escapeLikePattern(
          SecureQueryBuilder.validateParam(searchParams.query, 'searchTerm')
        );
        
        query = query.or(
          `business_name_ar.ilike.%${escapedTerm}%,` +
          `business_name_en.ilike.%${escapedTerm}%,` +
          `description_ar.ilike.%${escapedTerm}%,` +
          `description_en.ilike.%${escapedTerm}%`
        );
      }
      
      // Location-based search with distance sorting
      if (searchParams.location) {
        const { lat, lng, radius = 10000 } = searchParams.location;
        
        // Simple bounding box search for now
        // In production, use PostGIS for accurate distance calculation
        const radiusInDegrees = radius / 111000;
        query = query
          .gte('latitude', lat - radiusInDegrees)
          .lte('latitude', lat + radiusInDegrees)
          .gte('longitude', lng - radiusInDegrees)
          .lte('longitude', lng + radiusInDegrees);
      }
      
      // Filter by services (using category_id)
      if (searchParams.services && searchParams.services.length > 0) {
        query = query.in('services.category_id', searchParams.services);
      }
      
      // Filter by price range
      if (searchParams.priceRange) {
        query = query
          .gte('services.price', searchParams.priceRange.min)
          .lte('services.price', searchParams.priceRange.max);
      }
      
      // Only active providers
      query = query.eq('status', 'active');
      
      // Pagination
      const offset = (Number(page) - 1) * Number(limit);
      query = query.range(offset, offset + Number(limit) - 1);
      
      const { data: providers, error, count } = await query;
      
      if (error) {
        console.error('Supabase search providers error:', error);
        throw new BilingualAppError(`Failed to search providers: ${error.message}`, 500);
      }
      
      // Process results
      const processedProviders = providers?.map(provider => {
        const ratings = provider.reviews?.map((r: any) => r.rating) || [];
        const avgRating = ratings.length > 0 
          ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
          : 0;
        
        return {
          ...provider,
          average_rating: Math.round(avgRating * 10) / 10,
          review_count: ratings.length,
          matching_services: provider.services?.filter((s: any) => 
            searchParams.services?.includes(s.category_id)
          ) || []
        };
      }) || [];
      
      const totalPages = Math.ceil((count || 0) / Number(limit));
      
      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: processedProviders,
          total: count || 0,
          page: Number(page),
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async createProvider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerData = req.body;
      
      // Create provider profile using Supabase
      const { data: newProvider, error } = await supabase
        .from('providers')
        .insert({
          ...providerData,
          user_id: req.user?.id,
          verified: false,
          active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw new BilingualAppError('Failed to create provider profile', 500);
      }

      const response: ApiResponse = {
        success: true,
        data: newProvider,
        message: 'Provider profile created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteProvider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Authorization is handled by middleware (validateProviderOwnership)
      
      // Soft delete provider
      const { error } = await supabase
        .from('providers')
        .update({ 
          active: false,
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        throw new BilingualAppError('Failed to delete provider profile', 500);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Provider profile deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProviderServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { category } = req.query;
      
      let query = supabase
        .from('services')
        .select('*')
        .eq('provider_id', id)
        .eq('active', true);
      
      if (category) {
        query = query.eq('category_id', category);
      }
      
      const { data: services, error } = await query.order('category_id', { ascending: true });
      
      if (error) {
        console.error('Supabase getProviderServices error:', error);
        throw new BilingualAppError(`Failed to fetch services: ${error.message}`, 500);
      }

      const response: ApiResponse = {
        success: true,
        data: services || [],
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProviderAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { date } = req.query;
      
      if (!date) {
        throw new BilingualAppError('Date parameter is required', 400);
      }
      
      // Fetch provider's availability and existing bookings
      // Parse date safely - handle both string and Date object
      let dayOfWeek: number;
      let dateForQuery: string;
      
      try {
        if (typeof date === 'string') {
          // If it's a string in YYYY-MM-DD format
          const [year, month, day] = date.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day);
          dayOfWeek = dateObj.getDay();
          dateForQuery = date;
        } else {
          // If it's already a Date object or needs conversion
          const dateObj = new Date(date as unknown as string);
          dayOfWeek = dateObj.getDay();
          dateForQuery = dateObj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
        }
        
        if (isNaN(dayOfWeek)) {
          throw new Error('Invalid date');
        }

        // Validate that the date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        const requestedDate = new Date(dateForQuery);
        
        if (requestedDate < today) {
          throw new BilingualAppError('Cannot check availability for past dates', 400);
        }
      } catch (error) {
        console.error('Date parsing error:', error, 'Date:', date);
        if (error instanceof BilingualAppError) {
          throw error; // Re-throw bilingual errors as-is
        }
        throw new BilingualAppError('Invalid date format. Use YYYY-MM-DD format.', 400);
      }
      
      const [availabilityResult, bookingsResult] = await Promise.all([
        supabase.from('provider_availability')
          .select('*')
          .eq('provider_id', id)
          .eq('day_of_week', dayOfWeek),
        supabase.from('bookings')
          .select('booking_date, start_time, end_time')
          .eq('provider_id', id)
          .eq('booking_date', dateForQuery)
          .in('status', ['confirmed', 'pending'])
      ]);
      
      if (availabilityResult.error || bookingsResult.error) {
        console.error('Supabase availability errors:', {
          availability: availabilityResult.error,
          bookings: bookingsResult.error
        });
        throw new BilingualAppError(`Failed to fetch availability: ${availabilityResult.error?.message || bookingsResult.error?.message}`, 500);
      }
      
      // Generate time slots based on availability and bookings
      const availability = availabilityResult.data?.[0];
      const bookings = bookingsResult.data || [];
      
      const slots = [];
      if (availability && availability.is_available) {
        const startTime = new Date(`2000-01-01 ${availability.opens_at}`);
        const endTime = new Date(`2000-01-01 ${availability.closes_at}`);
        const slotDuration = 30; // 30-minute slots
        
        for (let time = startTime; time < endTime; time.setMinutes(time.getMinutes() + slotDuration)) {
          const timeStr = time.toTimeString().slice(0, 5);
          const isBooked = bookings.some(booking => booking.start_time === timeStr);
          
          slots.push({
            time: timeStr,
            available: !isBooked
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          date,
          provider_id: id,
          slots
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProviderStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Authorization is handled by middleware (validateProviderOwnership)
      
      // Fetch provider statistics
      const [bookingsResult, reviewsResult, revenueResult] = await Promise.all([
        supabase.from('bookings')
          .select('status', { count: 'exact' })
          .eq('provider_id', id),
        supabase.from('reviews')
          .select('rating')
          .eq('provider_id', id),
        supabase.from('payments')
          .select('amount')
          .eq('provider_id', id)
          .eq('status', 'completed')
      ]);
      
      const bookings = bookingsResult.data || [];
      const reviews = reviewsResult.data || [];
      const payments = revenueResult.data || [];
      
      const stats = {
        totalBookings: bookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
        averageRating: reviews.length > 0 
          ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 
          : 0,
        totalReviews: reviews.length,
      };

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const providerController = new ProviderController();