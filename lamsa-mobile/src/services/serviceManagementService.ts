import { supabase } from './supabase';
import { ServiceFormData, EnhancedService, ServiceCategory, ServiceTag } from '../types/service.types';
import { UserRole } from '../types';

export class ServiceManagementService {
  /**
   * Get all service categories
   */
  async getCategories(): Promise<ServiceCategory[]> {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get all service tags
   */
  async getTags(): Promise<ServiceTag[]> {
    try {
      const { data, error } = await supabase
        .from('service_tags')
        .select('*')
        .order('name_en', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }
  }

  /**
   * Get services for a provider
   */
  async getProviderServices(providerId: string): Promise<EnhancedService[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*),
          tags:service_service_tags(
            tag:service_tags(*)
          ),
          variations:service_variations(*)
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match EnhancedService type
      return (data || []).map(service => ({
        ...service,
        tags: service.tags?.map((st: any) => st.tag) || [],
        variations: service.variations || []
      }));
    } catch (error) {
      console.error('Error fetching provider services:', error);
      throw error;
    }
  }

  /**
   * Get a single service by ID
   */
  async getServiceById(serviceId: string): Promise<EnhancedService | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*),
          tags:service_service_tags(
            tag:service_tags(*)
          ),
          variations:service_variations(*)
        `)
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      if (!data) return null;

      // Transform the data
      return {
        ...data,
        tags: data.tags?.map((st: any) => st.tag) || [],
        variations: data.variations || []
      };
    } catch (error) {
      console.error('Error fetching service:', error);
      throw error;
    }
  }

  /**
   * Create a new service
   */
  async createService(providerId: string, formData: ServiceFormData): Promise<string> {
    try {
      // Start a transaction
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert({
          provider_id: providerId,
          name_en: formData.name_en,
          name_ar: formData.name_ar,
          description_en: formData.description_en,
          description_ar: formData.description_ar,
          category_id: formData.category_id,
          price: formData.price,
          duration_minutes: formData.duration_minutes,
          gender_preference: formData.gender_preference,
          image_urls: formData.image_urls || [],
          requires_consultation: formData.requires_consultation,
          allow_parallel_booking: formData.allow_parallel_booking,
          max_parallel_bookings: formData.max_parallel_bookings,
          preparation_time_minutes: formData.preparation_time_minutes,
          cleanup_time_minutes: formData.cleanup_time_minutes,
          max_advance_booking_days: formData.max_advance_booking_days,
          min_advance_booking_hours: formData.min_advance_booking_hours,
          is_active: true
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // Add tags
      if (formData.tags.length > 0) {
        const tagInserts = formData.tags.map(tagId => ({
          service_id: service.id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('service_service_tags')
          .insert(tagInserts);

        if (tagError) throw tagError;
      }

      // Add variations
      if (formData.variations.length > 0) {
        const variationInserts = formData.variations.map((variation, index) => ({
          service_id: service.id,
          ...variation,
          sort_order: variation.sort_order || index
        }));

        const { error: variationError } = await supabase
          .from('service_variations')
          .insert(variationInserts);

        if (variationError) throw variationError;
      }

      return service.id;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  /**
   * Update an existing service
   */
  async updateService(serviceId: string, formData: ServiceFormData): Promise<void> {
    try {
      // Update main service data
      const { error: serviceError } = await supabase
        .from('services')
        .update({
          name_en: formData.name_en,
          name_ar: formData.name_ar,
          description_en: formData.description_en,
          description_ar: formData.description_ar,
          category_id: formData.category_id,
          price: formData.price,
          duration_minutes: formData.duration_minutes,
          gender_preference: formData.gender_preference,
          image_urls: formData.image_urls || [],
          requires_consultation: formData.requires_consultation,
          allow_parallel_booking: formData.allow_parallel_booking,
          max_parallel_bookings: formData.max_parallel_bookings,
          preparation_time_minutes: formData.preparation_time_minutes,
          cleanup_time_minutes: formData.cleanup_time_minutes,
          max_advance_booking_days: formData.max_advance_booking_days,
          min_advance_booking_hours: formData.min_advance_booking_hours,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (serviceError) throw serviceError;

      // Update tags - delete existing and insert new
      await supabase
        .from('service_service_tags')
        .delete()
        .eq('service_id', serviceId);

      if (formData.tags.length > 0) {
        const tagInserts = formData.tags.map(tagId => ({
          service_id: serviceId,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('service_service_tags')
          .insert(tagInserts);

        if (tagError) throw tagError;
      }

      // Update variations - delete existing and insert new
      await supabase
        .from('service_variations')
        .delete()
        .eq('service_id', serviceId);

      if (formData.variations.length > 0) {
        const variationInserts = formData.variations.map((variation, index) => ({
          service_id: serviceId,
          ...variation,
          sort_order: variation.sort_order || index
        }));

        const { error: variationError } = await supabase
          .from('service_variations')
          .insert(variationInserts);

        if (variationError) throw variationError;
      }
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  /**
   * Delete a service
   */
  async deleteService(serviceId: string): Promise<void> {
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('services')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  }

  /**
   * Toggle service active status
   */
  async toggleServiceStatus(serviceId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('services')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling service status:', error);
      throw error;
    }
  }

  /**
   * Upload service image to Supabase Storage
   */
  async uploadServiceImage(providerId: string, imageUri: string, imageBase64?: string): Promise<string> {
    try {
      const fileName = `${providerId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      let uploadData;
      if (imageBase64) {
        // Convert base64 to blob
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        uploadData = buffer;
      } else {
        // For React Native, we'll need to fetch the image as blob
        const response = await fetch(imageUri);
        uploadData = await response.blob();
      }

      const { data, error } = await supabase.storage
        .from('service-images')
        .upload(fileName, uploadData, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('service-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Get service templates
   */
  async getServiceTemplates(categoryId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('service_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_popular', { ascending: false })
        .order('name_en', { ascending: true });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching service templates:', error);
      throw error;
    }
  }

  /**
   * Create service from template
   */
  async createServiceFromTemplate(providerId: string, templateId: string, customizations: Partial<ServiceFormData>): Promise<string> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('service_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Create service based on template
      const serviceData: ServiceFormData = {
        name_en: customizations.name_en || template.name_en,
        name_ar: customizations.name_ar || template.name_ar,
        description_en: customizations.description_en || template.description_en || '',
        description_ar: customizations.description_ar || template.description_ar || '',
        category_id: template.category_id,
        price: customizations.price || template.typical_price_range_min || 0,
        duration_minutes: customizations.duration_minutes || template.typical_duration_minutes || 30,
        gender_preference: customizations.gender_preference || 'unisex',
        tags: customizations.tags || [],
        variations: customizations.variations || [],
        image_urls: customizations.image_urls || [],
        requires_consultation: customizations.requires_consultation || false,
        allow_parallel_booking: customizations.allow_parallel_booking || false,
        max_parallel_bookings: customizations.max_parallel_bookings || 1,
        preparation_time_minutes: customizations.preparation_time_minutes || 0,
        cleanup_time_minutes: customizations.cleanup_time_minutes || 0,
        max_advance_booking_days: customizations.max_advance_booking_days || 30,
        min_advance_booking_hours: customizations.min_advance_booking_hours || 2,
      };

      return await this.createService(providerId, serviceData);
    } catch (error) {
      console.error('Error creating service from template:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const serviceManagementService = new ServiceManagementService();