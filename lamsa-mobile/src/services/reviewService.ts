import { supabase } from './supabase';
import { validateUUID } from '../utils/validation';

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  provider_id: string;
  service_id?: string;
  employee_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: {
    id: string;
    name: string;
    image_url?: string;
  };
  service?: {
    id: string;
    name_en: string;
    name_ar: string;
  };
  employee?: {
    id: string;
    name: string;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export class ReviewService {
  /**
   * Get reviews for a provider
   */
  async getProviderReviews(
    providerId: string,
    options?: {
      limit?: number;
      offset?: number;
      minRating?: number;
    }
  ): Promise<Review[]> {
    try {
      let validatedProviderId = providerId;
      try {
        validatedProviderId = validateUUID(providerId, 'providerId');
      } catch (error) {
        console.log('Using non-UUID provider ID:', providerId);
      }

      let query = supabase
        .from('reviews')
        .select(`
          *,
          user:users!reviews_user_id_fkey(id, name, image_url),
          service:services(id, name_en, name_ar),
          employee:employees(id, name)
        `)
        .eq('provider_id', validatedProviderId)
        .order('created_at', { ascending: false });

      if (options?.minRating) {
        query = query.gte('rating', options.minRating);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching provider reviews:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProviderReviews:', error);
      return [];
    }
  }

  /**
   * Get recent reviews for dashboard
   */
  async getRecentReviews(providerId: string, limit: number = 5): Promise<Review[]> {
    return this.getProviderReviews(providerId, { limit });
  }

  /**
   * Get review statistics for a provider
   */
  async getProviderReviewStats(providerId: string): Promise<ReviewStats> {
    try {
      let validatedProviderId = providerId;
      try {
        validatedProviderId = validateUUID(providerId, 'providerId');
      } catch (error) {
        console.log('Using non-UUID provider ID:', providerId);
      }

      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', validatedProviderId);

      if (error) {
        console.error('Error fetching review stats:', error);
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      const reviews = data || [];
      const totalReviews = reviews.length;

      if (totalReviews === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      // Calculate average rating
      const sumRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = sumRatings / totalReviews;

      // Calculate rating distribution
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
          ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
        }
      });

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution
      };
    } catch (error) {
      console.error('Error in getProviderReviewStats:', error);
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
  }

  /**
   * Get reviews for a specific service
   */
  async getServiceReviews(
    serviceId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Review[]> {
    try {
      const validatedServiceId = validateUUID(serviceId, 'serviceId');

      let query = supabase
        .from('reviews')
        .select(`
          *,
          user:users!reviews_user_id_fkey(id, name, image_url),
          employee:employees(id, name)
        `)
        .eq('service_id', validatedServiceId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching service reviews:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getServiceReviews:', error);
      return [];
    }
  }

  /**
   * Create a new review
   */
  async createReview(reviewData: {
    booking_id: string;
    user_id: string;
    provider_id: string;
    service_id?: string;
    employee_id?: string;
    rating: number;
    comment?: string;
  }): Promise<Review | null> {
    try {
      // Validate IDs
      const validatedData = {
        ...reviewData,
        booking_id: validateUUID(reviewData.booking_id, 'booking_id'),
        user_id: validateUUID(reviewData.user_id, 'user_id'),
        provider_id: validateUUID(reviewData.provider_id, 'provider_id'),
        service_id: reviewData.service_id ? validateUUID(reviewData.service_id, 'service_id') : null,
        employee_id: reviewData.employee_id ? validateUUID(reviewData.employee_id, 'employee_id') : null,
      };

      // Validate rating
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert(validatedData)
        .select()
        .single();

      if (error) {
        console.error('Error creating review:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createReview:', error);
      return null;
    }
  }
}

// Export singleton instance
export const reviewService = new ReviewService();