import { Request, Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { supabase } from '../config/supabase';
import { assertAuthenticated, assertDefined } from '../utils/null-safety';

// Enhanced service management interfaces
// interface ServiceWithDetails { // Commented out to suppress unused interface warning
//   id: string;
//   provider_id: string;
//   category_id: string;
//   name_en: string;
//   name_ar: string;
//   description_en?: string;
//   description_ar?: string;
//   price: number;
//   duration_minutes: number;
//   active: boolean;
//   tags?: any[];
//   variations?: any[];
//   analytics?: {
//     bookings_count: number;
//     revenue_total: number;
//     average_rating: number;
//     popularity_score: number;
//   };
// }

interface BulkServiceOperation {
  service_ids: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'update_price' | 'update_category';
  data?: {
    price_adjustment?: number;
    price_adjustment_type?: 'fixed' | 'percentage';
    category_id?: string;
    tags?: string[];
  };
}

interface ServicePackageData {
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  service_ids: Array<{
    service_id: string;
    quantity?: number;
    sequence_order?: number;
    is_optional?: boolean;
  }>;
  package_price: number;
  package_type?: 'bundle' | 'subscription' | 'promotional';
  valid_from?: string;
  valid_until?: string;
  max_bookings?: number;
  featured?: boolean;
}

interface ServiceVariationData {
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  price_modifier: number;
  duration_modifier: number;
  is_default?: boolean;
  metadata?: Record<string, any>;
}

export class ServiceManagementController {
  /**
   * Get service templates by category
   * GET /api/services/templates
   */
  async getServiceTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category_id, subcategory, market_segment, gender_specific } = req.query;
      
      let query = supabase
        .from('service_templates')
        .select(`
          *,
          category:service_categories(
            id,
            name_en,
            name_ar
          )
        `)
        .eq('active', true)
        .order('is_popular', { ascending: false })
        .order('sort_order', { ascending: true });
      
      if (category_id) {
        query = query.eq('category_id', category_id);
      }
      
      if (subcategory) {
        query = query.eq('subcategory', subcategory);
      }
      
      if (market_segment) {
        query = query.eq('market_segment', market_segment);
      }
      
      if (gender_specific) {
        query = query.eq('gender_specific', gender_specific);
      }
      
      const { data: templates, error } = await query;
      
      if (error) {
        throw new AppError('Failed to fetch service templates', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        data: templates || []
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create services from templates
   * POST /api/services/from-templates
   */
  async createFromTemplates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req, 'Authentication required');
      if (req.user.type !== 'provider') {
        throw new AppError('Only providers can create services', 403);
      }
      
      const { template_ids, customizations } = req.body;
      
      if (!Array.isArray(template_ids) || template_ids.length === 0) {
        throw new AppError('Template IDs are required', 400);
      }
      
      // Fetch templates
      const { data: templates, error: templateError } = await supabase
        .from('service_templates')
        .select('*')
        .in('id', template_ids);
      
      if (templateError || !templates) {
        throw new AppError('Failed to fetch templates', 500);
      }
      
      // Create services from templates
      const services = templates.map(template => {
        const customization = customizations?.[template.id] || {};
        return {
          provider_id: req.user.id,
          category_id: template.category_id,
          name_en: customization.name_en || template.name_en,
          name_ar: customization.name_ar || template.name_ar,
          description_en: customization.description_en || template.description_en,
          description_ar: customization.description_ar || template.description_ar,
          price: customization.price || template.typical_price_min,
          duration_minutes: customization.duration_minutes || template.typical_duration_minutes,
          gender_preference: template.gender_specific,
          active: true
        };
      });
      
      const { data: createdServices, error: createError } = await supabase
        .from('services')
        .insert(services)
        .select();
      
      if (createError) {
        throw new AppError('Failed to create services', 500);
      }
      
      // Add suggested tags
      const tagOperations = [];
      for (let i = 0; i < createdServices.length; i++) {
        const service = createdServices[i];
        const template = templates[i];
        
        if (template.suggested_tags && Array.isArray(template.suggested_tags)) {
          // Get tag IDs from tag names
          const { data: tags } = await supabase
            .from('service_tags')
            .select('id')
            .in('name_en', template.suggested_tags);
          
          if (tags && tags.length > 0) {
            const tagLinks = tags.map(tag => ({
              service_id: service.id,
              tag_id: tag.id
            }));
            tagOperations.push(...tagLinks);
          }
        }
      }
      
      if (tagOperations.length > 0) {
        await supabase
          .from('service_service_tags')
          .insert(tagOperations);
      }
      
      const response: ApiResponse = {
        success: true,
        data: createdServices,
        message: `${createdServices.length} services created successfully`
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk service operations
   * POST /api/services/bulk
   */
  async bulkServiceOperations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req, 'Authentication required');
      if (req.user.type !== 'provider') {
        throw new AppError('Only providers can perform bulk operations', 403);
      }
      
      const operation: BulkServiceOperation = req.body;
      
      if (!operation.service_ids || operation.service_ids.length === 0) {
        throw new AppError('Service IDs are required', 400);
      }
      
      // Verify ownership of all services
      const { data: services, error: verifyError } = await supabase
        .from('services')
        .select('id, provider_id, price')
        .in('id', operation.service_ids);
      
      if (verifyError || !services) {
        throw new AppError('Failed to verify services', 500);
      }
      
      const unauthorizedServices = services.filter(s => s.provider_id !== req.user.id);
      if (unauthorizedServices.length > 0) {
        throw new AppError('You can only modify your own services', 403);
      }
      
      let result;
      
      switch (operation.operation) {
        case 'activate':
          result = await supabase
            .from('services')
            .update({ active: true, updated_at: new Date().toISOString() })
            .in('id', operation.service_ids);
          break;
          
        case 'deactivate':
          result = await supabase
            .from('services')
            .update({ active: false, updated_at: new Date().toISOString() })
            .in('id', operation.service_ids);
          break;
          
        case 'delete':
          result = await supabase
            .from('services')
            .delete()
            .in('id', operation.service_ids);
          break;
          
        case 'update_price':
          if (!operation.data?.price_adjustment) {
            throw new AppError('Price adjustment is required', 400);
          }
          
          const priceAdjustment = operation.data.price_adjustment;
          const adjustmentType = operation.data.price_adjustment_type;
          
          const priceUpdates = services.map(service => {
            let newPrice = service.price;
            
            if (adjustmentType === 'percentage') {
              newPrice = service.price * (1 + priceAdjustment / 100);
            } else {
              newPrice = service.price + priceAdjustment;
            }
            
            return {
              id: service.id,
              price: Math.max(0, newPrice),
              updated_at: new Date().toISOString()
            };
          });
          
          // Update prices individually to handle different values
          for (const update of priceUpdates) {
            await supabase
              .from('services')
              .update({ price: update.price, updated_at: update.updated_at })
              .eq('id', update.id);
          }
          
          result = { error: null };
          break;
          
        case 'update_category':
          if (!operation.data?.category_id) {
            throw new AppError('Category ID is required', 400);
          }
          
          result = await supabase
            .from('services')
            .update({ 
              category_id: operation.data.category_id,
              updated_at: new Date().toISOString()
            })
            .in('id', operation.service_ids);
          break;
          
        default:
          throw new AppError('Invalid operation', 400);
      }
      
      if (result.error) {
        throw new AppError('Failed to perform bulk operation', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        message: `${operation.operation} performed on ${operation.service_ids.length} services`
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create service package
   * POST /api/services/packages
   */
  async createServicePackage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req, 'Authentication required');
      if (req.user.type !== 'provider') {
        throw new AppError('Only providers can create packages', 403);
      }
      
      const packageData: ServicePackageData = req.body;
      
      // Validate required fields
      if (!packageData.name_en || !packageData.name_ar) {
        throw new AppError('Package name in both languages is required', 400);
      }
      
      if (!packageData.service_ids || packageData.service_ids.length < 2) {
        throw new AppError('Package must contain at least 2 services', 400);
      }
      
      if (!packageData.package_price || packageData.package_price <= 0) {
        throw new AppError('Valid package price is required', 400);
      }
      
      // Verify ownership of all services
      const serviceIds = packageData.service_ids.map(s => s.service_id);
      const { data: services, error: verifyError } = await supabase
        .from('services')
        .select('id, provider_id, price, duration_minutes')
        .in('id', serviceIds);
      
      if (verifyError || !services || services.length !== serviceIds.length) {
        throw new AppError('Invalid services selected', 400);
      }
      
      const unauthorizedServices = services.filter(s => s.provider_id !== req.user.id);
      if (unauthorizedServices.length > 0) {
        throw new AppError('You can only include your own services in packages', 403);
      }
      
      // Calculate total duration and original price
      let totalDuration = 0;
      let originalPrice = 0;
      
      packageData.service_ids.forEach(item => {
        const service = services.find(s => s.id === item.service_id);
        if (service) {
          const quantity = item.quantity || 1;
          totalDuration += service.duration_minutes * quantity;
          originalPrice += service.price * quantity;
        }
      });
      
      // Ensure package price is less than original
      if (packageData.package_price >= originalPrice) {
        throw new AppError('Package price must be less than the sum of individual services', 400);
      }
      
      // Create package
      const { data: newPackage, error: packageError } = await supabase
        .from('service_packages')
        .insert({
          provider_id: req.user.id,
          name_en: packageData.name_en,
          name_ar: packageData.name_ar,
          description_en: packageData.description_en,
          description_ar: packageData.description_ar,
          package_type: packageData.package_type || 'bundle',
          total_duration_minutes: totalDuration,
          package_price: packageData.package_price,
          original_price: originalPrice,
          valid_from: packageData.valid_from,
          valid_until: packageData.valid_until,
          max_bookings: packageData.max_bookings,
          featured: packageData.featured || false,
          active: true
        })
        .select()
        .single();
      
      if (packageError || !newPackage) {
        throw new AppError('Failed to create package', 500);
      }
      
      // Create package service links
      const packageServices = packageData.service_ids.map((item, index) => ({
        package_id: newPackage.id,
        service_id: item.service_id,
        quantity: item.quantity || 1,
        sequence_order: item.sequence_order || index,
        is_optional: item.is_optional || false
      }));
      
      const { error: linkError } = await supabase
        .from('package_services')
        .insert(packageServices);
      
      if (linkError) {
        // Rollback package creation
        await supabase
          .from('service_packages')
          .delete()
          .eq('id', newPackage.id);
        
        throw new AppError('Failed to link services to package', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        data: newPackage,
        message: 'Service package created successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider's service packages
   * GET /api/services/packages/:providerId
   */
  async getProviderPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId } = req.params;
      const { includeInactive } = req.query;
      
      let query = supabase
        .from('service_packages')
        .select(`
          *,
          package_services(
            *,
            service:services(
              id,
              name_en,
              name_ar,
              price,
              duration_minutes
            )
          )
        `)
        .eq('provider_id', providerId)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (!includeInactive || includeInactive !== 'true') {
        query = query.eq('active', true);
      }
      
      const { data: packages, error } = await query;
      
      if (error) {
        throw new AppError('Failed to fetch packages', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        data: packages || []
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Duplicate a service
   * POST /api/services/duplicate/:id
   */
  async duplicateService(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req, 'Authentication required');
      if (req.user.type !== 'provider') {
        throw new AppError('Only providers can duplicate services', 403);
      }
      
      const { id } = req.params;
      const { name_en, name_ar } = req.body;
      
      // Verify ownership
      const { data: originalService, error: verifyError } = await supabase
        .from('services')
        .select('provider_id')
        .eq('id', id)
        .single();
      
      if (verifyError || !originalService) {
        throw new AppError('Service not found', 404);
      }
      
      if (originalService.provider_id !== req.user.id) {
        throw new AppError('You can only duplicate your own services', 403);
      }
      
      // Call duplicate function
      const { data: result, error: duplicateError } = await supabase
        .rpc('duplicate_service', {
          p_service_id: id,
          p_new_name_en: name_en,
          p_new_name_ar: name_ar
        });
      
      if (duplicateError) {
        throw new AppError('Failed to duplicate service', 500);
      }
      
      // Fetch the new service with details
      const { data: newService, error: fetchError } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(
            id,
            name_en,
            name_ar
          ),
          tags:service_service_tags(
            tag:service_tags(
              id,
              name_en,
              name_ar
            )
          ),
          variations:service_variations(*)
        `)
        .eq('id', result)
        .single();
      
      if (fetchError || !newService) {
        throw new AppError('Failed to fetch duplicated service', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        data: newService,
        message: 'Service duplicated successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get service analytics
   * GET /api/services/analytics/:providerId
   */
  async getServiceAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId } = req.params;
      const { date_from, date_to, service_id } = req.query;
      
      // Check authorization
      assertAuthenticated(req, 'Authentication required');
      if (req.user.type !== 'provider' || req.user.id !== providerId) {
        throw new AppError('You can only view your own analytics', 403);
      }
      
      let analyticsQuery = supabase
        .from('service_analytics')
        .select(`
          *,
          service:services(
            id,
            name_en,
            name_ar,
            category_id
          )
        `)
        .eq('service.provider_id', providerId);
      
      if (service_id) {
        analyticsQuery = analyticsQuery.eq('service_id', service_id);
      }
      
      if (date_from) {
        analyticsQuery = analyticsQuery.gte('date', date_from);
      }
      
      if (date_to) {
        analyticsQuery = analyticsQuery.lte('date', date_to);
      }
      
      const { data: analytics, error: analyticsError } = await analyticsQuery;
      
      if (analyticsError) {
        throw new AppError('Failed to fetch analytics', 500);
      }
      
      // Get summary statistics
      const summaryQuery = supabase
        .from('services')
        .select(`
          id,
          name_en,
          name_ar,
          price,
          active,
          booking_count,
          popularity_score,
          last_booked_at
        `)
        .eq('provider_id', providerId)
        .order('popularity_score', { ascending: false });
      
      const { data: services, error: servicesError } = await summaryQuery;
      
      if (servicesError) {
        throw new AppError('Failed to fetch service summary', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        data: {
          analytics: analytics || [],
          services: services || [],
          summary: {
            total_services: services?.length || 0,
            active_services: services?.filter(s => s.active).length || 0,
            total_bookings: analytics?.reduce((sum, a) => sum + a.bookings_count, 0) || 0,
            total_revenue: analytics?.reduce((sum, a) => sum + a.revenue_total, 0) || 0
          }
        }
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update service variations
   * PUT /api/services/:id/variations
   */
  async updateServiceVariations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req, 'Authentication required');
      if (req.user.type !== 'provider') {
        throw new AppError('Only providers can manage variations', 403);
      }
      
      const { id } = req.params;
      const { variations } = req.body;
      
      // Verify ownership
      const { data: service, error: verifyError } = await supabase
        .from('services')
        .select('provider_id')
        .eq('id', id)
        .single();
      
      if (verifyError || !service) {
        throw new AppError('Service not found', 404);
      }
      
      if (service.provider_id !== req.user.id) {
        throw new AppError('You can only modify your own services', 403);
      }
      
      // Delete existing variations
      await supabase
        .from('service_variations')
        .delete()
        .eq('service_id', id);
      
      // Insert new variations
      if (variations && variations.length > 0) {
        const variationData = variations.map((v: ServiceVariationData, index: number) => ({
          service_id: id,
          name_en: v.name_en,
          name_ar: v.name_ar,
          description_en: v.description_en,
          description_ar: v.description_ar,
          price_modifier: v.price_modifier || 0,
          duration_modifier: v.duration_modifier || 0,
          sort_order: index,
          is_default: v.is_default || false,
          metadata: v.metadata || {},
          active: true
        }));
        
        const { error: insertError } = await supabase
          .from('service_variations')
          .insert(variationData);
        
        if (insertError) {
          throw new AppError('Failed to create variations', 500);
        }
      }
      
      // Fetch updated service with variations
      const { data: updatedService, error: fetchError } = await supabase
        .from('services')
        .select(`
          *,
          variations:service_variations(*)
        `)
        .eq('id', id)
        .single();
      
      if (fetchError) {
        throw new AppError('Failed to fetch updated service', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        data: updatedService,
        message: 'Service variations updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all service tags
   * GET /api/services/tags
   */
  async getServiceTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, is_system } = req.query;
      
      let query = supabase
        .from('service_tags')
        .select('*')
        .order('usage_count', { ascending: false });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      if (is_system !== undefined) {
        query = query.eq('is_system', is_system === 'true');
      }
      
      const { data: tags, error } = await query;
      
      if (error) {
        throw new AppError('Failed to fetch tags', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        data: tags || []
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update service tags
   * PUT /api/services/:id/tags
   */
  async updateServiceTags(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req, 'Authentication required');
      if (req.user.type !== 'provider') {
        throw new AppError('Only providers can manage tags', 403);
      }
      
      const { id } = req.params;
      const { tag_ids } = req.body;
      
      // Verify ownership
      const { data: service, error: verifyError } = await supabase
        .from('services')
        .select('provider_id')
        .eq('id', id)
        .single();
      
      if (verifyError || !service) {
        throw new AppError('Service not found', 404);
      }
      
      if (service.provider_id !== req.user.id) {
        throw new AppError('You can only modify your own services', 403);
      }
      
      // Delete existing tags
      await supabase
        .from('service_service_tags')
        .delete()
        .eq('service_id', id);
      
      // Insert new tags
      if (tag_ids && tag_ids.length > 0) {
        const tagLinks = tag_ids.map((tag_id: string) => ({
          service_id: id,
          tag_id
        }));
        
        const { error: insertError } = await supabase
          .from('service_service_tags')
          .insert(tagLinks);
        
        if (insertError) {
          throw new AppError('Failed to update tags', 500);
        }
        
        // Update tag usage counts
        await supabase.rpc('increment', {
          table_name: 'service_tags',
          column_name: 'usage_count',
          row_ids: tag_ids
        });
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Service tags updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const serviceManagementController = new ServiceManagementController();