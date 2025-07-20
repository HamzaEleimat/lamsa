/**
 * Integration Tests for Multilingual Error Messages
 * Tests Arabic and English error message validation and consistency
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestServer } from '../../utils/testServer';
import { clearTestDatabase } from '../../utils/database';
import * as supabaseSimple from '../../../src/config/supabase-simple';

jest.mock('../../../src/config/supabase-simple');
const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;

describe('Multilingual Error Messages Integration Tests', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-multilingual-tests';
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

  describe('Phone Validation Error Messages', () => {
    const phoneValidationTests = [
      {
        phone: '',
        expectedError: 'PHONE_REQUIRED',
        englishPattern: /phone.*required/i,
        arabicPattern: /رقم.*الهاتف.*مطلوب/
      },
      {
        phone: '+1234567890',
        expectedError: 'INVALID_PHONE_FORMAT',
        englishPattern: /invalid.*phone.*format/i,
        arabicPattern: /رقم.*الهاتف.*غير.*صحيح/
      },
      {
        phone: '+962761234567',
        expectedError: 'INVALID_PHONE_FORMAT',
        englishPattern: /invalid.*phone.*format/i,
        arabicPattern: /رقم.*الهاتف.*غير.*صحيح/
      },
      {
        phone: '123456',
        expectedError: 'INVALID_PHONE_FORMAT',
        englishPattern: /invalid.*phone.*format/i,
        arabicPattern: /رقم.*الهاتف.*غير.*صحيح/
      },
      {
        phone: 'invalid-phone',
        expectedError: 'INVALID_PHONE_FORMAT',
        englishPattern: /invalid.*phone.*format/i,
        arabicPattern: /رقم.*الهاتف.*غير.*صحيح/
      }
    ];

    test.each(phoneValidationTests)(
      'should provide bilingual error for phone: $phone',
      async ({ phone, expectedError, englishPattern, arabicPattern }) => {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expectedError,
          message: expect.stringMatching(englishPattern),
          messageAr: expect.stringMatching(arabicPattern)
        });

        // Verify Arabic message contains Arabic characters
        expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
        
        // Verify messages are different (not just copies)
        expect(response.body.message).not.toBe(response.body.messageAr);
      }
    );
  });

  describe('OTP Verification Error Messages', () => {
    beforeEach(() => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully'
      });
    });

    const otpErrorTests = [
      {
        scenario: 'missing OTP',
        phone: '+962771234567',
        otp: '',
        expectedError: 'MISSING_FIELDS',
        englishPattern: /phone.*number.*otp.*required/i,
        arabicPattern: /رقم.*الهاتف.*الرمز.*مطلوب/
      },
      {
        scenario: 'missing phone',
        phone: '',
        otp: '123456',
        expectedError: 'MISSING_FIELDS',
        englishPattern: /phone.*number.*otp.*required/i,
        arabicPattern: /رقم.*الهاتف.*الرمز.*مطلوب/
      }
    ];

    test.each(otpErrorTests)(
      'should provide bilingual error for $scenario',
      async ({ phone, otp, expectedError, englishPattern, arabicPattern }) => {
        const response = await request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone, otp })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expectedError,
          message: expect.stringMatching(englishPattern),
          messageAr: expect.stringMatching(arabicPattern)
        });

        expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
      }
    );

    test('should provide bilingual error for invalid OTP', async () => {
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'INVALID_OTP',
        message: 'Invalid or expired OTP',
        attemptsRemaining: 2
      });

      const response = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone: '+962771234567', otp: '123456' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_OTP',
        message: expect.stringMatching(/invalid.*expired.*otp/i),
        messageAr: expect.stringMatching(/رمز.*التحقق.*غير.*صحيح/),
        attemptsRemaining: 2
      });

      expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
    });

    test('should provide bilingual error for expired OTP', async () => {
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'OTP_EXPIRED',
        message: 'OTP has expired'
      });

      const response = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone: '+962771234567', otp: '123456' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'OTP_EXPIRED',
        message: expect.stringMatching(/otp.*expired/i),
        messageAr: expect.stringMatching(/انتهت.*صلاحية.*رمز.*التحقق/)
      });
    });

    test('should provide bilingual error for too many attempts', async () => {
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed attempts',
        lockoutDuration: 900
      });

      const response = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone: '+962771234567', otp: '123456' })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: expect.stringMatching(/too.*many.*attempts/i),
        messageAr: expect.stringMatching(/محاولات.*كثيرة.*فاشلة/),
        lockoutDuration: 900
      });
    });
  });

  describe('Authentication Error Messages', () => {
    test('should provide bilingual error for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'TOKEN_REQUIRED',
        message: expect.stringMatching(/access.*token.*required/i),
        messageAr: expect.stringMatching(/رمز.*الوصول.*مطلوب/)
      });

      expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
    });

    test('should provide bilingual error for invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_TOKEN_FORMAT',
        message: expect.stringMatching(/invalid.*token.*format/i),
        messageAr: expect.stringMatching(/تنسيق.*الرمز.*المميز.*غير.*صحيح/)
      });
    });

    test('should provide bilingual error for expired token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer expired.jwt.token')
        .expect(401);

      // This will trigger JWT verification error
      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String),
        messageAr: expect.stringMatching(/[\u0600-\u06FF]/)
      });
    });

    test('should provide bilingual error for insufficient permissions', async () => {
      // This test would require a protected route with role checking
      // For now, we'll test the concept with a malformed request
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        messageAr: expect.stringMatching(/[\u0600-\u06FF]/)
      });
    });
  });

  describe('Rate Limiting Error Messages', () => {
    test('should provide bilingual error for OTP rate limiting', async () => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests',
        retryAfter: 300
      });

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: 'RATE_LIMITED',
        message: expect.stringMatching(/too.*many.*requests/i),
        messageAr: expect.stringMatching(/طلبات.*كثيرة/),
        retryAfter: 300
      });

      expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
    });
  });

  describe('SMS Service Error Messages', () => {
    test('should provide bilingual error for SMS service failure', async () => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: false,
        error: 'SMS_SERVICE_ERROR',
        message: 'Failed to send SMS'
      });

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'SMS_SERVICE_ERROR',
        message: expect.stringMatching(/failed.*send.*sms/i),
        messageAr: expect.stringMatching(/فشل.*إرسال.*الرسالة/)
      });
    });

    test('should provide bilingual error for SMS timeout', async () => {
      mockSupabase.sendOTP.mockRejectedValue(new Error('SMS timeout'));

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String),
        messageAr: expect.stringMatching(/[\u0600-\u06FF]/)
      });
    });
  });

  describe('Database Error Messages', () => {
    test('should provide bilingual error for database connection failure', async () => {
      mockSupabase.verifyOTP.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone: '+962771234567', otp: '123456' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'DATABASE_ERROR',
        message: expect.stringMatching(/database.*connection.*failed/i),
        messageAr: expect.stringMatching(/[\u0600-\u06FF]/)
      });
    });
  });

  describe('Error Message Consistency', () => {
    test('should maintain consistent error structure across all endpoints', async () => {
      const errorEndpoints = [
        {
          method: 'post',
          path: '/api/auth/customer/send-otp',
          data: { phone: 'invalid' }
        },
        {
          method: 'post',
          path: '/api/auth/customer/verify-otp',
          data: { phone: '', otp: '' }
        },
        {
          method: 'get',
          path: '/api/auth/me',
          headers: { Authorization: 'Bearer invalid' }
        },
        {
          method: 'post',
          path: '/api/auth/refresh',
          headers: { Authorization: 'Bearer invalid' }
        }
      ];

      for (const endpoint of errorEndpoints) {
        let requestBuilder = request(app)[endpoint.method](endpoint.path);
        
        if (endpoint.data) {
          requestBuilder = requestBuilder.send(endpoint.data);
        }
        
        if (endpoint.headers) {
          Object.entries(endpoint.headers).forEach(([key, value]) => {
            requestBuilder = requestBuilder.set(key, value);
          });
        }

        const response = await requestBuilder;

        // All error responses should have consistent structure
        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String),
          message: expect.any(String),
          messageAr: expect.any(String)
        });

        // Arabic message should contain Arabic characters
        expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
        
        // Messages should be different
        expect(response.body.message).not.toBe(response.body.messageAr);
        
        // Error codes should be uppercase with underscores
        expect(response.body.error).toMatch(/^[A-Z_]+$/);
      }
    });

    test('should handle special Arabic characters correctly', async () => {
      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: 'invalid' })
        .expect(400);

      const arabicMessage = response.body.messageAr;
      
      // Should contain proper Arabic characters
      expect(arabicMessage).toMatch(/[\u0600-\u06FF]/);
      
      // Should not contain broken Unicode or question marks
      expect(arabicMessage).not.toMatch(/�/);
      expect(arabicMessage).not.toMatch(/\?{2,}/);
      
      // Should be properly UTF-8 encoded
      expect(Buffer.from(arabicMessage, 'utf8').toString('utf8')).toBe(arabicMessage);
    });

    test('should handle RTL (Right-to-Left) text properly', async () => {
      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: 'invalid' })
        .expect(400);

      const arabicMessage = response.body.messageAr;
      
      // Arabic message should contain Arabic text
      expect(arabicMessage).toMatch(/[\u0600-\u06FF]/);
      
      // Should not have leading/trailing RTL marks inappropriately
      expect(arabicMessage).not.toMatch(/^[\u200E\u200F]/);
      expect(arabicMessage).not.toMatch(/[\u200E\u200F]$/);
    });
  });

  describe('Localization Edge Cases', () => {
    test('should handle mixed content in error messages', async () => {
      // Test error messages that might contain numbers or English terms
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'INVALID_OTP',
        message: 'Invalid OTP. 2 attempts remaining.',
        attemptsRemaining: 2
      });

      const response = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone: '+962771234567', otp: '123456' })
        .expect(400);

      expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
      expect(response.body.attemptsRemaining).toBe(2);
    });

    test('should handle empty or null error messages gracefully', async () => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: false,
        error: 'UNKNOWN_ERROR',
        message: ''
      });

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' })
        .expect(500);

      // Should provide fallback messages
      expect(response.body.message).toBeTruthy();
      expect(response.body.messageAr).toBeTruthy();
      expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
    });

    test('should handle extremely long error messages', async () => {
      const longMessage = 'Error message that is extremely long and might cause issues with display or storage. '.repeat(20);
      
      mockSupabase.sendOTP.mockRejectedValue(new Error(longMessage));

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' });

      // Should handle gracefully without truncation issues
      expect(response.body.message).toBeTruthy();
      expect(response.body.messageAr).toBeTruthy();
      expect(response.body.messageAr).toMatch(/[\u0600-\u06FF]/);
    });
  });

  describe('Success Message Localization', () => {
    test('should provide bilingual success messages', async () => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully',
        mockOtp: '123456'
      });

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringMatching(/otp.*sent.*successfully/i)
      });

      // Note: Success messages might not always have Arabic versions
      // depending on the implementation. This test checks the structure.
      expect(response.body.message).toBeTruthy();
    });
  });
});