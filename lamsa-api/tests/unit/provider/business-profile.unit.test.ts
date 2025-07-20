/**
 * Unit Tests for Business Profile Management
 * Tests profile setup including location, photos, and Arabic/English content
 */

import { Request, Response } from 'express';
import {
  updateBusinessProfile,
  uploadBusinessPhotos,
  updateBusinessLocation,
  getBusinessProfile,
  updateBusinessHours,
  updateBusinessSettings
} from '../../../src/controllers/enhanced-provider.controller';
import * as supabaseSimple from '../../../src/config/supabase-simple';

// Mock dependencies
jest.mock('../../../src/config/supabase-simple');

const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;

describe('Business Profile Management', () => {
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
      files: undefined,
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

  describe('Business Profile Updates', () => {
    const validProfileData = {
      businessName: 'Beauty Oasis الواحة',
      businessNameAr: 'واحة الجمال للسيدات',
      description: 'Premium beauty services in the heart of Amman',
      descriptionAr: 'خدمات جمال راقية في قلب عمان',
      specialties: ['haircut', 'makeup', 'facial', 'manicure'],
      specialtiesAr: ['قص الشعر', 'المكياج', 'العناية بالوجه', 'العناية بالأظافر'],
      businessType: 'beauty_salon',
      ownerName: 'Layla Ahmad',
      ownerNameAr: 'ليلى أحمد',
      contactInfo: {
        whatsapp: '+962771234567',
        instagram: '@beauty_oasis_jo',
        facebook: 'Beauty Oasis Jordan'
      }
    };

    test('should update business profile with bilingual content', async () => {
      mockSupabase.updateProviderProfile.mockResolvedValue({
        success: true,
        provider: {
          id: 'provider-123',
          ...validProfileData,
          updatedAt: new Date().toISOString()
        }
      });

      mockReq.body = validProfileData;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(mockSupabase.updateProviderProfile).toHaveBeenCalledWith(
        'provider-123',
        expect.objectContaining(validProfileData)
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Business profile updated successfully',
        messageAr: 'تم تحديث الملف التجاري بنجاح',
        provider: expect.objectContaining(validProfileData)
      });
    });

    test('should validate Arabic text contains Arabic characters', async () => {
      const invalidArabicData = {
        businessName: 'Beauty Salon',
        businessNameAr: 'Beauty Salon', // Should be Arabic
        description: 'Great services',
        descriptionAr: 'Great services' // Should be Arabic
      };

      mockReq.body = invalidArabicData;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_ARABIC_CONTENT',
        message: 'Arabic fields must contain Arabic characters',
        messageAr: 'يجب أن تحتوي الحقول العربية على أحرف عربية',
        invalidFields: ['businessNameAr', 'descriptionAr']
      });
    });

    test('should validate business name length in both languages', async () => {
      const invalidLengthData = {
        businessName: 'A', // Too short
        businessNameAr: 'أ', // Too short
        description: 'B'.repeat(2001), // Too long
        descriptionAr: 'ب'.repeat(2001) // Too long
      };

      mockReq.body = invalidLengthData;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_FIELD_LENGTH',
        message: 'Field lengths do not meet requirements',
        messageAr: 'أطوال الحقول لا تلبي المتطلبات',
        fieldErrors: {
          businessName: 'Must be between 2 and 100 characters',
          businessNameAr: 'يجب أن يكون بين 2 و 100 حرف',
          description: 'Must be less than 2000 characters',
          descriptionAr: 'يجب أن يكون أقل من 2000 حرف'
        }
      });
    });

    test('should validate specialties arrays in both languages', async () => {
      const invalidSpecialtiesData = {
        specialties: ['haircut', 'invalid_specialty'],
        specialtiesAr: ['قص الشعر', 'تخصص غير صحيح']
      };

      mockReq.body = invalidSpecialtiesData;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_SPECIALTIES',
        message: 'Some specialties are not recognized',
        messageAr: 'بعض التخصصات غير معترف بها',
        invalidSpecialties: ['invalid_specialty'],
        allowedSpecialties: expect.arrayContaining(['haircut', 'makeup', 'facial', 'manicure', 'pedicure'])
      });
    });

    test('should handle mixed Arabic-English content gracefully', async () => {
      const mixedContentData = {
        businessName: 'Beauty Salon صالون الجمال',
        description: 'Professional services خدمات احترافية for modern women للمرأة العصرية',
        specialties: ['haircut', 'مكياج', 'facial']
      };

      mockSupabase.updateProviderProfile.mockResolvedValue({
        success: true,
        provider: {
          id: 'provider-123',
          ...mixedContentData
        }
      });

      mockReq.body = mixedContentData;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        provider: expect.objectContaining(mixedContentData)
      });
    });

    test('should validate contact information format', async () => {
      const invalidContactData = {
        contactInfo: {
          whatsapp: 'invalid-phone', // Should be Jordan phone format
          instagram: 'invalid@handle', // Should start with @
          facebook: 'a'.repeat(101) // Too long
        }
      };

      mockReq.body = invalidContactData;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_CONTACT_INFO',
        message: 'Contact information format is invalid',
        messageAr: 'تنسيق معلومات الاتصال غير صحيح',
        contactErrors: {
          whatsapp: 'Must be a valid Jordan phone number',
          instagram: 'Must start with @ and contain valid characters',
          facebook: 'Must be less than 100 characters'
        }
      });
    });
  });

  describe('Business Photos Management', () => {
    test('should upload multiple business photos', async () => {
      const mockFiles = [
        {
          fieldname: 'photos',
          originalname: 'salon-interior.jpg',
          mimetype: 'image/jpeg',
          size: 1024000,
          buffer: Buffer.from('fake-image-data')
        },
        {
          fieldname: 'photos',
          originalname: 'staff-team.jpg',
          mimetype: 'image/jpeg',
          size: 1536000,
          buffer: Buffer.from('fake-image-data-2')
        }
      ];

      mockReq.files = mockFiles;

      mockSupabase.uploadBusinessPhotos.mockResolvedValue({
        success: true,
        photos: [
          {
            id: 'photo-1',
            url: 'https://storage.supabase.co/salon-interior.jpg',
            type: 'interior',
            caption: 'Salon interior view',
            captionAr: 'منظر داخلي للصالون'
          },
          {
            id: 'photo-2',
            url: 'https://storage.supabase.co/staff-team.jpg',
            type: 'team',
            caption: 'Professional staff team',
            captionAr: 'فريق العمل المحترف'
          }
        ]
      });

      await uploadBusinessPhotos(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Photos uploaded successfully',
        messageAr: 'تم رفع الصور بنجاح',
        photos: expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringContaining('salon-interior.jpg'),
            caption: expect.any(String),
            captionAr: expect.any(String)
          })
        ])
      });
    });

    test('should validate photo file types', async () => {
      const invalidFiles = [
        {
          fieldname: 'photos',
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
          size: 1024000
        },
        {
          fieldname: 'photos',
          originalname: 'video.mp4',
          mimetype: 'video/mp4',
          size: 5000000
        }
      ];

      mockReq.files = invalidFiles;

      await uploadBusinessPhotos(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_FILE_TYPE',
        message: 'Only image files are allowed',
        messageAr: 'يُسمح بملفات الصور فقط',
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        invalidFiles: ['document.pdf', 'video.mp4']
      });
    });

    test('should validate photo file sizes', async () => {
      const oversizedFiles = [
        {
          fieldname: 'photos',
          originalname: 'large-image.jpg',
          mimetype: 'image/jpeg',
          size: 10000000 // 10MB - too large
        }
      ];

      mockReq.files = oversizedFiles;

      await uploadBusinessPhotos(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'Image file size must be less than 5MB',
        messageAr: 'يجب أن يكون حجم ملف الصورة أقل من 5 ميجابايت',
        maxSize: '5MB',
        oversizedFiles: ['large-image.jpg']
      });
    });

    test('should limit maximum number of photos', async () => {
      const tooManyFiles = Array.from({ length: 11 }, (_, i) => ({
        fieldname: 'photos',
        originalname: `photo-${i}.jpg`,
        mimetype: 'image/jpeg',
        size: 1024000
      }));

      mockReq.files = tooManyFiles;

      await uploadBusinessPhotos(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'TOO_MANY_FILES',
        message: 'Maximum 10 photos allowed per upload',
        messageAr: 'الحد الأقصى 10 صور لكل رفع',
        maxPhotos: 10,
        submittedCount: 11
      });
    });
  });

  describe('Business Location Management', () => {
    test('should update business location with Jordan coordinates', async () => {
      const validLocationData = {
        address: 'Rainbow Street, Jabal Amman',
        addressAr: 'شارع الرينبو، جبل عمان',
        coordinates: {
          lat: 31.9539,
          lng: 35.9285
        },
        district: 'Jabal Amman',
        districtAr: 'جبل عمان',
        city: 'Amman',
        cityAr: 'عمان',
        landmarks: ['Rainbow Street', 'First Circle'],
        landmarksAr: ['شارع الرينبو', 'الدوار الأول']
      };

      mockSupabase.updateBusinessLocation.mockResolvedValue({
        success: true,
        location: validLocationData
      });

      mockReq.body = validLocationData;

      await updateBusinessLocation(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Business location updated successfully',
        messageAr: 'تم تحديث موقع النشاط التجاري بنجاح',
        location: validLocationData
      });
    });

    test('should validate coordinates are within Jordan boundaries', async () => {
      const invalidLocationData = {
        address: 'Dubai Mall, Dubai',
        coordinates: {
          lat: 25.1972, // Dubai coordinates (outside Jordan)
          lng: 55.2796
        }
      };

      mockReq.body = invalidLocationData;

      await updateBusinessLocation(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'LOCATION_OUTSIDE_JORDAN',
        message: 'Business location must be within Jordan',
        messageAr: 'يجب أن يكون موقع النشاط التجاري داخل الأردن',
        jordanBounds: {
          north: 33.3663,
          south: 29.1850,
          east: 39.3012,
          west: 34.8844
        }
      });
    });

    test('should validate required location fields', async () => {
      const incompleteLocationData = {
        coordinates: {
          lat: 31.9566,
          lng: 35.9457
        }
        // Missing address, district, city
      };

      mockReq.body = incompleteLocationData;

      await updateBusinessLocation(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'MISSING_LOCATION_FIELDS',
        message: 'Address, district, and city are required',
        messageAr: 'العنوان والمنطقة والمدينة مطلوبة',
        missingFields: ['address', 'addressAr', 'district', 'districtAr', 'city', 'cityAr']
      });
    });
  });

  describe('Business Hours Configuration', () => {
    test('should update business hours for Jordan work week', async () => {
      const jordanBusinessHours = {
        sunday: { open: '09:00', close: '18:00', closed: false },
        monday: { open: '09:00', close: '18:00', closed: false },
        tuesday: { open: '09:00', close: '18:00', closed: false },
        wednesday: { open: '09:00', close: '18:00', closed: false },
        thursday: { open: '09:00', close: '18:00', closed: false },
        friday: { closed: true }, // Friday is typically closed
        saturday: { open: '10:00', close: '16:00', closed: false },
        breakTimes: {
          enabled: true,
          start: '13:00',
          end: '14:00',
          description: 'Lunch break',
          descriptionAr: 'استراحة الغداء'
        },
        ramadanHours: {
          enabled: true,
          sunday: { open: '10:00', close: '15:00', closed: false },
          monday: { open: '10:00', close: '15:00', closed: false },
          tuesday: { open: '10:00', close: '15:00', closed: false },
          wednesday: { open: '10:00', close: '15:00', closed: false },
          thursday: { open: '10:00', close: '15:00', closed: false },
          friday: { closed: true },
          saturday: { open: '11:00', close: '14:00', closed: false }
        }
      };

      mockSupabase.updateBusinessHours.mockResolvedValue({
        success: true,
        businessHours: jordanBusinessHours
      });

      mockReq.body = jordanBusinessHours;

      await updateBusinessHours(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Business hours updated successfully',
        messageAr: 'تم تحديث ساعات العمل بنجاح',
        businessHours: jordanBusinessHours
      });
    });

    test('should validate time format in business hours', async () => {
      const invalidTimeFormat = {
        sunday: { open: '9:00', close: '6:00 PM' }, // Invalid format
        monday: { open: '25:00', close: '18:00' } // Invalid hour
      };

      mockReq.body = invalidTimeFormat;

      await updateBusinessHours(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TIME_FORMAT',
        message: 'Time must be in HH:MM format (24-hour)',
        messageAr: 'يجب أن يكون الوقت بتنسيق HH:MM (24 ساعة)',
        invalidTimes: ['9:00', '6:00 PM', '25:00'],
        expectedFormat: 'HH:MM (e.g., 09:00, 18:30)'
      });
    });

    test('should validate business hours logic', async () => {
      const invalidHoursLogic = {
        sunday: { open: '18:00', close: '09:00' }, // Close before open
        monday: { open: '09:00', close: '09:00' } // Same time
      };

      mockReq.body = invalidHoursLogic;

      await updateBusinessHours(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_BUSINESS_HOURS',
        message: 'Closing time must be after opening time',
        messageAr: 'يجب أن يكون وقت الإغلاق بعد وقت الفتح',
        invalidDays: ['sunday', 'monday']
      });
    });
  });

  describe('Arabic Text Validation Utilities', () => {
    test('should detect Arabic characters correctly', async () => {
      const testCases = [
        { text: 'صالون الجمال', expected: true },
        { text: 'Beauty Salon', expected: false },
        { text: 'صالون Beauty', expected: true }, // Mixed content
        { text: '١٢٣ صالون', expected: true }, // Arabic numerals
        { text: '', expected: false },
        { text: '123 456', expected: false }
      ];

      // This would test a utility function for Arabic detection
      testCases.forEach(({ text, expected }) => {
        const hasArabic = /[\u0600-\u06FF]/.test(text);
        expect(hasArabic).toBe(expected);
      });
    });

    test('should validate RTL text direction markers', async () => {
      const textWithRTLMarkers = {
        businessNameAr: '\u202Bصالون الجمال\u202C', // RTL embedding
        descriptionAr: 'خدمات تجميل احترافية'
      };

      mockReq.body = textWithRTLMarkers;

      // Should handle RTL markers gracefully
      mockSupabase.updateProviderProfile.mockResolvedValue({
        success: true,
        provider: { id: 'provider-123', ...textWithRTLMarkers }
      });

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
    });

    test('should sanitize and preserve Arabic diacritics', async () => {
      const arabicWithDiacritics = {
        businessNameAr: 'صَالُونُ الجَمَالِ', // With diacritics
        descriptionAr: 'خِدْمَاتُ تَجْمِيلٍ احْتِرَافِيَّةٍ'
      };

      mockSupabase.updateProviderProfile.mockResolvedValue({
        success: true,
        provider: { id: 'provider-123', ...arabicWithDiacritics }
      });

      mockReq.body = arabicWithDiacritics;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        provider: expect.objectContaining(arabicWithDiacritics)
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle file upload errors gracefully', async () => {
      mockReq.files = [];
      mockSupabase.uploadBusinessPhotos.mockRejectedValue(new Error('Storage service unavailable'));

      await uploadBusinessPhotos(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'UPLOAD_ERROR',
        message: 'Photo upload failed. Please try again.',
        messageAr: 'فشل رفع الصورة. يرجى المحاولة مرة أخرى.'
      });
    });

    test('should handle extremely long Unicode text', async () => {
      const longUnicodeText = {
        descriptionAr: 'أ'.repeat(10000) // Very long Arabic text
      };

      mockReq.body = longUnicodeText;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'TEXT_TOO_LONG',
        message: 'Text exceeds maximum length',
        messageAr: 'النص يتجاوز الحد الأقصى للطول'
      });
    });

    test('should handle corrupted or malformed data', async () => {
      const malformedData = {
        businessName: null,
        coordinates: 'invalid-coordinates',
        businessHours: 'not-an-object'
      };

      mockReq.body = malformedData;

      await updateBusinessProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'MALFORMED_DATA',
        message: 'Request data is malformed or corrupted',
        messageAr: 'بيانات الطلب مشوهة أو تالفة'
      });
    });
  });
});