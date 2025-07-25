import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { Provider, ServiceCategory, BusinessType } from '../types';
import mockDataService from './mock/mockDataService';
import { ServiceItem } from './mock/mockServices';
import { Review } from './mock/mockReviews';

export interface ProviderSearchParams {
  // Location
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  
  // Filters
  categories?: ServiceCategory[];
  businessTypes?: BusinessType[];
  minRating?: number;
  priceRange?: {
    min?: number;
    max?: number;
  };
  
  // Availability
  availableNow?: boolean;
  availableToday?: boolean;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  
  // Search
  searchQuery?: string;
  
  // Sorting
  sortBy?: 'distance' | 'rating' | 'price' | 'reviews';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
  
  // Promotion
  includeNewProviders?: boolean;
  qualityTierMinimum?: number;
}

export interface ProviderSearchResponse {
  providers: ProviderWithDistance[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ProviderWithDistance extends Provider {
  distance?: number; // in kilometers
  isAvailableNow?: boolean;
  nextAvailableSlot?: string;
  promotionBadge?: 'new' | 'featured' | 'trending';
  estimatedPrice?: {
    min: number;
    max: number;
  };
}

export interface ProviderServiceItem {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  description?: {
    en: string;
    ar: string;
  };
  price: number;
  durationMinutes: number;
  category: ServiceCategory;
  isPopular?: boolean;
  imageUrl?: string;
}

export interface ProviderReview {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment?: string;
  serviceId?: string;
  serviceName?: string;
  createdAt: string;
  response?: {
    comment: string;
    createdAt: string;
  };
}

export interface ProviderAvailability {
  date: string;
  slots: {
    time: string;
    available: boolean;
    duration?: number;
  }[];
}

class ProviderService {
  private static instance: ProviderService;
  
  private constructor() {}
  
  static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  /**
   * Search providers with filters and location
   */
  async searchProviders(params: ProviderSearchParams): Promise<ProviderSearchResponse> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      // Build query string
      const queryParams = new URLSearchParams();
      
      // Location params
      if (params.latitude) queryParams.append('lat', params.latitude.toString());
      if (params.longitude) queryParams.append('lng', params.longitude.toString());
      if (params.radiusKm) queryParams.append('radius', params.radiusKm.toString());
      
      // Filter params
      if (params.categories?.length) {
        queryParams.append('categories', params.categories.join(','));
      }
      if (params.businessTypes?.length) {
        queryParams.append('businessTypes', params.businessTypes.join(','));
      }
      if (params.minRating) queryParams.append('minRating', params.minRating.toString());
      if (params.priceRange?.min) queryParams.append('minPrice', params.priceRange.min.toString());
      if (params.priceRange?.max) queryParams.append('maxPrice', params.priceRange.max.toString());
      
      // Availability params
      if (params.availableNow) queryParams.append('availableNow', 'true');
      if (params.availableToday) queryParams.append('availableToday', 'true');
      if (params.date) queryParams.append('date', params.date);
      if (params.time) queryParams.append('time', params.time);
      
      // Search and sort params
      if (params.searchQuery) queryParams.append('q', params.searchQuery);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      // Pagination params
      queryParams.append('page', (params.page || 1).toString());
      queryParams.append('limit', (params.limit || 20).toString());
      
      // Promotion params
      if (params.includeNewProviders) queryParams.append('includeNew', 'true');
      if (params.qualityTierMinimum) queryParams.append('minTier', params.qualityTierMinimum.toString());

      const response = await fetch(
        `${API_URL}/api/providers/search?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search providers');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching providers:', error);
      console.log('Using mock data as fallback');
      
      // Use mock data as fallback
      const mockProviders = await mockDataService.withDelay(
        mockDataService.searchProviders({
          searchQuery: params.searchQuery,
          serviceCategory: params.categories?.[0],
          sortBy: params.sortBy,
          limit: params.limit
        })
      );
      
      const page = params.page || 1;
      const limit = params.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProviders = mockProviders.slice(startIndex, endIndex);
      
      return {
        providers: paginatedProviders,
        totalCount: mockProviders.length,
        page,
        totalPages: Math.ceil(mockProviders.length / limit),
        hasMore: endIndex < mockProviders.length
      };
    }
  }

  /**
   * Get provider by ID with full details
   */
  async getProviderById(providerId: string): Promise<Provider> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch provider');
      }

      const data = await response.json();
      return data.provider;
    } catch (error) {
      console.error('Error fetching provider:', error);
      console.log('Using mock data as fallback');
      
      // Use mock data as fallback
      const mockProvider = await mockDataService.withDelay(
        mockDataService.getProviderById(providerId)
      );
      
      if (!mockProvider) {
        throw new Error('Provider not found');
      }
      
      return mockProvider as Provider;
    }
  }

  /**
   * Get provider services
   */
  async getProviderServices(providerId: string, category?: ServiceCategory): Promise<ProviderServiceItem[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category);

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/services?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch provider services');
      }

      const data = await response.json();
      return data.services;
    } catch (error) {
      console.error('Error fetching provider services:', error);
      console.log('Using mock data as fallback');
      
      // Use mock data as fallback
      const mockServices = await mockDataService.withDelay(
        mockDataService.getProviderServices(providerId)
      );
      
      // Convert mock services to ProviderServiceItem format
      return mockServices.map(service => ({
        id: service.id,
        name: {
          en: service.name_en,
          ar: service.name_ar
        },
        description: {
          en: service.description_en,
          ar: service.description_ar
        },
        price: service.price,
        durationMinutes: service.duration_minutes,
        category: service.category as ServiceCategory,
        isPopular: service.is_popular,
        imageUrl: service.image_url
      }));
    }
  }

  /**
   * Get provider reviews
   */
  async getProviderReviews(
    providerId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ reviews: ProviderReview[]; totalCount: number; rating: number }> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/reviews?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch provider reviews');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching provider reviews:', error);
      console.log('Using mock data as fallback');
      
      // Use mock data as fallback
      const mockReviews = await mockDataService.withDelay(
        mockDataService.getProviderReviews(providerId)
      );
      const stats = mockDataService.getProviderReviewStats(providerId);
      
      // Paginate reviews
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedReviews = mockReviews.slice(startIndex, endIndex);
      
      // Convert to ProviderReview format
      const reviews: ProviderReview[] = paginatedReviews.map(review => ({
        id: review.id,
        customerId: review.user_id,
        customerName: review.user_name,
        customerAvatar: review.user_avatar,
        rating: review.rating,
        comment: review.comment,
        serviceId: undefined,
        serviceName: review.service_name,
        createdAt: review.created_at,
        response: undefined
      }));
      
      return {
        reviews,
        totalCount: stats.totalReviews,
        rating: stats.averageRating
      };
    }
  }

  /**
   * Get provider availability for a specific date range
   */
  async getProviderAvailability(
    providerId: string,
    startDate: string,
    endDate: string
  ): Promise<ProviderAvailability[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/availability?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch provider availability');
      }

      const data = await response.json();
      return data.availability;
    } catch (error) {
      console.error('Error fetching provider availability:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get featured providers for home screen
   */
  async getFeaturedProviders(location?: { latitude: number; longitude: number }): Promise<ProviderWithDistance[]> {
    try {
      const params: ProviderSearchParams = {
        sortBy: 'rating',
        sortOrder: 'desc',
        limit: 10,
        qualityTierMinimum: 2, // Verified and Premium only
        includeNewProviders: true,
      };

      if (location) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
        params.radiusKm = 20; // 20km radius for featured
      }

      const response = await this.searchProviders(params);
      return response.providers;
    } catch (error) {
      console.error('Error fetching featured providers:', error);
      throw error;
    }
  }

  /**
   * Get nearby providers
   */
  async getNearbyProviders(
    location: { latitude: number; longitude: number },
    radiusKm: number = 5
  ): Promise<ProviderWithDistance[]> {
    try {
      const params: ProviderSearchParams = {
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm,
        sortBy: 'distance',
        sortOrder: 'asc',
        limit: 20,
      };

      const response = await this.searchProviders(params);
      return response.providers;
    } catch (error) {
      console.error('Error fetching nearby providers:', error);
      throw error;
    }
  }

  /**
   * Get provider images/gallery
   */
  async getProviderImages(
    providerId: string,
    type?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const queryParams = new URLSearchParams();
      if (type) queryParams.append('type', type);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/images?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch provider images');
      }

      const data = await response.json();
      return data.images || [];
    } catch (error) {
      console.error('Error fetching provider images:', error);
      throw error;
    }
  }
}

export default ProviderService.getInstance();