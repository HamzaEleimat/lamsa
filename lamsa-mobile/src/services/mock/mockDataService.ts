import { mockProviders } from './mockProviders';
import { mockServices, ServiceItem } from './mockServices';
import { mockBookings, Booking } from './mockBookings';
import { mockReviews, Review } from './mockReviews';
import { ProviderWithDistance } from '../providerService';

// Mock user data
export const mockUser = {
  id: 'user1',
  name: 'Sarah Johnson',
  phone: '+962791234567',
  email: 'sarah.johnson@email.com',
  avatar: 'https://via.placeholder.com/150x150/FFE5EC/50373E?text=SJ',
  bookings_count: 12,
  favorite_services: 8,
  average_rating: 4.8,
  member_since: '2023-06-15',
  preferred_language: 'en',
  notification_preferences: {
    booking_reminders: true,
    promotions: true,
    new_services: false
  }
};

class MockDataService {
  // Get all providers
  getAllProviders(): ProviderWithDistance[] {
    return mockProviders;
  }

  // Search providers with filters
  searchProviders(params: {
    searchQuery?: string;
    serviceCategory?: string;
    sortBy?: string;
    limit?: number;
  }): ProviderWithDistance[] {
    let results = [...mockProviders];

    // Filter by search query
    if (params.searchQuery) {
      const query = params.searchQuery.toLowerCase();
      results = results.filter(provider => 
        provider.business_name_en.toLowerCase().includes(query) ||
        provider.business_name_ar.includes(query) ||
        provider.description_en.toLowerCase().includes(query) ||
        provider.description_ar.includes(query)
      );
    }

    // Filter by category
    if (params.serviceCategory) {
      results = results.filter(provider => 
        provider.service_categories.includes(params.serviceCategory!)
      );
    }

    // Sort results
    if (params.sortBy === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    } else if (params.sortBy === 'distance') {
      results.sort((a, b) => a.distance - b.distance);
    } else if (params.sortBy === 'price') {
      const priceOrder = { low: 1, medium: 2, high: 3 };
      results.sort((a, b) => 
        priceOrder[a.price_range as keyof typeof priceOrder] - 
        priceOrder[b.price_range as keyof typeof priceOrder]
      );
    }

    // Apply limit
    if (params.limit) {
      results = results.slice(0, params.limit);
    }

    return results;
  }

  // Get provider by ID
  getProviderById(id: string): ProviderWithDistance | undefined {
    return mockProviders.find(provider => provider.id === id);
  }

  // Get services for a provider
  getProviderServices(providerId: string): ServiceItem[] {
    return mockServices.filter(service => service.provider_id === providerId);
  }

  // Get all services
  getAllServices(): ServiceItem[] {
    return mockServices;
  }

  // Get service by ID
  getServiceById(id: string): ServiceItem | undefined {
    return mockServices.find(service => service.id === id);
  }

  // Get user bookings
  getUserBookings(userId: string, status?: string): Booking[] {
    let bookings = mockBookings.filter(booking => booking.user_id === userId);
    
    if (status) {
      bookings = bookings.filter(booking => booking.status === status);
    }

    // Sort by date (newest first)
    bookings.sort((a, b) => 
      new Date(b.booking_date + ' ' + b.booking_time).getTime() - 
      new Date(a.booking_date + ' ' + a.booking_time).getTime()
    );

    return bookings;
  }

  // Get upcoming bookings
  getUpcomingBookings(userId: string): Booking[] {
    const now = new Date();
    return this.getUserBookings(userId)
      .filter(booking => {
        const bookingDate = new Date(booking.booking_date + ' ' + booking.booking_time);
        return bookingDate > now && (booking.status === 'confirmed' || booking.status === 'pending');
      });
  }

  // Get past bookings
  getPastBookings(userId: string): Booking[] {
    const now = new Date();
    return this.getUserBookings(userId)
      .filter(booking => {
        const bookingDate = new Date(booking.booking_date + ' ' + booking.booking_time);
        return bookingDate <= now || booking.status === 'completed';
      });
  }

  // Get provider reviews
  getProviderReviews(providerId: string): Review[] {
    return mockReviews
      .filter(review => review.provider_id === providerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Get review stats for a provider
  getProviderReviewStats(providerId: string): {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  } {
    const reviews = this.getProviderReviews(providerId);
    
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    reviews.forEach(review => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    return {
      averageRating: totalRating / reviews.length,
      totalReviews: reviews.length,
      ratingDistribution
    };
  }

  // Get popular services
  getPopularServices(limit: number = 10): ServiceItem[] {
    return mockServices
      .filter(service => service.is_popular)
      .slice(0, limit);
  }

  // Get services by category
  getServicesByCategory(category: string): ServiceItem[] {
    return mockServices.filter(service => service.category === category);
  }

  // Get nearby providers
  getNearbyProviders(limit: number = 5): ProviderWithDistance[] {
    return mockProviders
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  // Get featured providers
  getFeaturedProviders(): ProviderWithDistance[] {
    return mockProviders
      .filter(provider => provider.is_verified && provider.rating >= 4.5)
      .slice(0, 6);
  }

  // Simulate API delay
  async withDelay<T>(data: T, delay: number = 300): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, delay));
    return data;
  }
}

export const mockDataService = new MockDataService();
export default mockDataService;