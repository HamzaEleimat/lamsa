import { Request, Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { supabase } from '../config/supabase-simple';
import { 
  EnhancedProvider, 
  UpdateProviderProfileRequest, 
  UpdateWorkingHoursRequest,
  AddServiceCategoryRequest,
  UploadGalleryImageRequest,
  ProviderAnalytics,
  JORDAN_DEFAULT_CONFIG
} from '../types/enhanced-provider.types';

export class EnhancedProviderController {
  /**
   * Get enhanced provider profile with all related data
   * GET /api/providers/:id/enhanced
   */
  async getEnhancedProviderProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Fetch provider with all related data
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .select(`
          *,
          service_categories:provider_service_categories(
            id,
            category_id,
            is_primary,
            expertise_level,
            years_experience,
            certification_url,
            portfolio_images,
            service_categories(name_en, name_ar, icon)
          ),
          gallery:provider_gallery(
            id,
            image_url,
            thumbnail_url,
            category,
            title,
            title_ar,
            description,
            description_ar,
            sort_order,
            is_active,
            metadata
          ),
          working_hours:provider_working_hours(
            day_of_week,
            is_working_day,
            shifts,
            special_notes,
            special_notes_ar
          )
        `)
        .eq('id', id)
        .single();
      
      if (providerError || !provider) {
        throw new AppError('Provider not found', 404);
      }
      
      // Transform data to match EnhancedProvider interface
      const enhancedProvider: EnhancedProvider = {
        id: provider.id,
        businessName: provider.business_name || provider.business_name_en,
        businessNameAr: provider.business_name_ar,
        phone: provider.phone,
        email: provider.email,
        avatarUrl: provider.avatar_url,
        coverImageUrl: provider.cover_image_url,
        bio: provider.bio || provider.bio_en,
        bioAr: provider.bio_ar,
        location: {
          latitude: provider.location?.coordinates?.[1] || provider.latitude || 0,
          longitude: provider.location?.coordinates?.[0] || provider.longitude || 0,
        },
        address: provider.address,
        addressAr: provider.address_ar,
        city: provider.city,
        businessType: provider.business_type,
        serviceRadiusKm: provider.service_radius_km || provider.travel_radius_km,
        yearsOfExperience: provider.years_of_experience,
        certifications: provider.certifications || [],
        awards: provider.awards || [],
        specializations: provider.specializations || [],
        establishedYear: provider.established_year,
        teamSize: provider.team_size,
        languagesSpoken: provider.languages_spoken || ['ar', 'en'],
        paymentMethodsAccepted: provider.payment_methods_accepted || ['cash', 'card'],
        seoSlug: provider.seo_slug,
        metaDescriptionEn: provider.meta_description_en,
        metaDescriptionAr: provider.meta_description_ar,
        featuredUntil: provider.featured_until,
        boostScore: provider.boost_score || 0,
        minimumBookingNoticeHours: provider.minimum_booking_notice_hours || 2,
        maximumAdvanceBookingDays: provider.maximum_advance_booking_days || 30,
        cancellationPolicyEn: provider.cancellation_policy_en,
        cancellationPolicyAr: provider.cancellation_policy_ar,
        depositRequired: provider.deposit_required || false,
        depositPercentage: provider.deposit_percentage || 0,
        whatsappNumber: provider.whatsapp_number,
        instagramHandle: provider.instagram_handle,
        websiteUrl: provider.website_url,
        socialMedia: provider.social_media || [],
        accessibilityFeatures: provider.accessibility_features || [],
        parkingAvailable: provider.parking_available || false,
        verified: provider.verified,
        active: provider.active,
        onboardingStatus: provider.onboarding_status,
        verificationStatus: provider.verification_status,
        qualityTier: provider.quality_tier || 1,
        rating: provider.rating || 0,
        totalReviews: provider.total_reviews || 0,
        profileCompletionPercentage: provider.profile_completion_percentage || 0,
        serviceCategories: provider.service_categories?.map((sc: any) => ({
          id: sc.id,
          providerId: id,
          categoryId: sc.category_id,
          isPrimary: sc.is_primary,
          expertiseLevel: sc.expertise_level,
          yearsExperience: sc.years_experience,
          certificationUrl: sc.certification_url,
          portfolioImages: sc.portfolio_images || [],
          categoryNameEn: sc.service_categories?.name_en,
          categoryNameAr: sc.service_categories?.name_ar,
          categoryIcon: sc.service_categories?.icon,
          createdAt: sc.created_at,
          updatedAt: sc.updated_at,
        })) || [],
        gallery: provider.gallery?.filter((img: any) => img.is_active) || [],
        workingHours: {
          timezone: 'Asia/Amman',
          defaultSchedule: this.transformWorkingHours(provider.working_hours || []),
          specialSchedules: {
            holidays: JORDAN_DEFAULT_CONFIG.holidays,
          },
          flexibleSchedules: {
            mobileProvider: provider.is_mobile || false,
            appointmentOnly: false,
            walkInsAccepted: true,
            extendsForClients: false,
          },
        },
        createdAt: provider.created_at,
        updatedAt: provider.updated_at,
      };
      
      const response: ApiResponse<EnhancedProvider> = {
        success: true,
        data: enhancedProvider,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update provider profile with enhanced fields
   * PUT /api/providers/:id/profile
   */
  async updateProviderProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateProviderProfileRequest = req.body;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user?.id !== id) {
        throw new AppError('Unauthorized to update this provider profile', 403);
      }
      
      // Build update object
      const dbUpdate: any = {
        updated_at: new Date().toISOString(),
      };
      
      if (updateData.basicInfo) {
        const { basicInfo } = updateData;
        if (basicInfo.businessName) dbUpdate.business_name = basicInfo.businessName;
        if (basicInfo.businessNameAr) dbUpdate.business_name_ar = basicInfo.businessNameAr;
        if (basicInfo.bio) dbUpdate.bio = basicInfo.bio;
        if (basicInfo.bioAr) dbUpdate.bio_ar = basicInfo.bioAr;
        if (basicInfo.email) dbUpdate.email = basicInfo.email;
        if (basicInfo.whatsappNumber) dbUpdate.whatsapp_number = basicInfo.whatsappNumber;
        if (basicInfo.websiteUrl) dbUpdate.website_url = basicInfo.websiteUrl;
        if (basicInfo.instagramHandle) dbUpdate.instagram_handle = basicInfo.instagramHandle;
      }
      
      if (updateData.professionalInfo) {
        const { professionalInfo } = updateData;
        if (professionalInfo.yearsOfExperience) dbUpdate.years_of_experience = professionalInfo.yearsOfExperience;
        if (professionalInfo.establishedYear) dbUpdate.established_year = professionalInfo.establishedYear;
        if (professionalInfo.teamSize) dbUpdate.team_size = professionalInfo.teamSize;
        if (professionalInfo.specializations) dbUpdate.specializations = professionalInfo.specializations;
        if (professionalInfo.certifications) dbUpdate.certifications = professionalInfo.certifications;
        if (professionalInfo.awards) dbUpdate.awards = professionalInfo.awards;
      }
      
      if (updateData.businessSettings) {
        const { businessSettings } = updateData;
        if (businessSettings.minimumBookingNoticeHours) dbUpdate.minimum_booking_notice_hours = businessSettings.minimumBookingNoticeHours;
        if (businessSettings.maximumAdvanceBookingDays) dbUpdate.maximum_advance_booking_days = businessSettings.maximumAdvanceBookingDays;
        if (businessSettings.depositRequired !== undefined) dbUpdate.deposit_required = businessSettings.depositRequired;
        if (businessSettings.depositPercentage) dbUpdate.deposit_percentage = businessSettings.depositPercentage;
        if (businessSettings.cancellationPolicyEn) dbUpdate.cancellation_policy_en = businessSettings.cancellationPolicyEn;
        if (businessSettings.cancellationPolicyAr) dbUpdate.cancellation_policy_ar = businessSettings.cancellationPolicyAr;
        if (businessSettings.paymentMethodsAccepted) dbUpdate.payment_methods_accepted = businessSettings.paymentMethodsAccepted;
        if (businessSettings.languagesSpoken) dbUpdate.languages_spoken = businessSettings.languagesSpoken;
      }
      
      if (updateData.accessibility) {
        const { accessibility } = updateData;
        if (accessibility.parkingAvailable !== undefined) dbUpdate.parking_available = accessibility.parkingAvailable;
        if (accessibility.accessibilityFeatures) dbUpdate.accessibility_features = accessibility.accessibilityFeatures;
      }
      
      // Update provider
      const { data: updatedProvider, error } = await supabase
        .from('providers')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw new AppError('Failed to update provider profile', 500);
      }
      
      // Recalculate profile completion
      await supabase.rpc('calculate_enhanced_profile_completion', {
        p_provider_id: id
      });
      
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
   * Update provider working hours
   * PUT /api/providers/:id/working-hours
   */
  async updateWorkingHours(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { defaultSchedule }: UpdateWorkingHoursRequest = req.body;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user?.id !== id) {
        throw new AppError('Unauthorized to update working hours', 403);
      }
      
      // Delete existing working hours
      await supabase
        .from('provider_working_hours')
        .delete()
        .eq('provider_id', id);
      
      // Insert new working hours
      const workingHoursData = Object.entries(defaultSchedule).map(([dayOfWeek, schedule]) => ({
        provider_id: id,
        day_of_week: parseInt(dayOfWeek),
        is_working_day: schedule.isWorkingDay,
        shifts: schedule.shifts,
        special_notes: schedule.specialNotes,
        special_notes_ar: schedule.specialNotesAr,
      }));
      
      const { error: hoursError } = await supabase
        .from('provider_working_hours')
        .insert(workingHoursData);
      
      if (hoursError) {
        throw new AppError('Failed to update working hours', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Working hours updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add service category to provider
   * POST /api/providers/:id/categories
   */
  async addServiceCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const categoryData: AddServiceCategoryRequest = req.body;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user?.id !== id) {
        throw new AppError('Unauthorized to add service category', 403);
      }
      
      // If this is marked as primary, unset other primary categories
      if (categoryData.isPrimary) {
        await supabase
          .from('provider_service_categories')
          .update({ is_primary: false })
          .eq('provider_id', id);
      }
      
      // Add the new category
      const { data: newCategory, error } = await supabase
        .from('provider_service_categories')
        .insert({
          provider_id: id,
          category_id: categoryData.categoryId,
          is_primary: categoryData.isPrimary || false,
          expertise_level: categoryData.expertiseLevel,
          years_experience: categoryData.yearsExperience,
          certification_url: categoryData.certificationUrl,
          portfolio_images: categoryData.portfolioImages || [],
        })
        .select(`
          *,
          service_categories(name_en, name_ar, icon)
        `)
        .single();
      
      if (error) {
        throw new AppError('Failed to add service category', 500);
      }
      
      const response: ApiResponse = {
        success: true,
        data: newCategory,
        message: 'Service category added successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload gallery image
   * POST /api/providers/:id/gallery
   */
  async uploadGalleryImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const imageData: UploadGalleryImageRequest = req.body;
      const file = req.file;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user?.id !== id) {
        throw new AppError('Unauthorized to upload gallery image', 403);
      }
      
      if (!file) {
        throw new AppError('No image file provided', 400);
      }
      
      // In production, upload to cloud storage (S3, Cloudinary, etc.)
      // For now, store as base64
      const imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      // Get next sort order
      const { data: lastImage } = await supabase
        .from('provider_gallery')
        .select('sort_order')
        .eq('provider_id', id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      
      const nextSortOrder = imageData.sortOrder || (lastImage?.sort_order || 0) + 1;
      
      // Insert gallery image
      const { data: newImage, error } = await supabase
        .from('provider_gallery')
        .insert({
          provider_id: id,
          image_url: imageUrl,
          category: imageData.category,
          title: imageData.title,
          title_ar: imageData.titleAr,
          description: imageData.description,
          description_ar: imageData.descriptionAr,
          sort_order: nextSortOrder,
          metadata: {
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date().toISOString(),
            altText: imageData.altText,
            altTextAr: imageData.altTextAr,
          },
        })
        .select()
        .single();
      
      if (error) {
        throw new AppError('Failed to upload gallery image', 500);
      }
      
      // Recalculate profile completion
      await supabase.rpc('calculate_enhanced_profile_completion', {
        p_provider_id: id
      });
      
      const response: ApiResponse = {
        success: true,
        data: newImage,
        message: 'Gallery image uploaded successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider analytics
   * GET /api/providers/:id/analytics
   */
  async getProviderAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check authorization
      if (req.user?.type !== 'provider' || req.user?.id !== id) {
        throw new AppError('Unauthorized to view analytics', 403);
      }
      
      // Get profile completion score
      const { data: completionScore } = await supabase
        .rpc('calculate_enhanced_profile_completion', {
          p_provider_id: id
        });
      
      // Mock analytics data - in production, integrate with analytics service
      const analytics: ProviderAnalytics = {
        profileViews: {
          total: 1250,
          thisWeek: 45,
          thisMonth: 180,
          trend: 'up',
        },
        bookingConversion: {
          viewsToBookings: 12.5,
          averageBookingValue: 35.50,
          repeatCustomerRate: 68.2,
        },
        searchVisibility: {
          averagePosition: 3.2,
          impressions: 2150,
          clicks: 125,
          ctr: 5.8,
        },
        completionScore: {
          current: completionScore || 0,
          recommendations: this.getProfileRecommendations(completionScore || 0),
        },
      };
      
      const response: ApiResponse<ProviderAnalytics> = {
        success: true,
        data: analytics,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider by SEO slug
   * GET /api/providers/slug/:slug
   */
  async getProviderBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      
      const { data: provider, error } = await supabase
        .from('providers')
        .select('id')
        .eq('seo_slug', slug)
        .eq('active', true)
        .single();
      
      if (error || !provider) {
        throw new AppError('Provider not found', 404);
      }
      
      // Redirect to enhanced profile endpoint
      req.params.id = provider.id;
      await this.getEnhancedProviderProfile(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private transformWorkingHours(workingHours: any[]): any {
    const schedule: any = {};
    
    workingHours.forEach(wh => {
      schedule[wh.day_of_week] = {
        dayName: this.getDayName(wh.day_of_week),
        isWorkingDay: wh.is_working_day,
        shifts: wh.shifts || [],
        specialNotes: wh.special_notes,
        specialNotesAr: wh.special_notes_ar,
      };
    });
    
    // Fill missing days with default non-working days
    for (let i = 0; i <= 6; i++) {
      if (!schedule[i]) {
        schedule[i] = {
          dayName: this.getDayName(i),
          isWorkingDay: false,
          shifts: [],
        };
      }
    }
    
    return schedule;
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }

  private getProfileRecommendations(completionScore: number): string[] {
    const recommendations: string[] = [];
    
    if (completionScore < 50) {
      recommendations.push('Add a professional profile photo');
      recommendations.push('Write a compelling business description in both Arabic and English');
      recommendations.push('Upload portfolio images to showcase your work');
    }
    
    if (completionScore < 70) {
      recommendations.push('Set up your working hours schedule');
      recommendations.push('Add your specializations and certifications');
      recommendations.push('Connect your social media accounts');
    }
    
    if (completionScore < 90) {
      recommendations.push('Upload more portfolio images (aim for 5-10)');
      recommendations.push('Add your years of experience and team size');
      recommendations.push('Set up your cancellation and deposit policies');
    }
    
    if (completionScore >= 90) {
      recommendations.push('Great job! Your profile is nearly complete');
      recommendations.push('Consider adding customer testimonials');
      recommendations.push('Keep your portfolio updated with recent work');
    }
    
    return recommendations;
  }
}

export const enhancedProviderController = new EnhancedProviderController();
