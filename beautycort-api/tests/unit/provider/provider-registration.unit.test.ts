/**
 * Unit Tests for Provider Registration and Authentication
 * Tests provider signup, login, and authentication with business details
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { 
  providerSignup,
  providerLogin,
  sendProviderOTP,
  verifyProviderOTP,
  getProviderProfile,
  updateProviderProfile
} from '../../../src/controllers/auth.controller';
import * as supabaseSimple from '../../../src/config/supabase-simple';
import { validateJordanPhone } from '../../../src/utils/phone-validation';

// Mock dependencies
jest.mock('../../../src/config/supabase-simple');
jest.mock('../../../src/utils/phone-validation');
jest.mock('jsonwebtoken');

const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;
const mockPhoneValidation = validateJordanPhone as jest.MockedFunction<typeof validateJordanPhone>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Provider Registration and Authentication', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {
      body: {},
      headers: {},
      user: undefined
    };
    
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    };

    jest.clearAllMocks();
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-for-provider-auth';
  });

  describe('Provider Signup', () => {
    const validSignupData = {
      businessName: 'Beauty Salon الجمال',
      businessNameAr: 'صالون الجمال للسيدات',
      ownerName: 'Fatima Al-Zahra',
      ownerNameAr: 'فاطمة الزهراء',
      phone: '+962771234567',
      email: 'fatima@beautysalon.jo',
      businessType: 'beauty_salon',
      address: 'Amman, Jordan',
      addressAr: 'عمان، الأردن',
      location: {
        lat: 31.9566,
        lng: 35.9457,
        address: 'Downtown Amman',
        addressAr: 'وسط البلد عمان'
      }
    };

    test('should register provider with complete business details', async () => {
      mockPhoneValidation.mockReturnValue(true);
      mockSupabase.createProvider.mockResolvedValue({
        success: true,
        provider: {
          id: 'provider-123',
          ...validSignupData,
          phone: '+962771234567',
          status: 'pending_verification',
          createdAt: new Date().toISOString()
        }
      });

      mockReq.body = validSignupData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(mockPhoneValidation).toHaveBeenCalledWith('+962771234567');
      expect(mockSupabase.createProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Beauty Salon الجمال',
          businessNameAr: 'صالون الجمال للسيدات',
          phone: '+962771234567'
        })
      );

      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        provider: expect.objectContaining({
          id: 'provider-123',
          status: 'pending_verification'
        })
      });
    });

    test('should validate required fields for provider signup', async () => {
      const incompleteData = {
        businessName: 'Test Salon',
        phone: '+962771234567'
        // Missing required fields
      };

      mockReq.body = incompleteData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: expect.stringMatching(/required.*fields/i),
        messageAr: expect.stringMatching(/الحقول.*مطلوبة/),
        missingFields: expect.any(Array)
      });
    });

    test('should validate Arabic business name format', async () => {
      const invalidArabicData = {
        ...validSignupData,
        businessNameAr: 'Invalid English Name' // Should be Arabic
      };

      mockReq.body = invalidArabicData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_ARABIC_TEXT',
        message: 'Arabic business name must contain Arabic characters',
        messageAr: 'يجب أن يحتوي اسم النشاط التجاري بالعربية على أحرف عربية'
      });
    });

    test('should validate business name length limits', async () => {
      const longNameData = {
        ...validSignupData,
        businessName: 'A'.repeat(101), // Too long
        businessNameAr: 'أ'.repeat(101)
      };

      mockReq.body = longNameData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_FIELD_LENGTH',
        message: 'Business name must be between 2 and 100 characters',
        messageAr: 'يجب أن يكون اسم النشاط التجاري بين 2 و 100 حرف'
      });
    });

    test('should validate Jordan location coordinates', async () => {
      const invalidLocationData = {
        ...validSignupData,
        location: {
          lat: 40.7128, // New York coordinates (outside Jordan)
          lng: -74.0060,
          address: 'New York, USA'
        }
      };

      mockReq.body = invalidLocationData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_LOCATION',
        message: 'Location must be within Jordan boundaries',
        messageAr: 'يجب أن يكون الموقع داخل حدود الأردن'
      });
    });

    test('should handle duplicate business registration', async () => {
      mockPhoneValidation.mockReturnValue(true);
      mockSupabase.createProvider.mockResolvedValue({
        success: false,
        error: 'BUSINESS_ALREADY_EXISTS',
        message: 'A business with this phone number already exists'
      });

      mockReq.body = validSignupData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'BUSINESS_ALREADY_EXISTS',
        message: 'A business with this phone number already exists',
        messageAr: expect.any(String)
      });
    });

    test('should validate business type from allowed list', async () => {
      const invalidTypeData = {
        ...validSignupData,
        businessType: 'invalid_type'
      };

      mockReq.body = invalidTypeData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_BUSINESS_TYPE',
        message: expect.stringMatching(/valid.*business.*type/i),
        messageAr: expect.any(String),
        allowedTypes: expect.arrayContaining(['beauty_salon', 'spa', 'barber_shop'])
      });
    });
  });

  describe('Provider OTP Authentication', () => {
    test('should send OTP to provider phone number', async () => {
      mockPhoneValidation.mockReturnValue(true);
      mockSupabase.sendOTP.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully',
        mockOtp: '123456'
      });

      mockReq.body = { phone: '+962771234567' };

      await sendProviderOTP(mockReq as Request, mockRes as Response);

      expect(mockSupabase.sendOTP).toHaveBeenCalledWith('+962771234567', 'provider');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        retryAfter: expect.any(Number)
      });
    });

    test('should verify provider OTP and return provider token', async () => {
      const mockProvider = {
        id: 'provider-123',
        phone: '+962771234567',
        role: 'provider',
        businessName: 'Test Salon',
        status: 'active'
      };

      mockPhoneValidation.mockReturnValue(true);
      mockSupabase.verifyOTP.mockResolvedValue({
        success: true,
        user: mockProvider
      });
      mockJwt.sign.mockReturnValue('provider-jwt-token');

      mockReq.body = {
        phone: '+962771234567',
        otp: '123456'
      };

      await verifyProviderOTP(mockReq as Request, mockRes as Response);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: 'provider-123',
          phone: '+962771234567',
          role: 'provider'
        },
        'test-secret-for-provider-auth',
        { expiresIn: '24h' }
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        provider: mockProvider,
        token: 'provider-jwt-token'
      });
    });

    test('should handle provider not found during OTP verification', async () => {
      mockPhoneValidation.mockReturnValue(true);
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'PROVIDER_NOT_FOUND',
        message: 'Provider account not found'
      });

      mockReq.body = {
        phone: '+962771234567',
        otp: '123456'
      };

      await verifyProviderOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'PROVIDER_NOT_FOUND',
        message: 'Provider account not found',
        messageAr: expect.any(String)
      });
    });
  });

  describe('Provider Login', () => {
    test('should login provider with email and password', async () => {
      const mockProvider = {
        id: 'provider-123',
        email: 'provider@salon.jo',
        businessName: 'Test Salon',
        role: 'provider'
      };

      mockSupabase.loginProvider.mockResolvedValue({
        success: true,
        provider: mockProvider
      });
      mockJwt.sign.mockReturnValue('provider-login-token');

      mockReq.body = {
        email: 'provider@salon.jo',
        password: 'SecurePassword123!'
      };

      await providerLogin(mockReq as Request, mockRes as Response);

      expect(mockSupabase.loginProvider).toHaveBeenCalledWith(
        'provider@salon.jo',
        'SecurePassword123!'
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        provider: mockProvider,
        token: 'provider-login-token'
      });
    });

    test('should handle invalid provider credentials', async () => {
      mockSupabase.loginProvider.mockResolvedValue({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });

      mockReq.body = {
        email: 'wrong@email.com',
        password: 'wrongpassword'
      };

      await providerLogin(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        messageAr: expect.any(String)
      });
    });

    test('should handle suspended provider account', async () => {
      mockSupabase.loginProvider.mockResolvedValue({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'Provider account has been suspended',
        suspensionReason: 'Policy violation'
      });

      mockReq.body = {
        email: 'suspended@provider.jo',
        password: 'password123'
      };

      await providerLogin(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'Provider account has been suspended',
        messageAr: expect.any(String),
        suspensionReason: 'Policy violation'
      });
    });
  });

  describe('Provider Profile Management', () => {
    const mockProviderUser = {
      userId: 'provider-123',
      role: 'provider',
      phone: '+962771234567'
    };

    beforeEach(() => {
      mockReq.user = mockProviderUser;
    });

    test('should get provider profile with business details', async () => {
      const mockProfile = {
        id: 'provider-123',
        businessName: 'Beauty Salon الجمال',
        businessNameAr: 'صالون الجمال للسيدات',
        ownerName: 'Fatima Al-Zahra',
        ownerNameAr: 'فاطمة الزهراء',
        phone: '+962771234567',
        email: 'fatima@salon.jo',
        status: 'active',
        rating: 4.8,
        totalBookings: 245,
        businessHours: {
          sunday: { open: '09:00', close: '17:00', closed: false },
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { closed: true },
          saturday: { open: '10:00', close: '16:00', closed: false }
        }
      };

      mockSupabase.getProviderProfile.mockResolvedValue({
        success: true,
        provider: mockProfile
      });

      await getProviderProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        provider: mockProfile
      });
    });

    test('should update provider profile with Arabic content', async () => {
      const updateData = {
        businessName: 'Updated Salon الجديد',
        businessNameAr: 'صالون الجمال المحدث',
        description: 'Professional beauty services',
        descriptionAr: 'خدمات تجميل احترافية',
        specialties: ['haircut', 'makeup', 'nails'],
        specialtiesAr: ['قص الشعر', 'المكياج', 'الأظافر']
      };

      mockSupabase.updateProviderProfile.mockResolvedValue({
        success: true,
        provider: {
          id: 'provider-123',
          ...updateData
        }
      });

      mockReq.body = updateData;

      await updateProviderProfile(mockReq as Request, mockRes as Response);

      expect(mockSupabase.updateProviderProfile).toHaveBeenCalledWith(
        'provider-123',
        updateData
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        messageAr: expect.any(String),
        provider: expect.objectContaining(updateData)
      });
    });

    test('should validate Arabic text in profile updates', async () => {
      const invalidArabicUpdate = {
        businessNameAr: 'English Name', // Should be Arabic
        descriptionAr: 'English description'
      };

      mockReq.body = invalidArabicUpdate;

      await updateProviderProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_ARABIC_CONTENT',
        message: 'Arabic fields must contain Arabic characters',
        messageAr: 'يجب أن تحتوي الحقول العربية على أحرف عربية',
        invalidFields: ['businessNameAr', 'descriptionAr']
      });
    });

    test('should handle profile update with mixed language content', async () => {
      const mixedContentUpdate = {
        businessName: 'Beauty Salon صالون الجمال', // Mixed English-Arabic
        description: 'Professional services خدمات احترافية',
        phone: '+962771234567'
      };

      mockSupabase.updateProviderProfile.mockResolvedValue({
        success: true,
        provider: {
          id: 'provider-123',
          ...mixedContentUpdate
        }
      });

      mockReq.body = mixedContentUpdate;

      await updateProviderProfile(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        provider: expect.objectContaining(mixedContentUpdate)
      });
    });
  });

  describe('Input Validation and Security', () => {
    test('should sanitize HTML in business descriptions', async () => {
      const maliciousData = {
        businessName: 'Test Salon',
        description: '<script>alert("xss")</script>Beautiful salon',
        descriptionAr: '<img src="x" onerror="alert(1)">صالون جميل'
      };

      mockReq.body = maliciousData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid characters detected in input',
        messageAr: expect.any(String)
      });
    });

    test('should validate email format for provider registration', async () => {
      const invalidEmailData = {
        businessName: 'Test Salon',
        phone: '+962771234567',
        email: 'invalid-email-format'
      };

      mockReq.body = invalidEmailData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_EMAIL_FORMAT',
        message: 'Please provide a valid email address',
        messageAr: 'يرجى تقديم عنوان بريد إلكتروني صحيح'
      });
    });

    test('should handle extremely long input strings', async () => {
      const longStringData = {
        businessName: 'A'.repeat(1000),
        description: 'B'.repeat(5000),
        phone: '+962771234567'
      };

      mockReq.body = longStringData;

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INPUT_TOO_LONG',
        message: 'Input exceeds maximum allowed length',
        messageAr: expect.any(String)
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors during registration', async () => {
      mockPhoneValidation.mockReturnValue(true);
      mockSupabase.createProvider.mockRejectedValue(new Error('Database connection failed'));

      mockReq.body = {
        businessName: 'Test Salon',
        phone: '+962771234567',
        email: 'test@salon.jo'
      };

      await providerSignup(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Registration temporarily unavailable',
        messageAr: expect.any(String)
      });
    });

    test('should handle unexpected errors gracefully', async () => {
      mockPhoneValidation.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockReq.body = { phone: '+962771234567' };

      await sendProviderOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        messageAr: expect.any(String)
      });
    });
  });
});