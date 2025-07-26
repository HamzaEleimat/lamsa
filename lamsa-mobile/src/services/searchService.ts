import { supabase } from './supabase';

export interface SearchFilters {
  category_id?: string;
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  gender_preference?: 'MALE' | 'FEMALE' | 'ANY';
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  availability?: {
    date: string;
    time: string;
  };
  tags?: string[];
  sort_by?: 'distance' | 'rating' | 'price_low' | 'price_high' | 'popularity';
}

export interface ProviderSearchResult {
  id: string;
  name: string;
  profile_image_url?: string;
  rating: number;
  review_count: number;
  address?: string;
  distance?: number;
  is_online: boolean;
  is_verified: boolean;
  specialties: string[];
  starting_price: number;
  location?: any;
}

export interface ServiceSearchResult {
  id: string;
  provider_id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  price: number;
  duration_minutes: number;
  category_name_en: string;
  category_name_ar: string;
  provider_name: string;
  provider_rating: number;
  provider_image?: string;
  is_featured: boolean;
  booking_count: number;
}

export class SearchService {
  /**
   * Search for providers
   */
  async searchProviders(
    query: string,
    filters?: SearchFilters
  ): Promise<ProviderSearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('providers')
        .select(`
          id,
          name,
          profile_image_url,
          rating,
          review_count,
          address,
          location,
          is_online,
          is_verified,
          specialties,
          gender,
          services(price)
        `)
        .eq('is_active', true);

      // Text search
      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,bio.ilike.%${query}%`);
      }

      // Category filter - search through services
      if (filters?.category_id) {
        const { data: providerIds } = await supabase
          .from('services')
          .select('provider_id')
          .eq('category_id', filters.category_id)
          .eq('active', true);
        
        if (providerIds && providerIds.length > 0) {
          queryBuilder = queryBuilder.in('id', providerIds.map(p => p.provider_id));
        }
      }

      // Rating filter
      if (filters?.rating_min) {
        queryBuilder = queryBuilder.gte('rating', filters.rating_min);
      }

      // Gender preference filter
      if (filters?.gender_preference && filters.gender_preference !== 'ANY') {
        queryBuilder = queryBuilder.eq('gender', filters.gender_preference);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      let results: ProviderSearchResult[] = (data || []).map(provider => {
        const prices = provider.services?.map((s: any) => s.price).filter((p: any) => p > 0) || [];
        const startingPrice = prices.length > 0 ? Math.min(...prices) : 0;

        return {
          id: provider.id,
          name: provider.name,
          profile_image_url: provider.profile_image_url,
          rating: provider.rating || 0,
          review_count: provider.review_count || 0,
          address: provider.address,
          is_online: provider.is_online,
          is_verified: provider.is_verified,
          specialties: provider.specialties || [],
          starting_price: startingPrice,
          location: provider.location
        };
      });

      // Location-based filtering and distance calculation
      if (filters?.location) {
        results = await this.filterByLocation(results, filters.location);
      }

      // Availability filtering
      if (filters?.availability) {
        results = await this.filterByAvailability(results, filters.availability);
      }

      // Sorting
      results = this.sortResults(results, filters?.sort_by);

      return results;
    } catch (error) {
      console.error('Error searching providers:', error);
      return [];
    }
  }

  /**
   * Search for services
   */
  async searchServices(
    query: string,
    filters?: SearchFilters
  ): Promise<ServiceSearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('services')
        .select(`
          id,
          provider_id,
          name_en,
          name_ar,
          description_en,
          description_ar,
          price,
          duration_minutes,
          is_featured,
          active,
          category:categories(name_en, name_ar),
          provider:providers(name, rating, profile_image_url, is_online, location),
          service_tags(tag:tags(name_en, name_ar))
        `)
        .eq('active', true)
        .eq('provider.is_active', true);

      // Text search
      if (query) {
        queryBuilder = queryBuilder.or(
          `name_en.ilike.%${query}%,name_ar.ilike.%${query}%,description_en.ilike.%${query}%,description_ar.ilike.%${query}%`
        );
      }

      // Category filter
      if (filters?.category_id) {
        queryBuilder = queryBuilder.eq('category_id', filters.category_id);
      }

      // Price range filter
      if (filters?.price_min) {
        queryBuilder = queryBuilder.gte('price', filters.price_min);
      }
      if (filters?.price_max) {
        queryBuilder = queryBuilder.lte('price', filters.price_max);
      }

      // Tag filter
      if (filters?.tags && filters.tags.length > 0) {
        const { data: serviceIds } = await supabase
          .from('service_tags')
          .select('service_id')
          .in('tag_id', filters.tags);
        
        if (serviceIds && serviceIds.length > 0) {
          queryBuilder = queryBuilder.in('id', serviceIds.map(s => s.service_id));
        }
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Get booking counts
      const serviceIds = data?.map(s => s.id) || [];
      const { data: bookingCounts } = await supabase
        .from('bookings')
        .select('service_id')
        .in('service_id', serviceIds)
        .eq('status', 'completed');

      const bookingCountMap = bookingCounts?.reduce((acc, booking) => {
        acc[booking.service_id] = (acc[booking.service_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      let results: ServiceSearchResult[] = (data || []).map(service => ({
        id: service.id,
        provider_id: service.provider_id,
        name_en: service.name_en,
        name_ar: service.name_ar,
        description_en: service.description_en,
        description_ar: service.description_ar,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category_name_en: service.category?.name_en || '',
        category_name_ar: service.category?.name_ar || '',
        provider_name: service.provider?.name || '',
        provider_rating: service.provider?.rating || 0,
        provider_image: service.provider?.profile_image_url,
        is_featured: service.is_featured,
        booking_count: bookingCountMap[service.id] || 0
      }));

      // Filter by provider location if needed
      if (filters?.location) {
        results = results.filter(service => {
          const provider = (data || []).find(s => s.id === service.id)?.provider;
          if (!provider?.location) return false;
          
          const distance = this.calculateDistance(
            filters.location!.latitude,
            filters.location!.longitude,
            provider.location.coordinates[1],
            provider.location.coordinates[0]
          );
          
          return distance <= filters.location!.radius;
        });
      }

      // Sort results
      results = this.sortServiceResults(results, filters?.sort_by);

      return results;
    } catch (error) {
      console.error('Error searching services:', error);
      return [];
    }
  }

  /**
   * Get popular services
   */
  async getPopularServices(limit: number = 10): Promise<ServiceSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('service_performance_analytics')
        .select('*')
        .gt('total_bookings', 0)
        .order('popularity_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const serviceIds = data?.map(s => s.service_id) || [];
      
      return this.searchServices('', {
        sort_by: 'popularity'
      }).then(services => 
        services.filter(s => serviceIds.includes(s.id))
          .slice(0, limit)
      );
    } catch (error) {
      console.error('Error fetching popular services:', error);
      return [];
    }
  }

  /**
   * Get featured providers
   */
  async getFeaturedProviders(limit: number = 10): Promise<ProviderSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select(`
          id,
          name,
          profile_image_url,
          rating,
          review_count,
          address,
          is_online,
          is_verified,
          specialties,
          is_featured,
          services(price)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(provider => {
        const prices = provider.services?.map((s: any) => s.price).filter((p: any) => p > 0) || [];
        const startingPrice = prices.length > 0 ? Math.min(...prices) : 0;

        return {
          id: provider.id,
          name: provider.name,
          profile_image_url: provider.profile_image_url,
          rating: provider.rating || 0,
          review_count: provider.review_count || 0,
          address: provider.address,
          is_online: provider.is_online,
          is_verified: provider.is_verified,
          specialties: provider.specialties || [],
          starting_price: startingPrice
        };
      });
    } catch (error) {
      console.error('Error fetching featured providers:', error);
      return [];
    }
  }

  /**
   * Filter providers by location
   */
  private async filterByLocation(
    providers: ProviderSearchResult[],
    location: SearchFilters['location']
  ): Promise<ProviderSearchResult[]> {
    if (!location) return providers;

    return providers
      .map(provider => {
        if (!provider.location) return null;
        
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          provider.location.coordinates[1],
          provider.location.coordinates[0]
        );

        if (distance > location.radius) return null;

        return {
          ...provider,
          distance
        };
      })
      .filter(Boolean) as ProviderSearchResult[];
  }

  /**
   * Filter providers by availability
   */
  private async filterByAvailability(
    providers: ProviderSearchResult[],
    availability: NonNullable<SearchFilters['availability']>
  ): Promise<ProviderSearchResult[]> {
    const availableProviderIds: string[] = [];

    for (const provider of providers) {
      const { data } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', provider.id)
        .eq('booking_date', availability.date)
        .eq('start_time', availability.time)
        .in('status', ['confirmed', 'pending']);

      if (!data || data.length === 0) {
        availableProviderIds.push(provider.id);
      }
    }

    return providers.filter(p => availableProviderIds.includes(p.id));
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Sort provider results
   */
  private sortResults(
    results: ProviderSearchResult[],
    sortBy?: SearchFilters['sort_by']
  ): ProviderSearchResult[] {
    switch (sortBy) {
      case 'distance':
        return results.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      case 'rating':
        return results.sort((a, b) => b.rating - a.rating);
      case 'price_low':
        return results.sort((a, b) => a.starting_price - b.starting_price);
      case 'price_high':
        return results.sort((a, b) => b.starting_price - a.starting_price);
      case 'popularity':
        return results.sort((a, b) => b.review_count - a.review_count);
      default:
        return results;
    }
  }

  /**
   * Sort service results
   */
  private sortServiceResults(
    results: ServiceSearchResult[],
    sortBy?: SearchFilters['sort_by']
  ): ServiceSearchResult[] {
    switch (sortBy) {
      case 'rating':
        return results.sort((a, b) => b.provider_rating - a.provider_rating);
      case 'price_low':
        return results.sort((a, b) => a.price - b.price);
      case 'price_high':
        return results.sort((a, b) => b.price - a.price);
      case 'popularity':
        return results.sort((a, b) => b.booking_count - a.booking_count);
      default:
        return results;
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();