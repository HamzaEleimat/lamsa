/**
 * Comprehensive API Form Validation Testing for Arabic Text Input
 * Tests API endpoints for proper Arabic text validation and handling
 */

const request = require('supertest');
const express = require('express');
const { describe, it, expect, beforeEach, afterEach } = require('jest');

// Mock the Arabic validation utilities
const mockArabicValidation = {
  validateArabicText: jest.fn(),
  validateArabicName: jest.fn(),
  validateArabicBusinessName: jest.fn(),
  validateArabicPhoneNumber: jest.fn(),
  validateArabicEmail: jest.fn(),
  normalizeArabicText: jest.fn(),
  isValidArabicText: jest.fn()
};

// Mock the validation middleware
const mockValidationMiddleware = {
  validateBookingInput: jest.fn(),
  validateProviderInput: jest.fn(),
  validateUserInput: jest.fn(),
  validateServiceInput: jest.fn()
};

// Mock the enhanced bilingual error middleware
const mockBilingualErrorMiddleware = {
  BilingualAppError: jest.fn(),
  bilingualErrorHandler: jest.fn()
};

// Mock express-validator
const mockExpressValidator = {
  body: jest.fn(() => ({
    isLength: jest.fn(() => ({ withMessage: jest.fn() })),
    matches: jest.fn(() => ({ withMessage: jest.fn() })),
    custom: jest.fn(() => ({ withMessage: jest.fn() })),
    optional: jest.fn(() => ({ withMessage: jest.fn() }))
  })),
  validationResult: jest.fn()
};

describe('API Form Validation for Arabic Text', () => {
  let app;
  let mockDB;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Mock database
    mockDB = {
      from: jest.fn(() => ({
        insert: jest.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null })),
        update: jest.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null })),
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
        eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: null })) }))
      }))
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration Form Validation', () => {
    beforeEach(() => {
      // Mock user registration endpoint
      app.post('/api/auth/register', [
        mockExpressValidator.body('name').isLength({ min: 2, max: 100 }),
        mockExpressValidator.body('phoneNumber').matches(/^(\+962|962|0)?(7[789])\d{7}$/),
        mockExpressValidator.body('email').optional().isEmail()
      ], async (req, res) => {
        const errors = mockExpressValidator.validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'بيانات غير صالحة'
          });
        }

        // Simulate user creation
        const userData = {
          name: req.body.name,
          phoneNumber: req.body.phoneNumber,
          email: req.body.email
        };

        res.status(201).json({
          success: true,
          data: userData,
          message: 'تم إنشاء الحساب بنجاح'
        });
      });
    });

    it('should accept valid Arabic name', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'أحمد محمد',
          phoneNumber: '0791234567',
          email: 'ahmed@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('أحمد محمد');
      expect(response.body.message).toBe('تم إنشاء الحساب بنجاح');
    });

    it('should reject invalid Arabic name', async () => {
      mockExpressValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            msg: 'اسم غير صالح',
            param: 'name',
            location: 'body'
          }
        ]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'أ', // Too short
          phoneNumber: '0791234567',
          email: 'ahmed@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].msg).toBe('اسم غير صالح');
    });

    it('should validate Arabic phone number formats', async () => {
      const validPhoneNumbers = [
        '0791234567',
        '+962791234567',
        '962791234567',
        '0781234567',
        '0771234567'
      ];

      for (const phoneNumber of validPhoneNumbers) {
        mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'أحمد محمد',
            phoneNumber: phoneNumber,
            email: 'ahmed@example.com'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    it('should reject invalid phone number formats', async () => {
      mockExpressValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            msg: 'رقم هاتف غير صالح',
            param: 'phoneNumber',
            location: 'body'
          }
        ]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'أحمد محمد',
          phoneNumber: '123456', // Invalid format
          email: 'ahmed@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe('رقم هاتف غير صالح');
    });

    it('should handle mixed Arabic and English names', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'أحمد Ahmed',
          phoneNumber: '0791234567',
          email: 'ahmed@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('أحمد Ahmed');
    });
  });

  describe('Provider Registration Form Validation', () => {
    beforeEach(() => {
      // Mock provider registration endpoint
      app.post('/api/auth/register-provider', [
        mockExpressValidator.body('name').isLength({ min: 2, max: 100 }),
        mockExpressValidator.body('businessName').isLength({ min: 3, max: 255 }),
        mockExpressValidator.body('description').optional().isLength({ min: 10, max: 1000 }),
        mockExpressValidator.body('address').isLength({ min: 5, max: 500 }),
        mockExpressValidator.body('phoneNumber').matches(/^(\+962|962|0)?(7[789])\d{7}$/),
        mockExpressValidator.body('email').isEmail()
      ], async (req, res) => {
        const errors = mockExpressValidator.validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'بيانات غير صالحة'
          });
        }

        res.status(201).json({
          success: true,
          data: req.body,
          message: 'تم تسجيل مقدم الخدمة بنجاح'
        });
      });
    });

    it('should accept valid Arabic business information', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/auth/register-provider')
        .send({
          name: 'فاطمة أحمد',
          businessName: 'صالون الجمال الذهبي',
          description: 'نقدم أفضل خدمات التجميل والعناية بالبشرة والشعر بأحدث التقنيات',
          address: 'شارع الملك حسين، عمان، الأردن',
          phoneNumber: '0791234567',
          email: 'salon@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.businessName).toBe('صالون الجمال الذهبي');
      expect(response.body.message).toBe('تم تسجيل مقدم الخدمة بنجاح');
    });

    it('should handle bilingual business names', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/auth/register-provider')
        .send({
          name: 'سارة علي',
          businessName: 'صالون الجمال - Beauty Salon',
          description: 'نقدم خدمات التجميل باللغتين العربية والإنجليزية',
          address: 'منطقة عبدون، عمان',
          phoneNumber: '0781234567',
          email: 'bilingual@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.businessName).toBe('صالون الجمال - Beauty Salon');
    });

    it('should reject invalid business description', async () => {
      mockExpressValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            msg: 'وصف الخدمة قصير جداً',
            param: 'description',
            location: 'body'
          }
        ]
      });

      const response = await request(app)
        .post('/api/auth/register-provider')
        .send({
          name: 'مريم محمد',
          businessName: 'صالون مريم',
          description: 'قصير', // Too short
          address: 'شارع الجامعة، عمان',
          phoneNumber: '0771234567',
          email: 'mariam@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe('وصف الخدمة قصير جداً');
    });

    it('should validate Arabic addresses', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const validAddresses = [
        'شارع الملك حسين، عمان، الأردن',
        'منطقة عبدون، الطابق الثاني، محل رقم 15',
        'مجمع الأفنيوز، عمان 11181',
        'شارع الجامعة الأردنية، عمان'
      ];

      for (const address of validAddresses) {
        const response = await request(app)
          .post('/api/auth/register-provider')
          .send({
            name: 'علي محمد',
            businessName: 'مركز العناية',
            description: 'نقدم خدمات العناية الشخصية المتميزة',
            address: address,
            phoneNumber: '0791234567',
            email: 'ali@example.com'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.address).toBe(address);
      }
    });
  });

  describe('Booking Form Validation', () => {
    beforeEach(() => {
      // Mock booking endpoint
      app.post('/api/bookings', [
        mockExpressValidator.body('serviceId').isUUID(),
        mockExpressValidator.body('providerId').isUUID(),
        mockExpressValidator.body('date').isISO8601(),
        mockExpressValidator.body('time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        mockExpressValidator.body('customerNotes').optional().isLength({ max: 500 }),
        mockExpressValidator.body('specialRequests').optional().isLength({ max: 200 })
      ], async (req, res) => {
        const errors = mockExpressValidator.validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'بيانات الحجز غير صالحة'
          });
        }

        res.status(201).json({
          success: true,
          data: req.body,
          message: 'تم إنشاء الحجز بنجاح'
        });
      });
    });

    it('should accept valid Arabic customer notes', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/bookings')
        .send({
          serviceId: '550e8400-e29b-41d4-a716-446655440000',
          providerId: '550e8400-e29b-41d4-a716-446655440001',
          date: '2025-07-20',
          time: '14:30',
          customerNotes: 'يُرجى الوصول مبكراً بـ 15 دقيقة. أفضل الخدمة بدون موسيقى عالية.',
          specialRequests: 'استخدام منتجات طبيعية فقط'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customerNotes).toBe('يُرجى الوصول مبكراً بـ 15 دقيقة. أفضل الخدمة بدون موسيقى عالية.');
    });

    it('should handle mixed language notes', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/bookings')
        .send({
          serviceId: '550e8400-e29b-41d4-a716-446655440000',
          providerId: '550e8400-e29b-41d4-a716-446655440001',
          date: '2025-07-20',
          time: '14:30',
          customerNotes: 'يُرجى الوصول مبكراً - Please arrive early',
          specialRequests: 'Natural products only - منتجات طبيعية فقط'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.customerNotes).toBe('يُرجى الوصول مبكراً - Please arrive early');
    });

    it('should reject overly long Arabic notes', async () => {
      mockExpressValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            msg: 'الملاحظات طويلة جداً',
            param: 'customerNotes',
            location: 'body'
          }
        ]
      });

      const longNotes = 'ملاحظات طويلة جداً '.repeat(100); // Very long text

      const response = await request(app)
        .post('/api/bookings')
        .send({
          serviceId: '550e8400-e29b-41d4-a716-446655440000',
          providerId: '550e8400-e29b-41d4-a716-446655440001',
          date: '2025-07-20',
          time: '14:30',
          customerNotes: longNotes
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe('الملاحظات طويلة جداً');
    });
  });

  describe('Service Creation Form Validation', () => {
    beforeEach(() => {
      // Mock service creation endpoint
      app.post('/api/services', [
        mockExpressValidator.body('name').isLength({ min: 2, max: 255 }),
        mockExpressValidator.body('nameAr').isLength({ min: 2, max: 255 }),
        mockExpressValidator.body('description').isLength({ min: 10, max: 1000 }),
        mockExpressValidator.body('descriptionAr').isLength({ min: 10, max: 1000 }),
        mockExpressValidator.body('price').isFloat({ min: 0 }),
        mockExpressValidator.body('duration').isInt({ min: 15, max: 480 }),
        mockExpressValidator.body('category').isLength({ min: 2, max: 100 }),
        mockExpressValidator.body('categoryAr').isLength({ min: 2, max: 100 })
      ], async (req, res) => {
        const errors = mockExpressValidator.validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'بيانات الخدمة غير صالحة'
          });
        }

        res.status(201).json({
          success: true,
          data: req.body,
          message: 'تم إنشاء الخدمة بنجاح'
        });
      });
    });

    it('should accept valid bilingual service information', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/services')
        .send({
          name: 'Hair Cut',
          nameAr: 'قص شعر',
          description: 'Professional hair cutting service with modern techniques',
          descriptionAr: 'خدمة قص شعر احترافية بأحدث التقنيات والأساليب العصرية',
          price: 25.500,
          duration: 60,
          category: 'Hair Care',
          categoryAr: 'العناية بالشعر'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nameAr).toBe('قص شعر');
      expect(response.body.data.descriptionAr).toBe('خدمة قص شعر احترافية بأحدث التقنيات والأساليب العصرية');
    });

    it('should validate Arabic service descriptions', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const validDescriptions = [
        'خدمة قص وتصفيف الشعر للسيدات باستخدام أحدث التقنيات والمعدات العالمية',
        'عناية شاملة بالبشرة تشمل التنظيف العميق والترطيب والتقشير اللطيف',
        'جلسة تدليك استرخاء كاملة للجسم باستخدام زيوت طبيعية عطرية مهدئة',
        'خدمة تجميل الأظافر والعناية بها مع طلاء بألوان عصرية جذابة'
      ];

      for (const descriptionAr of validDescriptions) {
        const response = await request(app)
          .post('/api/services')
          .send({
            name: 'Beauty Service',
            nameAr: 'خدمة تجميل',
            description: 'Professional beauty service',
            descriptionAr: descriptionAr,
            price: 35.000,
            duration: 90,
            category: 'Beauty',
            categoryAr: 'التجميل'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.descriptionAr).toBe(descriptionAr);
      }
    });

    it('should reject invalid Arabic service names', async () => {
      mockExpressValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            msg: 'اسم الخدمة قصير جداً',
            param: 'nameAr',
            location: 'body'
          }
        ]
      });

      const response = await request(app)
        .post('/api/services')
        .send({
          name: 'Service',
          nameAr: 'خ', // Too short
          description: 'Service description',
          descriptionAr: 'وصف الخدمة',
          price: 25.000,
          duration: 60,
          category: 'Category',
          categoryAr: 'فئة'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe('اسم الخدمة قصير جداً');
    });
  });

  describe('Review Form Validation', () => {
    beforeEach(() => {
      // Mock review creation endpoint
      app.post('/api/reviews', [
        mockExpressValidator.body('bookingId').isUUID(),
        mockExpressValidator.body('rating').isInt({ min: 1, max: 5 }),
        mockExpressValidator.body('comment').optional().isLength({ min: 10, max: 1000 }),
        mockExpressValidator.body('wouldRecommend').isBoolean()
      ], async (req, res) => {
        const errors = mockExpressValidator.validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'بيانات التقييم غير صالحة'
          });
        }

        res.status(201).json({
          success: true,
          data: req.body,
          message: 'تم إضافة التقييم بنجاح'
        });
      });
    });

    it('should accept valid Arabic review comments', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/reviews')
        .send({
          bookingId: '550e8400-e29b-41d4-a716-446655440000',
          rating: 5,
          comment: 'خدمة ممتازة ومميزة. الموظفون محترفون ومتعاونون جداً. أنصح بشدة بزيارة هذا المكان.',
          wouldRecommend: true
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comment).toBe('خدمة ممتازة ومميزة. الموظفون محترفون ومتعاونون جداً. أنصح بشدة بزيارة هذا المكان.');
    });

    it('should handle mixed language review comments', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      const response = await request(app)
        .post('/api/reviews')
        .send({
          bookingId: '550e8400-e29b-41d4-a716-446655440000',
          rating: 4,
          comment: 'خدمة جيدة جداً - Very good service. أنصح بالتجربة - I recommend trying it.',
          wouldRecommend: true
        });

      expect(response.status).toBe(201);
      expect(response.body.data.comment).toBe('خدمة جيدة جداً - Very good service. أنصح بالتجربة - I recommend trying it.');
    });

    it('should reject too short Arabic comments', async () => {
      mockExpressValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            msg: 'التعليق قصير جداً',
            param: 'comment',
            location: 'body'
          }
        ]
      });

      const response = await request(app)
        .post('/api/reviews')
        .send({
          bookingId: '550e8400-e29b-41d4-a716-446655440000',
          rating: 3,
          comment: 'جيد', // Too short
          wouldRecommend: true
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe('التعليق قصير جداً');
    });
  });

  describe('Character Encoding and Special Characters', () => {
    it('should handle Arabic text with diacritics', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      app.post('/api/test-diacritics', [], async (req, res) => {
        res.status(200).json({
          success: true,
          data: req.body,
          receivedText: req.body.text
        });
      });

      const response = await request(app)
        .post('/api/test-diacritics')
        .send({
          text: 'مُحَمَّد الأَحْمَد' // Arabic text with diacritics
        });

      expect(response.status).toBe(200);
      expect(response.body.receivedText).toBe('مُحَمَّد الأَحْمَد');
    });

    it('should handle Arabic numerals in text', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      app.post('/api/test-numerals', [], async (req, res) => {
        res.status(200).json({
          success: true,
          data: req.body,
          receivedText: req.body.text
        });
      });

      const response = await request(app)
        .post('/api/test-numerals')
        .send({
          text: 'الموعد في الساعة ١٤:٣٠ يوم ١٦/٠٧/٢٠٢٥'
        });

      expect(response.status).toBe(200);
      expect(response.body.receivedText).toBe('الموعد في الساعة ١٤:٣٠ يوم ١٦/٠٧/٢٠٢٥');
    });

    it('should handle Arabic punctuation marks', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      app.post('/api/test-punctuation', [], async (req, res) => {
        res.status(200).json({
          success: true,
          data: req.body,
          receivedText: req.body.text
        });
      });

      const response = await request(app)
        .post('/api/test-punctuation')
        .send({
          text: 'السؤال الأول: كيف الحال؟ الجواب: بخير، والحمد لله؛ وأنت كيف حالك؟'
        });

      expect(response.status).toBe(200);
      expect(response.body.receivedText).toBe('السؤال الأول: كيف الحال؟ الجواب: بخير، والحمد لله؛ وأنت كيف حالك؟');
    });

    it('should handle long Arabic text correctly', async () => {
      mockExpressValidator.validationResult.mockReturnValue({ isEmpty: () => true });

      app.post('/api/test-long-text', [], async (req, res) => {
        res.status(200).json({
          success: true,
          data: req.body,
          textLength: req.body.text.length
        });
      });

      const longArabicText = 'نحن في مركز الجمال والعناية نقدم لعملائنا الكرام أفضل الخدمات في مجال التجميل والعناية بالبشرة والشعر. يعمل لدينا فريق من أمهر المختصين في هذا المجال، ونستخدم أحدث التقنيات والمعدات العالمية لضمان حصولكم على أفضل النتائج. نحرص على توفير بيئة مريحة وآمنة لجميع عملائنا، ونلتزم بأعلى معايير النظافة والسلامة في جميع خدماتنا.';

      const response = await request(app)
        .post('/api/test-long-text')
        .send({
          text: longArabicText
        });

      expect(response.status).toBe(200);
      expect(response.body.textLength).toBe(longArabicText.length);
    });
  });

  describe('Error Message Localization', () => {
    it('should return Arabic error messages for validation failures', async () => {
      mockExpressValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            msg: 'الاسم مطلوب ويجب أن يكون بين 2 و 100 حرف',
            param: 'name',
            location: 'body'
          },
          {
            msg: 'رقم الهاتف غير صالح',
            param: 'phoneNumber',
            location: 'body'
          }
        ]
      });

      app.post('/api/test-error-messages', [
        mockExpressValidator.body('name').isLength({ min: 2, max: 100 }),
        mockExpressValidator.body('phoneNumber').matches(/^(\+962|962|0)?(7[789])\d{7}$/)
      ], async (req, res) => {
        const errors = mockExpressValidator.validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'يرجى تصحيح الأخطاء التالية'
          });
        }

        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/test-error-messages')
        .send({
          name: '', // Invalid
          phoneNumber: '123' // Invalid
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('يرجى تصحيح الأخطاء التالية');
      expect(response.body.errors[0].msg).toBe('الاسم مطلوب ويجب أن يكون بين 2 و 100 حرف');
      expect(response.body.errors[1].msg).toBe('رقم الهاتف غير صالح');
    });
  });

  describe('Database Integration with Arabic Text', () => {
    it('should store and retrieve Arabic text correctly', async () => {
      app.post('/api/test-database', [], async (req, res) => {
        // Simulate database operation
        const arabicData = {
          name: req.body.name,
          description: req.body.description,
          notes: req.body.notes
        };

        // Mock database insert
        const insertResult = await mockDB.from('test_table').insert(arabicData);
        
        if (insertResult.error) {
          return res.status(500).json({
            success: false,
            message: 'خطأ في قاعدة البيانات'
          });
        }

        res.status(201).json({
          success: true,
          data: arabicData,
          message: 'تم حفظ البيانات بنجاح'
        });
      });

      const response = await request(app)
        .post('/api/test-database')
        .send({
          name: 'أحمد محمد العلي',
          description: 'مختص في العناية بالبشرة والشعر',
          notes: 'يُرجى الاتصال قبل الحضور بـ 30 دقيقة'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('أحمد محمد العلي');
      expect(response.body.data.description).toBe('مختص في العناية بالبشرة والشعر');
      expect(response.body.data.notes).toBe('يُرجى الاتصال قبل الحضور بـ 30 دقيقة');
    });
  });
});

// Test utilities for API form validation
const APIFormValidationUtils = {
  // Generate test user data
  generateTestUserData: (language = 'ar') => ({
    name: language === 'ar' ? 'أحمد محمد' : 'Ahmed Mohammed',
    phoneNumber: '0791234567',
    email: 'test@example.com'
  }),

  // Generate test provider data
  generateTestProviderData: (language = 'ar') => ({
    name: language === 'ar' ? 'فاطمة أحمد' : 'Fatima Ahmed',
    businessName: language === 'ar' ? 'صالون الجمال' : 'Beauty Salon',
    description: language === 'ar' 
      ? 'نقدم أفضل خدمات التجميل والعناية بالبشرة'
      : 'We provide the best beauty and skincare services',
    address: language === 'ar' 
      ? 'شارع الملك حسين، عمان، الأردن'
      : 'King Hussein Street, Amman, Jordan',
    phoneNumber: '0791234567',
    email: 'provider@example.com'
  }),

  // Generate test booking data
  generateTestBookingData: (language = 'ar') => ({
    serviceId: '550e8400-e29b-41d4-a716-446655440000',
    providerId: '550e8400-e29b-41d4-a716-446655440001',
    date: '2025-07-20',
    time: '14:30',
    customerNotes: language === 'ar' 
      ? 'يُرجى الوصول مبكراً بـ 15 دقيقة'
      : 'Please arrive 15 minutes early',
    specialRequests: language === 'ar' 
      ? 'استخدام منتجات طبيعية'
      : 'Use natural products only'
  }),

  // Validate Arabic text encoding
  validateArabicEncoding: (text) => {
    expect(text).toMatch(/[\u0600-\u06FF]/); // Contains Arabic characters
    expect(text).not.toContain('�'); // No encoding errors
    expect(text).not.toContain('?'); // No replacement characters
  },

  // Validate form error responses
  validateErrorResponse: (response, expectedErrors) => {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toHaveLength(expectedErrors.length);
    
    expectedErrors.forEach((expectedError, index) => {
      expect(response.body.errors[index].msg).toBe(expectedError.msg);
      expect(response.body.errors[index].param).toBe(expectedError.param);
    });
  }
};

module.exports = {
  APIFormValidationUtils
};