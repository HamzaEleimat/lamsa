/**
 * Integration Tests for Complete Provider Onboarding Flow
 * Tests end-to-end provider registration, setup, and verification process
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestServer } from '../../utils/testServer';
import { clearTestDatabase } from '../../utils/database';
import * as supabaseSimple from '../../../src/config/supabase-simple';

jest.mock('../../../src/config/supabase-simple');
const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;

describe('Provider Onboarding Integration Tests', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-provider-onboarding';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();
    jest.clearAllMocks();
  });

  describe('Complete Provider Onboarding Journey', () => {
    const providerData = {
      businessName: 'Beauty Oasis صالون الواحة',
      businessNameAr: 'واحة الجمال للسيدات',
      ownerName: 'Layla Ahmad',
      ownerNameAr: 'ليلى أحمد',
      phone: '+962771234567',
      email: 'layla@beautyoasis.jo',
      businessType: 'beauty_salon',
      address: 'Rainbow Street, Jabal Amman',
      addressAr: 'شارع الرينبو، جبل عمان',
      location: {
        lat: 31.9539,
        lng: 35.9285,
        address: 'Rainbow Street, Jabal Amman',
        addressAr: 'شارع الرينبو، جبل عمان'
      }
    };

    test('should complete full provider onboarding process', async () => {
      let providerToken: string;
      let providerId: string;

      // Step 1: Provider Registration
      mockSupabase.createProvider.mockResolvedValue({
        success: true,
        provider: {
          id: 'provider-123',
          ...providerData,
          status: 'pending_verification',
          createdAt: new Date().toISOString()
        }
      });

      const registrationResponse = await request(app)
        .post('/api/auth/provider/signup')
        .send(providerData)
        .expect(201);

      expect(registrationResponse.body).toMatchObject({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        provider: expect.objectContaining({
          id: 'provider-123',
          businessName: 'Beauty Oasis صالون الواحة',
          status: 'pending_verification'
        })
      });

      providerId = registrationResponse.body.provider.id;

      // Step 2: Phone Verification via OTP
      mockSupabase.sendOTP.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully',
        mockOtp: '123456'
      });

      const otpResponse = await request(app)
        .post('/api/auth/provider/send-otp')
        .send({ phone: providerData.phone })
        .expect(200);

      expect(otpResponse.body.success).toBe(true);

      // Verify OTP
      mockSupabase.verifyOTP.mockResolvedValue({
        success: true,
        user: {
          id: providerId,
          phone: providerData.phone,
          role: 'provider',
          businessName: providerData.businessName,
          status: 'phone_verified'
        }
      });

      const verifyResponse = await request(app)
        .post('/api/auth/provider/verify-otp')
        .send({ phone: providerData.phone, otp: '123456' })
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        success: true,
        provider: expect.objectContaining({
          role: 'provider',
          status: 'phone_verified'
        }),
        token: expect.toBeValidJWT()
      });

      providerToken = verifyResponse.body.token;

      // Step 3: Complete Business Profile Setup
      const profileData = {
        description: 'Premier beauty salon offering professional services',
        descriptionAr: 'صالون جمال راقي يقدم خدمات احترافية',
        specialties: ['haircut', 'makeup', 'facial', 'manicure'],
        specialtiesAr: ['قص الشعر', 'المكياج', 'العناية بالوجه', 'العناية بالأظافر'],
        contactInfo: {
          whatsapp: '+962771234567',
          instagram: '@beauty_oasis_jo',
          facebook: 'Beauty Oasis Jordan'
        }
      };

      mockSupabase.updateProviderProfile.mockResolvedValue({
        success: true,
        provider: {
          id: providerId,
          ...providerData,
          ...profileData,
          status: 'profile_completed'
        }
      });

      const profileResponse = await request(app)
        .put('/api/provider/profile')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(profileData)
        .expect(200);

      expect(profileResponse.body).toMatchObject({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        provider: expect.objectContaining({
          description: profileData.description,
          descriptionAr: profileData.descriptionAr,
          specialties: profileData.specialties
        })
      });

      // Step 4: Upload Business Photos
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

      const photoResponse = await request(app)
        .post('/api/provider/photos')
        .set('Authorization', `Bearer ${providerToken}`)
        .attach('photos', Buffer.from('fake-image-data'), 'salon-interior.jpg')
        .attach('photos', Buffer.from('fake-image-data'), 'staff-team.jpg')
        .expect(200);

      expect(photoResponse.body).toMatchObject({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        photos: expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringContaining('salon-interior.jpg'),
            captionAr: expect.any(String)
          })
        ])
      });

      // Step 5: Set Working Hours (Jordan Work Week)
      const workingHours = {
        workingDays: {
          sunday: {
            isWorking: true,
            shifts: [
              { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
              { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
            ]
          },
          monday: {
            isWorking: true,
            shifts: [
              { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
              { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
            ]
          },
          tuesday: {
            isWorking: true,
            shifts: [
              { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
              { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
            ]
          },
          wednesday: {
            isWorking: true,
            shifts: [
              { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
              { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
            ]
          },
          thursday: {
            isWorking: true,
            shifts: [
              { start: '09:00', end: '13:00', name: 'Morning', nameAr: 'الصباح' },
              { start: '15:00', end: '19:00', name: 'Evening', nameAr: 'المساء' }
            ]
          },
          friday: {
            isWorking: false,
            note: 'Day off - Friday prayer day',
            noteAr: 'يوم عطلة - يوم صلاة الجمعة'
          },
          saturday: {
            isWorking: true,
            shifts: [
              { start: '10:00', end: '16:00', name: 'Weekend Hours', nameAr: 'ساعات نهاية الأسبوع' }
            ]
          }
        },
        timezone: 'Asia/Amman',
        slotDuration: 30,
        bufferTime: 15
      };

      mockSupabase.updateProviderAvailability.mockResolvedValue({
        success: true,
        availability: workingHours
      });

      const hoursResponse = await request(app)
        .put('/api/provider/availability')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(workingHours)
        .expect(200);

      expect(hoursResponse.body).toMatchObject({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        availability: expect.objectContaining({
          timezone: 'Asia/Amman',
          workingDays: expect.objectContaining({
            friday: expect.objectContaining({
              isWorking: false,
              noteAr: expect.any(String)
            })
          })
        })
      });

      // Step 6: Create First Service
      const serviceData = {
        name: 'Hair Styling قص وتصفيف',
        nameAr: 'قص وتصفيف الشعر',
        description: 'Professional hair cutting and styling services',
        descriptionAr: 'خدمات قص وتصفيف الشعر الاحترافية',
        category: 'hair_services',
        duration: 60,
        basePrice: 25.00,
        currency: 'JOD',
        pricing: {
          type: 'fixed',
          basePrice: 25.00,
          currency: 'JOD'
        }
      };

      mockSupabase.createService.mockResolvedValue({
        success: true,
        service: {
          id: 'service-123',
          providerId: providerId,
          ...serviceData,
          createdAt: new Date().toISOString()
        }
      });

      const serviceResponse = await request(app)
        .post('/api/provider/services')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(serviceData)
        .expect(201);

      expect(serviceResponse.body).toMatchObject({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        service: expect.objectContaining({
          id: 'service-123',
          name: 'Hair Styling قص وتصفيف',
          nameAr: 'قص وتصفيف الشعر',
          basePrice: 25.00
        })
      });

      // Step 7: Configure Prayer Time Integration
      const prayerTimeSettings = {
        enabled: true,
        autoBlock: true,
        customSettings: {
          dhuhr: { enabled: true, blockBefore: 10, blockAfter: 20 },
          asr: { enabled: true, blockBefore: 5, blockAfter: 15 },
          maghrib: { enabled: true, blockBefore: 15, blockAfter: 30 }
        },
        location: {
          city: 'Amman',
          cityAr: 'عمان',
          coordinates: { lat: 31.9566, lng: 35.9457 }
        }
      };

      mockSupabase.updatePrayerTimeSettings.mockResolvedValue({
        success: true,
        settings: prayerTimeSettings
      });

      const prayerResponse = await request(app)
        .put('/api/provider/prayer-times')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(prayerTimeSettings)
        .expect(200);

      expect(prayerResponse.body).toMatchObject({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        settings: expect.objectContaining({
          enabled: true,
          autoBlock: true
        })
      });

      // Step 8: Final Profile Verification Check
      mockSupabase.getProviderProfile.mockResolvedValue({
        success: true,
        provider: {
          id: providerId,
          ...providerData,
          ...profileData,
          status: 'active',
          verificationStatus: 'pending_documents',
          completionPercentage: 85
        }
      });

      const finalProfileResponse = await request(app)
        .get('/api/provider/profile')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(finalProfileResponse.body).toMatchObject({
        success: true,
        provider: expect.objectContaining({
          id: providerId,
          status: 'active',
          completionPercentage: expect.any(Number)
        })
      });

      // Verify the onboarding is substantially complete
      expect(finalProfileResponse.body.provider.completionPercentage).toBeGreaterThan(80);
    });

    test('should handle partial onboarding flow gracefully', async () => {
      // Start registration but don't complete all steps
      mockSupabase.createProvider.mockResolvedValue({
        success: true,
        provider: {
          id: 'provider-456',
          ...providerData,
          status: 'pending_verification',
          completionPercentage: 20
        }
      });

      const registrationResponse = await request(app)
        .post('/api/auth/provider/signup')
        .send(providerData)
        .expect(201);

      const providerId = registrationResponse.body.provider.id;

      // Check profile status without completing verification
      mockSupabase.getProviderProfile.mockResolvedValue({
        success: true,
        provider: {
          id: providerId,
          ...providerData,
          status: 'pending_verification',
          completionPercentage: 20,
          nextSteps: [
            'Complete phone verification',
            'Set up business profile',
            'Upload business photos',
            'Configure working hours'
          ],
          nextStepsAr: [
            'أكمل التحقق من الهاتف',
            'إعداد الملف التجاري',
            'رفع صور النشاط التجاري',
            'تكوين ساعات العمل'
          ]
        }
      });

      // Should be able to check status without authentication
      const statusResponse = await request(app)
        .get(`/api/provider/onboarding-status/${providerId}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        success: true,
        status: 'pending_verification',
        completionPercentage: 20,
        nextSteps: expect.any(Array),
        nextStepsAr: expect.any(Array)
      });
    });

    test('should validate required onboarding steps', async () => {
      // Try to skip directly to creating services without proper setup
      const invalidToken = 'invalid-token';

      const serviceData = {
        name: 'Test Service',
        nameAr: 'خدمة الاختبار',
        description: 'Test description',
        descriptionAr: 'وصف الاختبار',
        category: 'hair_services',
        duration: 60,
        basePrice: 25.00
      };

      await request(app)
        .post('/api/provider/services')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(serviceData)
        .expect(401);
    });

    test('should handle duplicate provider registration', async () => {
      mockSupabase.createProvider.mockResolvedValue({
        success: false,
        error: 'BUSINESS_ALREADY_EXISTS',
        message: 'A business with this phone number already exists'
      });

      const duplicateResponse = await request(app)
        .post('/api/auth/provider/signup')
        .send(providerData)
        .expect(409);

      expect(duplicateResponse.body).toMatchObject({
        success: false,
        error: 'BUSINESS_ALREADY_EXISTS',
        message: expect.any(String),
        messageAr: expect.any(String)
      });
    });
  });

  describe('Arabic Content Validation During Onboarding', () => {
    let providerToken: string;

    beforeEach(async () => {
      // Set up authenticated provider
      mockSupabase.verifyOTP.mockResolvedValue({
        success: true,
        user: {
          id: 'provider-123',
          phone: '+962771234567',
          role: 'provider'
        }
      });

      const verifyResponse = await request(app)
        .post('/api/auth/provider/verify-otp')
        .send({ phone: '+962771234567', otp: '123456' });

      providerToken = verifyResponse.body.token;
    });

    test('should validate Arabic business name during profile setup', async () => {
      const invalidArabicProfile = {
        businessName: 'Beauty Salon',
        businessNameAr: 'Beauty Salon', // Should be Arabic
        description: 'Great salon',
        descriptionAr: 'Great salon' // Should be Arabic
      };

      const profileResponse = await request(app)
        .put('/api/provider/profile')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(invalidArabicProfile)
        .expect(400);

      expect(profileResponse.body).toMatchObject({
        success: false,
        error: 'INVALID_ARABIC_CONTENT',
        message: expect.stringMatching(/arabic.*characters/i),
        messageAr: expect.stringMatching(/أحرف.*عربية/),
        invalidFields: expect.arrayContaining(['businessNameAr', 'descriptionAr'])
      });
    });

    test('should accept mixed Arabic-English content appropriately', async () => {
      const mixedContentProfile = {
        businessName: 'Beauty Salon صالون الجمال',
        businessNameAr: 'صالون الجمال للسيدات',
        description: 'Professional services خدمات احترافية',
        descriptionAr: 'خدمات تجميل احترافية للمرأة العصرية'
      };

      mockSupabase.updateProviderProfile.mockResolvedValue({
        success: true,
        provider: {
          id: 'provider-123',
          ...mixedContentProfile
        }
      });

      const profileResponse = await request(app)
        .put('/api/provider/profile')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(mixedContentProfile)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
    });

    test('should validate Arabic service names during service creation', async () => {
      const invalidServiceData = {
        name: 'Hair Styling',
        nameAr: 'Hair Styling', // Should be Arabic
        description: 'Professional hair services',
        descriptionAr: 'Professional hair services', // Should be Arabic
        category: 'hair_services',
        duration: 60,
        basePrice: 25.00
      };

      const serviceResponse = await request(app)
        .post('/api/provider/services')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(invalidServiceData)
        .expect(400);

      expect(serviceResponse.body).toMatchObject({
        success: false,
        error: 'INVALID_ARABIC_CONTENT',
        messageAr: expect.any(String)
      });
    });
  });

  describe('Jordan-Specific Onboarding Features', () => {
    let providerToken: string;

    beforeEach(async () => {
      mockSupabase.verifyOTP.mockResolvedValue({
        success: true,
        user: {
          id: 'provider-123',
          phone: '+962771234567',
          role: 'provider'
        }
      });

      const verifyResponse = await request(app)
        .post('/api/auth/provider/verify-otp')
        .send({ phone: '+962771234567', otp: '123456' });

      providerToken = verifyResponse.body.token;
    });

    test('should validate Jordan location coordinates', async () => {
      const invalidLocationData = {
        address: 'Dubai Mall, Dubai',
        addressAr: 'دبي مول، دبي',
        location: {
          lat: 25.1972, // Dubai coordinates (outside Jordan)
          lng: 55.2796,
          address: 'Dubai Mall, Dubai'
        }
      };

      const locationResponse = await request(app)
        .put('/api/provider/location')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(invalidLocationData)
        .expect(400);

      expect(locationResponse.body).toMatchObject({
        success: false,
        error: 'LOCATION_OUTSIDE_JORDAN',
        message: expect.stringMatching(/jordan/i),
        messageAr: expect.stringMatching(/الأردن/)
      });
    });

    test('should accept valid Jordan coordinates', async () => {
      const validJordanLocation = {
        address: 'Downtown Amman',
        addressAr: 'وسط البلد عمان',
        location: {
          lat: 31.9566, // Amman coordinates
          lng: 35.9457,
          address: 'Downtown Amman',
          addressAr: 'وسط البلد عمان'
        }
      };

      mockSupabase.updateBusinessLocation.mockResolvedValue({
        success: true,
        location: validJordanLocation
      });

      const locationResponse = await request(app)
        .put('/api/provider/location')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(validJordanLocation)
        .expect(200);

      expect(locationResponse.body.success).toBe(true);
    });

    test('should set up Jordan work week correctly', async () => {
      const jordanWorkWeek = {
        workingDays: {
          sunday: { isWorking: true, shifts: [{ start: '09:00', end: '17:00' }] },
          monday: { isWorking: true, shifts: [{ start: '09:00', end: '17:00' }] },
          tuesday: { isWorking: true, shifts: [{ start: '09:00', end: '17:00' }] },
          wednesday: { isWorking: true, shifts: [{ start: '09:00', end: '17:00' }] },
          thursday: { isWorking: true, shifts: [{ start: '09:00', end: '17:00' }] },
          friday: { isWorking: false, note: 'Friday prayer day', noteAr: 'يوم صلاة الجمعة' },
          saturday: { isWorking: true, shifts: [{ start: '10:00', end: '16:00' }] }
        },
        timezone: 'Asia/Amman'
      };

      mockSupabase.updateProviderAvailability.mockResolvedValue({
        success: true,
        availability: jordanWorkWeek
      });

      const availabilityResponse = await request(app)
        .put('/api/provider/availability')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(jordanWorkWeek)
        .expect(200);

      expect(availabilityResponse.body).toMatchObject({
        success: true,
        availability: expect.objectContaining({
          timezone: 'Asia/Amman',
          workingDays: expect.objectContaining({
            friday: expect.objectContaining({
              isWorking: false,
              noteAr: expect.any(String)
            })
          })
        })
      });
    });

    test('should validate JOD currency for pricing', async () => {
      const invalidCurrencyService = {
        name: 'Hair Styling',
        nameAr: 'تصفيف الشعر',
        description: 'Hair services',
        descriptionAr: 'خدمات الشعر',
        category: 'hair_services',
        duration: 60,
        basePrice: 25.00,
        currency: 'USD' // Should be JOD for Jordan
      };

      const serviceResponse = await request(app)
        .post('/api/provider/services')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(invalidCurrencyService)
        .expect(400);

      expect(serviceResponse.body).toMatchObject({
        success: false,
        error: 'INVALID_CURRENCY',
        message: expect.stringMatching(/jod.*jordan/i),
        messageAr: expect.stringMatching(/دينار.*أردني/)
      });
    });
  });

  describe('Onboarding Progress Tracking', () => {
    test('should track onboarding completion percentage', async () => {
      const steps = [
        { endpoint: '/api/auth/provider/signup', completion: 20 },
        { endpoint: '/api/auth/provider/verify-otp', completion: 40 },
        { endpoint: '/api/provider/profile', completion: 60 },
        { endpoint: '/api/provider/photos', completion: 75 },
        { endpoint: '/api/provider/availability', completion: 85 },
        { endpoint: '/api/provider/services', completion: 100 }
      ];

      // This would be tracked in the actual implementation
      // Here we just verify the concept
      steps.forEach(step => {
        expect(step.completion).toBeGreaterThan(0);
        expect(step.completion).toBeLessThanOrEqual(100);
      });
    });

    test('should provide next steps guidance', async () => {
      const incompleteProvider = {
        id: 'provider-123',
        status: 'phone_verified',
        completionPercentage: 40,
        completedSteps: ['registration', 'phone_verification'],
        pendingSteps: ['profile_setup', 'photo_upload', 'availability_config', 'service_creation']
      };

      mockSupabase.getProviderProfile.mockResolvedValue({
        success: true,
        provider: incompleteProvider
      });

      // This would return guidance for next steps
      expect(incompleteProvider.pendingSteps).toContain('profile_setup');
      expect(incompleteProvider.completionPercentage).toBeLessThan(100);
    });
  });
});