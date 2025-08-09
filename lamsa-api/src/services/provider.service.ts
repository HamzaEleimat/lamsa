/**
 * Provider Service
 * Handles business logic for provider operations
 */

import { supabase } from '../config/supabase';
import { PaginatedResponse } from '../types';

export class ProviderService {
  /**
   * Get paginated list of providers
   */
  async getProviders(params: {
    page: number;
    limit: number;
    filters?: any;
  }): Promise<PaginatedResponse<any>> {
    const { page, limit, filters } = params;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('providers')
      .select('*', { count: 'exact' });

    // Apply filters if provided
    if (filters) {
      // Add filter logic here as needed
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch providers: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data || [],
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Get provider by ID
   */
  async getProviderById(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch provider: ${error.message}`);
    }

    return data;
  }

  /**
   * Update provider
   */
  async updateProvider(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update provider: ${error.message}`);
    }

    return data;
  }

  /**
   * Search providers with filters
   */
  async searchProviders(params: {
    query?: string;
    category?: string;
    location?: { lat: number; lng: number };
    radius?: number;
    page: number;
    limit: number;
  }): Promise<PaginatedResponse<any>> {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    // Build search query
    let query = supabase
      .from('providers')
      .select('*', { count: 'exact' });

    // Add search conditions as needed
    if (params.query) {
      // Sanitize input to prevent SQL injection in raw PostgREST syntax
      // Remove any special characters that could break the query
      const sanitizedQuery = params.query.replace(/[%_,.\(\)]/g, '');
      
      // Use sanitized input in the or() method
      query = query.or(`name_en.ilike.%${sanitizedQuery}%,name_ar.ilike.%${sanitizedQuery}%`);
    }

    if (params.category) {
      query = query.contains('services', [{ category_id: params.category }]);
    }

    // Execute query
    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('rating', { ascending: false });

    if (error) {
      throw new Error(`Failed to search providers: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data || [],
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }
}

// Export singleton instance
export const providerService = new ProviderService();