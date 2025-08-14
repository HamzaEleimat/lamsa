import { Request, Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';
import { supabase } from '../config/supabase';

// TypeScript Interfaces
interface ServiceData {
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  category: string;
  price: number;
  duration_minutes: number;
  active?: boolean;
}

interface ServiceUpdateData {
  name_ar?: string;
  name_en?: string;
  description_ar?: string;
  description_en?: string;
  category?: string;
  price?: number;
  duration_minutes?: number;
  active?: boolean;
}

interface ServiceCategory {
  id: string;
  name_ar: string;
  name_en: string;
  icon?: string;
  sort_order: number;
}

export class ServiceController {
  /**
   * Create a new service
   * POST /api/services
   * Provider only
   */
  async createService(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceData: ServiceData = req.body;
      
      // Check if user is a provider
      if (req.user?.type !== 'provider') {
        throw new BilingualAppError('Only providers can create services', 403);
      }
      
      // Validate required fields
      if (!serviceData.name_ar || !serviceData.name_en) {
        throw new BilingualAppError('Service name in both Arabic and English is required', 400);
      }
      
      if (!serviceData.price || serviceData.price <= 0) {
        throw new BilingualAppError('Valid price is required', 400);
      }
      
      if (!serviceData.duration_minutes || serviceData.duration_minutes <= 0) {
        throw new BilingualAppError('Valid duration is required', 400);
      }
      
      // Create service in database
      const { data: newService, error } = await supabase
        .from('services')
        .insert({
          provider_id: req.user.id,
          ...serviceData,
          active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        // Mock data for development
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Using mock service creation');
          const mockService = {
            id: 'mock-service-' + Date.now(),
            provider_id: req.user.id,
            ...serviceData,
            active: true,
            created_at: new Date().toISOString()
          };
          
          const response: ApiResponse = {
            success: true,
            data: mockService,
            message: 'Service created successfully'
          };
          
          res.status(201).json(response);
          return;
        }
        throw new BilingualAppError('Failed to create service', 500);
      }

      const response: ApiResponse = {
        success: true,
        data: newService,
        message: 'Service created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a service
   * PUT /api/services/:id
   * Provider can only update own services
   */
  async updateService(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: ServiceUpdateData = req.body;
      
      // Check if user is a provider
      if (req.user?.type !== 'provider') {
        throw new BilingualAppError('Only providers can update services', 403);
      }
      
      // Validate price if provided
      if (updateData.price !== undefined && updateData.price <= 0) {
        throw new BilingualAppError('Price must be greater than 0', 400);
      }
      
      // Validate duration if provided
      if (updateData.duration_minutes !== undefined && updateData.duration_minutes <= 0) {
        throw new BilingualAppError('Duration must be greater than 0', 400);
      }
      
      // First, check if the service belongs to the provider
      const { data: existingService, error: fetchError } = await supabase
        .from('services')
        .select('provider_id')
        .eq('id', id)
        .single();
      
      if (fetchError || !existingService) {
        // Mock for development
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Using mock service update');
          const mockUpdatedService = {
            id,
            provider_id: req.user.id,
            ...updateData,
            updated_at: new Date().toISOString()
          };
          
          const response: ApiResponse = {
            success: true,
            data: mockUpdatedService,
            message: 'Service updated successfully'
          };
          
          res.json(response);
          return;
        }
        throw new BilingualAppError('Service not found', 404);
      }
      
      // Check ownership
      if (existingService.provider_id !== req.user.id) {
        throw new BilingualAppError('You can only update your own services', 403);
      }
      
      // Update service
      const { data: updatedService, error: updateError } = await supabase
        .from('services')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) {
        throw new BilingualAppError('Failed to update service', 500);
      }

      const response: ApiResponse = {
        success: true,
        data: updatedService,
        message: 'Service updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a service (soft delete)
   * DELETE /api/services/:id
   * Sets active = false
   */
  async deleteService(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if user is a provider
      if (req.user?.type !== 'provider') {
        throw new BilingualAppError('Only providers can delete services', 403);
      }
      
      // First, check if the service belongs to the provider
      const { data: existingService, error: fetchError } = await supabase
        .from('services')
        .select('provider_id')
        .eq('id', id)
        .single();
      
      if (fetchError || !existingService) {
        // Mock for development
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Using mock service deletion');
          const response: ApiResponse = {
            success: true,
            message: 'Service deleted successfully'
          };
          
          res.json(response);
          return;
        }
        throw new BilingualAppError('Service not found', 404);
      }
      
      // Check ownership
      if (existingService.provider_id !== req.user.id) {
        throw new BilingualAppError('You can only delete your own services', 403);
      }
      
      // Soft delete service
      const { error: deleteError } = await supabase
        .from('services')
        .update({ 
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (deleteError) {
        throw new BilingualAppError('Failed to delete service', 500);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Service deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get services by provider
   * GET /api/providers/:providerId/services
   * Groups by category, includes active status
   */
  async getServicesByProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId } = req.params;
      const { includeInactive } = req.query;
      
      // Build query
      let query = supabase
        .from('services')
        .select('*')
        .eq('provider_id', providerId)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });
      
      // Filter by active status unless includeInactive is true
      if (!includeInactive || includeInactive !== 'true') {
        query = query.eq('active', true);
      }
      
      const { data: services, error } = await query;
      
      if (error) {
        // Mock data for development
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Using mock provider services');
          const mockServices = [
            {
              id: 'mock-service-1',
              provider_id: providerId,
              name_ar: 'قص شعر',
              name_en: 'Haircut',
              description_ar: 'قص شعر احترافي',
              description_en: 'Professional haircut',
              category: 'HAIR',
              price: 25,
              duration_minutes: 30,
              active: true
            },
            {
              id: 'mock-service-2',
              provider_id: providerId,
              name_ar: 'صبغة شعر',
              name_en: 'Hair Coloring',
              description_ar: 'صبغة شعر بمنتجات عالية الجودة',
              description_en: 'Hair coloring with premium products',
              category: 'HAIR',
              price: 80,
              duration_minutes: 120,
              active: true
            },
            {
              id: 'mock-service-3',
              provider_id: providerId,
              name_ar: 'مانيكير',
              name_en: 'Manicure',
              description_ar: 'مانيكير كلاسيكي',
              description_en: 'Classic manicure',
              category: 'NAILS',
              price: 20,
              duration_minutes: 45,
              active: true
            },
            {
              id: 'mock-service-4',
              provider_id: providerId,
              name_ar: 'تنظيف بشرة',
              name_en: 'Facial Cleansing',
              description_ar: 'تنظيف عميق للبشرة',
              description_en: 'Deep facial cleansing',
              category: 'SKINCARE',
              price: 50,
              duration_minutes: 60,
              active: false
            }
          ];
          
          // Filter based on includeInactive
          const filteredServices = includeInactive === 'true' 
            ? mockServices 
            : mockServices.filter(s => s.active);
          
          // Group by category
          const servicesByCategory = filteredServices.reduce((acc: any, service) => {
            if (!acc[service.category]) {
              acc[service.category] = [];
            }
            acc[service.category].push(service);
            return acc;
          }, {});
          
          const response: ApiResponse = {
            success: true,
            data: {
              services: filteredServices,
              servicesByCategory,
              total: filteredServices.length
            }
          };
          
          res.json(response);
          return;
        }
        throw new BilingualAppError('Failed to fetch services', 500);
      }
      
      // Group services by category
      const servicesByCategory = services?.reduce((acc: any, service) => {
        if (!acc[service.category]) {
          acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
      }, {}) || {};

      const response: ApiResponse = {
        success: true,
        data: {
          services: services || [],
          servicesByCategory,
          total: services?.length || 0
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all service categories
   * GET /api/services/categories
   * Returns categories with Arabic/English names
   */
  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data: categories, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) {
        // Mock categories for development
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Using mock service categories');
          const mockCategories: ServiceCategory[] = [
            {
              id: 'HAIR',
              name_ar: 'شعر',
              name_en: 'Hair',
              icon: '💇‍♀️',
              sort_order: 1
            },
            {
              id: 'NAILS',
              name_ar: 'أظافر',
              name_en: 'Nails',
              icon: '💅',
              sort_order: 2
            },
            {
              id: 'SKINCARE',
              name_ar: 'العناية بالبشرة',
              name_en: 'Skincare',
              icon: '🧖‍♀️',
              sort_order: 3
            },
            {
              id: 'MAKEUP',
              name_ar: 'مكياج',
              name_en: 'Makeup',
              icon: '💄',
              sort_order: 4
            },
            {
              id: 'MASSAGE',
              name_ar: 'تدليك',
              name_en: 'Massage',
              icon: '💆‍♀️',
              sort_order: 5
            },
            {
              id: 'WAXING',
              name_ar: 'إزالة الشعر',
              name_en: 'Waxing',
              icon: '🪒',
              sort_order: 6
            }
          ];
          
          const response: ApiResponse = {
            success: true,
            data: mockCategories
          };
          
          res.json(response);
          return;
        }
        throw new BilingualAppError('Failed to fetch categories', 500);
      }

      const response: ApiResponse = {
        success: true,
        data: categories || [],
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Keep existing methods for backward compatibility
  async getAllServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, minPrice, maxPrice } = req.query;
      
      let query = supabase
        .from('services')
        .select(`
          *,
          provider:providers(
            id,
            business_name_ar,
            business_name_en,
            latitude,
            longitude
          )
        `)
        .eq('active', true);
      
      if (category) {
        query = query.eq('category', category);
      }
      
      if (minPrice) {
        query = query.gte('price', Number(minPrice));
      }
      
      if (maxPrice) {
        query = query.lte('price', Number(maxPrice));
      }
      
      const { data: services, error } = await query;
      
      if (error) {
        // Return empty array for development
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Database error, returning empty services');
          res.json({ success: true, data: [] });
          return;
        }
        throw new BilingualAppError('Failed to fetch services', 500);
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

  async getServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const { data: service, error } = await supabase
        .from('services')
        .select(`
          *,
          provider:providers(
            id,
            business_name_ar,
            business_name_en,
            phone,
            latitude,
            longitude,
            address
          )
        `)
        .eq('id', id)
        .single();
      
      if (error || !service) {
        throw new BilingualAppError('Service not found', 404);
      }

      const response: ApiResponse = {
        success: true,
        data: service,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async searchServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, location, category, priceRange } = req.query;
      
      let query = supabase
        .from('services')
        .select(`
          *,
          provider:providers!inner(
            id,
            business_name_ar,
            business_name_en,
            latitude,
            longitude,
            verified,
            active
          )
        `)
        .eq('active', true)
        .eq('provider.verified', true)
        .eq('provider.active', true);
      
      // Search query (SQL injection safe)
      if (q) {
        // Sanitize input to prevent SQL injection
        const sanitizedQuery = String(q).replace(/[%_\\]/g, '\\$&');
        const searchPattern = `%${sanitizedQuery}%`;
        
        query = query.or(
          `name_ar.ilike."${searchPattern}",` +
          `name_en.ilike."${searchPattern}",` +
          `description_ar.ilike."${searchPattern}",` +
          `description_en.ilike."${searchPattern}"`
        );
      }
      
      // Category filter
      if (category) {
        query = query.eq('category', category);
      }
      
      // Price range filter
      if (priceRange) {
        const [min, max] = String(priceRange).split('-').map(Number);
        if (min) query = query.gte('price', min);
        if (max) query = query.lte('price', max);
      }
      
      const { data: services, error } = await query;
      
      if (error) {
        throw new BilingualAppError('Search failed', 500);
      }
      
      // If location is provided, filter by distance (simplified)
      let results = services || [];
      if (location && typeof location === 'string') {
        const [lat, lng] = location.split(',').map(Number);
        if (lat && lng) {
          // Simple distance filtering
          results = results.filter(service => {
            const provider = service.provider as any;
            if (!provider?.latitude || !provider?.longitude) return false;
            
            const distance = Math.sqrt(
              Math.pow(provider.latitude - lat, 2) + 
              Math.pow(provider.longitude - lng, 2)
            );
            return distance < 0.1; // Roughly 10km
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: results,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const serviceController = new ServiceController();