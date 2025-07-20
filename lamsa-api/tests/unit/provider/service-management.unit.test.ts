/**
 * Unit Tests for Service Creation and Pricing Management
 * Tests service CRUD operations, pricing models, and bilingual content
 */

import { Request, Response } from 'express';
import {
  createService,
  updateService,
  deleteService,
  getProviderServices,
  updateServicePricing,
  updateServiceAvailability
} from '../../../src/controllers/service-management.controller';
import * as supabaseSimple from '../../../src/config/supabase-simple';

// Mock dependencies
jest.mock('../../../src/config/supabase-simple');

const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;

describe('Service Creation and Pricing Management', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  const mockProviderUser = {
    userId: 'provider-123',
    role: 'provider',
    phone: '+962771234567'
  };

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: mockProviderUser
    };
    
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    };

    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('Service Creation', () => {
    const validServiceData = {
      name: 'Hair Styling قص وتصفيف',
      nameAr: 'قص وتصفيف الشعر',
      description: 'Professional hair cutting and styling services',
      descriptionAr: 'خدمات قص وتصفيف الشعر الاحترافية',
      category: 'hair_services',
      categoryAr: 'خدمات الشعر',
      duration: 60, // minutes
      basePrice: 25.00, // JOD
      currency: 'JOD',
      isActive: true,
      tags: ['haircut', 'styling', 'wash'],
      tagsAr: ['قص الشعر', 'التصفيف', 'الغسيل'],
      requirements: ['Clean hair preferred'],
      requirementsAr: ['يفضل شعر نظيف'],
      includes: ['Hair wash', 'Cut', 'Basic styling'],
      includesAr: ['غسيل الشعر', 'القص', 'التصفيف الأساسي'],
      pricing: {
        type: 'fixed', // fixed, tiered, custom
        basePrice: 25.00,
        currency: 'JOD',
        discounts: {
          firstTime: { percentage: 15, description: 'First time client discount' },
          bulk: { minServices: 3, percentage: 10, description: 'Multiple services discount' }
        }
      }
    };

    test('should create service with complete bilingual details', async () => {
      mockSupabase.createService.mockResolvedValue({
        success: true,
        service: {
          id: 'service-123',
          providerId: 'provider-123',
          ...validServiceData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      mockReq.body = validServiceData;

      await createService(mockReq as Request, mockRes as Response);

      expect(mockSupabase.createService).toHaveBeenCalledWith(
        'provider-123',
        expect.objectContaining(validServiceData)
      );

      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Service created successfully',
        messageAr: 'تم إنشاء الخدمة بنجاح',
        service: expect.objectContaining({
          id: 'service-123',
          providerId: 'provider-123',
          name: 'Hair Styling قص وتصفيف',
          nameAr: 'قص وتصفيف الشعر'
        })
      });
    });

    test('should validate required service fields', async () => {
      const incompleteServiceData = {
        name: 'Test Service',
        duration: 30
        // Missing required fields
      };

      mockReq.body = incompleteServiceData;

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Required service fields are missing',
        messageAr: 'حقول الخدمة المطلوبة مفقودة',
        missingFields: expect.arrayContaining(['nameAr', 'description', 'descriptionAr', 'category', 'basePrice'])
      });
    });

    test('should validate Arabic service content', async () => {
      const invalidArabicData = {
        ...validServiceData,
        nameAr: 'English Name', // Should be Arabic
        descriptionAr: 'English description', // Should be Arabic
        tagsAr: ['english', 'tags'] // Should be Arabic
      };

      mockReq.body = invalidArabicData;

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_ARABIC_CONTENT',
        message: 'Arabic fields must contain Arabic characters',
        messageAr: 'يجب أن تحتوي الحقول العربية على أحرف عربية',
        invalidFields: ['nameAr', 'descriptionAr', 'tagsAr']
      });
    });

    test('should validate service category', async () => {
      const invalidCategoryData = {
        ...validServiceData,
        category: 'invalid_category'
      };

      mockReq.body = invalidCategoryData;

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_SERVICE_CATEGORY',
        message: 'Invalid service category',
        messageAr: 'فئة الخدمة غير صحيحة',
        allowedCategories: expect.arrayContaining([
          'hair_services', 'facial_services', 'nail_services', 'massage_services', 'makeup_services'
        ])
      });
    });

    test('should validate service duration limits', async () => {
      const invalidDurationData = {
        ...validServiceData,
        duration: 0 // Invalid - must be positive
      };

      mockReq.body = invalidDurationData;

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_DURATION',
        message: 'Service duration must be between 15 and 480 minutes',
        messageAr: 'يجب أن تكون مدة الخدمة بين 15 و 480 دقيقة',
        minDuration: 15,
        maxDuration: 480
      });
    });

    test('should validate pricing structure', async () => {
      const invalidPricingData = {
        ...validServiceData,
        basePrice: -10, // Negative price
        pricing: {
          type: 'invalid_type',
          basePrice: 'not-a-number'
        }
      };

      mockReq.body = invalidPricingData;

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_PRICING',
        message: 'Service pricing is invalid',
        messageAr: 'تسعير الخدمة غير صحيح',
        pricingErrors: {
          basePrice: 'Must be a positive number',
          pricingType: 'Must be one of: fixed, tiered, custom'
        }
      });
    });
  });

  describe('Service Updates', () => {
    test('should update service with partial data', async () => {
      const serviceId = 'service-123';
      const updateData = {
        name: 'Updated Hair Styling الجديد',
        nameAr: 'تصفيف الشعر المحدث',
        basePrice: 30.00,
        duration: 75
      };

      mockReq.params = { serviceId };
      mockReq.body = updateData;

      mockSupabase.updateService.mockResolvedValue({
        success: true,
        service: {
          id: serviceId,
          providerId: 'provider-123',
          ...updateData,
          updatedAt: new Date().toISOString()
        }
      });

      await updateService(mockReq as Request, mockRes as Response);

      expect(mockSupabase.updateService).toHaveBeenCalledWith(
        serviceId,
        'provider-123',
        updateData
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Service updated successfully',
        messageAr: 'تم تحديث الخدمة بنجاح',
        service: expect.objectContaining(updateData)
      });
    });

    test('should prevent updating service of another provider', async () => {
      const serviceId = 'service-456';
      mockReq.params = { serviceId };
      mockReq.body = { name: 'Unauthorized Update' };

      mockSupabase.updateService.mockResolvedValue({
        success: false,
        error: 'SERVICE_NOT_FOUND',
        message: 'Service not found or access denied'
      });

      await updateService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'SERVICE_NOT_FOUND',
        message: 'Service not found or access denied',
        messageAr: 'الخدمة غير موجودة أو تم رفض الوصول'
      });
    });

    test('should validate updated Arabic content', async () => {
      const serviceId = 'service-123';
      const invalidUpdateData = {
        nameAr: 'English Name Instead',
        descriptionAr: 'English description'
      };

      mockReq.params = { serviceId };
      mockReq.body = invalidUpdateData;

      await updateService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_ARABIC_CONTENT',
        message: 'Arabic fields must contain Arabic characters',
        messageAr: 'يجب أن تحتوي الحقول العربية على أحرف عربية'
      });
    });
  });

  describe('Service Pricing Management', () => {
    test('should update service pricing with discounts', async () => {
      const serviceId = 'service-123';
      const pricingData = {
        type: 'tiered',
        basePrice: 25.00,
        currency: 'JOD',
        tiers: [
          { duration: 30, price: 20.00, name: 'Basic', nameAr: 'أساسي' },
          { duration: 60, price: 35.00, name: 'Standard', nameAr: 'قياسي' },
          { duration: 90, price: 50.00, name: 'Premium', nameAr: 'مميز' }
        ],
        discounts: {
          firstTime: { percentage: 20, description: 'New client special' },
          loyalty: { minVisits: 5, percentage: 15, description: 'Loyal client discount' },
          ramadan: { 
            enabled: true, 
            percentage: 10, 
            description: 'Ramadan special offer',
            descriptionAr: 'عرض خاص برمضان'
          }
        },
        seasonalPricing: {
          enabled: true,
          ramadan: { multiplier: 0.9 }, // 10% discount during Ramadan
          eid: { multiplier: 1.2 }, // 20% premium during Eid
          wedding: { multiplier: 1.5 } // 50% premium for wedding season
        }
      };

      mockReq.params = { serviceId };
      mockReq.body = pricingData;

      mockSupabase.updateServicePricing.mockResolvedValue({
        success: true,
        pricing: pricingData
      });

      await updateServicePricing(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Service pricing updated successfully',
        messageAr: 'تم تحديث تسعير الخدمة بنجاح',
        pricing: pricingData
      });
    });

    test('should validate pricing tier structure', async () => {
      const serviceId = 'service-123';
      const invalidTiersData = {
        type: 'tiered',
        tiers: [
          { duration: 60, price: 30.00 },
          { duration: 30, price: 35.00 } // Duration not in ascending order
        ]
      };

      mockReq.params = { serviceId };
      mockReq.body = invalidTiersData;

      await updateServicePricing(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_PRICING_TIERS',
        message: 'Pricing tiers must be in ascending order by duration',
        messageAr: 'يجب أن تكون مستويات التسعير مرتبة تصاعدياً حسب المدة'
      });
    });

    test('should validate discount percentages', async () => {
      const serviceId = 'service-123';
      const invalidDiscountData = {
        discounts: {
          firstTime: { percentage: 150 }, // Too high
          loyalty: { percentage: -10 } // Negative
        }
      };

      mockReq.params = { serviceId };
      mockReq.body = invalidDiscountData;

      await updateServicePricing(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_DISCOUNT_PERCENTAGE',
        message: 'Discount percentages must be between 0 and 100',
        messageAr: 'نسب الخصم يجب أن تكون بين 0 و 100',
        invalidDiscounts: ['firstTime', 'loyalty']
      });
    });

    test('should handle JOD currency validation', async () => {
      const serviceId = 'service-123';
      const invalidCurrencyData = {
        basePrice: 25.00,
        currency: 'USD' // Should be JOD for Jordan market
      };

      mockReq.params = { serviceId };
      mockReq.body = invalidCurrencyData;

      await updateServicePricing(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_CURRENCY',
        message: 'Currency must be JOD for Jordan market',
        messageAr: 'العملة يجب أن تكون دينار أردني للسوق الأردني',
        allowedCurrency: 'JOD'
      });
    });
  });

  describe('Service Availability Management', () => {
    test('should update service availability schedule', async () => {
      const serviceId = 'service-123';
      const availabilityData = {
        isActive: true,
        schedule: {
          sunday: { available: true, slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
          monday: { available: true, slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
          tuesday: { available: true, slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
          wednesday: { available: true, slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
          thursday: { available: true, slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
          friday: { available: false, slots: [] }, // Friday closed
          saturday: { available: true, slots: ['10:00', '11:00', '14:00'] }
        },
        blackoutDates: [
          {
            date: '2024-07-17', // Eid holiday
            reason: 'Eid Al-Adha holiday',
            reasonAr: 'عطلة عيد الأضحى'
          }
        ],
        advanceBooking: {
          minHours: 2,
          maxDays: 30
        },
        maxConcurrentBookings: 3
      };

      mockReq.params = { serviceId };
      mockReq.body = availabilityData;

      mockSupabase.updateServiceAvailability.mockResolvedValue({
        success: true,
        availability: availabilityData
      });

      await updateServiceAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Service availability updated successfully',
        messageAr: 'تم تحديث توفر الخدمة بنجاح',
        availability: availabilityData
      });
    });

    test('should validate time slot format', async () => {
      const serviceId = 'service-123';
      const invalidSlotsData = {
        schedule: {
          sunday: { available: true, slots: ['9:00', '25:00', 'invalid-time'] }
        }
      };

      mockReq.params = { serviceId };
      mockReq.body = invalidSlotsData;

      await updateServiceAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TIME_SLOTS',
        message: 'Time slots must be in HH:MM format',
        messageAr: 'فترات الوقت يجب أن تكون بتنسيق HH:MM',
        invalidSlots: ['9:00', '25:00', 'invalid-time']
      });
    });

    test('should validate advance booking limits', async () => {
      const serviceId = 'service-123';
      const invalidAdvanceBookingData = {
        advanceBooking: {
          minHours: -1, // Negative
          maxDays: 0 // Zero
        }
      };

      mockReq.params = { serviceId };
      mockReq.body = invalidAdvanceBookingData;

      await updateServiceAvailability(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_ADVANCE_BOOKING',
        message: 'Invalid advance booking configuration',
        messageAr: 'إعداد الحجز المسبق غير صحيح',
        errors: {
          minHours: 'Must be 0 or greater',
          maxDays: 'Must be greater than 0'
        }
      });
    });
  });

  describe('Service Deletion', () => {
    test('should delete service successfully', async () => {
      const serviceId = 'service-123';
      mockReq.params = { serviceId };

      mockSupabase.deleteService.mockResolvedValue({
        success: true,
        message: 'Service deleted successfully'
      });

      await deleteService(mockReq as Request, mockRes as Response);

      expect(mockSupabase.deleteService).toHaveBeenCalledWith(serviceId, 'provider-123');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Service deleted successfully',
        messageAr: 'تم حذف الخدمة بنجاح'
      });
    });

    test('should prevent deletion if service has active bookings', async () => {
      const serviceId = 'service-123';
      mockReq.params = { serviceId };

      mockSupabase.deleteService.mockResolvedValue({
        success: false,
        error: 'SERVICE_HAS_ACTIVE_BOOKINGS',
        message: 'Cannot delete service with active bookings',
        activeBookings: 3
      });

      await deleteService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'SERVICE_HAS_ACTIVE_BOOKINGS',
        message: 'Cannot delete service with active bookings',
        messageAr: 'لا يمكن حذف خدمة بها حجوزات نشطة',
        activeBookings: 3
      });
    });
  });

  describe('Provider Services Listing', () => {
    test('should get all provider services with pagination', async () => {
      const mockServices = [
        {
          id: 'service-1',
          name: 'Hair Styling',
          nameAr: 'تصفيف الشعر',
          basePrice: 25.00,
          duration: 60,
          isActive: true
        },
        {
          id: 'service-2',
          name: 'Facial Treatment',
          nameAr: 'علاج الوجه',
          basePrice: 40.00,
          duration: 90,
          isActive: true
        }
      ];

      mockReq.query = { page: '1', limit: '10' };

      mockSupabase.getProviderServices.mockResolvedValue({
        success: true,
        services: mockServices,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      });

      await getProviderServices(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        services: mockServices,
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 2
        })
      });
    });

    test('should filter services by category', async () => {
      mockReq.query = { category: 'hair_services' };

      mockSupabase.getProviderServices.mockResolvedValue({
        success: true,
        services: [
          {
            id: 'service-1',
            name: 'Hair Styling',
            category: 'hair_services'
          }
        ]
      });

      await getProviderServices(mockReq as Request, mockRes as Response);

      expect(mockSupabase.getProviderServices).toHaveBeenCalledWith(
        'provider-123',
        expect.objectContaining({ category: 'hair_services' })
      );
    });
  });

  describe('Input Validation and Security', () => {
    test('should sanitize HTML in service descriptions', async () => {
      const maliciousData = {
        name: 'Test Service',
        nameAr: 'خدمة الاختبار',
        description: '<script>alert("xss")</script>Professional service',
        descriptionAr: '<img src="x" onerror="alert(1)">خدمة احترافية'
      };

      mockReq.body = maliciousData;

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid characters detected in input',
        messageAr: 'تم اكتشاف أحرف غير صحيحة في المدخلات'
      });
    });

    test('should handle extremely large service data', async () => {
      const largeData = {
        name: 'A'.repeat(1000),
        description: 'B'.repeat(10000),
        tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`)
      };

      mockReq.body = largeData;

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'DATA_TOO_LARGE',
        message: 'Service data exceeds size limits',
        messageAr: 'بيانات الخدمة تتجاوز حدود الحجم'
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors during service creation', async () => {
      mockSupabase.createService.mockRejectedValue(new Error('Database connection failed'));

      mockReq.body = {
        name: 'Test Service',
        nameAr: 'خدمة الاختبار',
        description: 'Test description',
        descriptionAr: 'وصف الاختبار',
        category: 'hair_services',
        duration: 60,
        basePrice: 25.00
      };

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Service creation failed due to server error',
        messageAr: 'فشل إنشاء الخدمة بسبب خطأ في الخادم'
      });
    });

    test('should handle unexpected errors gracefully', async () => {
      mockSupabase.createService.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockReq.body = { name: 'Test Service' };

      await createService(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        messageAr: 'حدث خطأ غير متوقع'
      });
    });
  });
});