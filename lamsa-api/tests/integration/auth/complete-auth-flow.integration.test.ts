/**
 * Integration Tests for Complete Authentication Flow
 * Tests end-to-end authentication scenarios with real API calls
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestServer } from '../../utils/testServer';
import { clearTestDatabase, seedTestData } from '../../utils/database';
import * as supabaseSimple from '../../../src/config/supabase-simple';
import * as mockOtp from '../../../src/config/mock-otp';

// Mock external services
jest.mock('../../../src/config/supabase-simple');
jest.mock('../../../src/config/mock-otp');

const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;
const mockOtpService = mockOtp as jest.Mocked<typeof mockOtp>;

describe('Authentication Integration Tests', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    // Create test server
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;

    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    // Clear test database
    await clearTestDatabase();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock responses
    mockSupabase.sendOTP.mockResolvedValue({
      success: true,
      message: 'OTP sent successfully',
      mockOtp: '123456'
    });

    mockSupabase.verifyOTP.mockResolvedValue({
      success: true,
      user: {
        id: 'test-user-123',
        phone: '+962771234567',
        role: 'customer',
        name: 'Test User',
        createdAt: new Date().toISOString()
      }
    });
  });

  describe('Customer Authentication Flow', () => {
    const validPhone = '+962771234567';
    const validOtp = '123456';

    test('should complete full customer authentication flow', async () => {
      // Step 1: Send OTP
      const otpResponse = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: validPhone })
        .expect(200);

      expect(otpResponse.body).toMatchObject({
        success: true,
        message: expect.any(String),
        retryAfter: expect.any(Number)
      });

      expect(mockSupabase.sendOTP).toHaveBeenCalledWith(validPhone, 'customer');

      // Step 2: Verify OTP and get token
      const verifyResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone: validPhone, otp: validOtp })
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        success: true,
        message: expect.any(String),
        user: expect.objectContaining({
          id: 'test-user-123',
          phone: validPhone,
          role: 'customer'
        }),
        token: expect.toBeValidJWT()
      });

      const { token } = verifyResponse.body;

      // Step 3: Use token to access protected route
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meResponse.body).toMatchObject({
        success: true,
        user: expect.objectContaining({
          id: 'test-user-123',
          phone: validPhone,
          role: 'customer'
        })
      });

      // Step 4: Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(refreshResponse.body).toMatchObject({
        success: true,
        token: expect.toBeValidJWT()
      });

      // Step 5: Sign out
      const signOutResponse = await request(app)
        .post('/api/auth/signout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(signOutResponse.body).toMatchObject({
        success: true,
        message: 'Signed out successfully'
      });
    });

    test('should handle customer authentication with various phone formats', async () => {
      const phoneFormats = [
        '+962771234567',
        '962771234567',
        '0771234567',
        '771234567'
      ];

      for (const phone of phoneFormats) {
        // Reset mock for each iteration
        jest.clearAllMocks();
        mockSupabase.sendOTP.mockResolvedValue({
          success: true,
          message: 'OTP sent successfully',
          mockOtp: '123456'
        });

        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
          .expect(200);

        expect(response.body.success).toBe(true);
        // Verify that the phone was normalized to +962 format
        expect(mockSupabase.sendOTP).toHaveBeenCalledWith(
          expect.stringMatching(/^\+962\d{8,9}$/),
          'customer'
        );
      }
    });
  });

  describe('Provider Authentication Flow', () => {
    const validPhone = '+962781234567';
    const validOtp = '123456';

    beforeEach(() => {
      mockSupabase.verifyOTP.mockResolvedValue({
        success: true,
        user: {
          id: 'test-provider-123',
          phone: validPhone,
          role: 'provider',
          businessName: 'Test Beauty Salon',
          createdAt: new Date().toISOString()
        }
      });
    });

    test('should complete full provider authentication flow', async () => {
      // Step 1: Send OTP for provider
      const otpResponse = await request(app)
        .post('/api/auth/provider/send-otp')
        .send({ phone: validPhone })
        .expect(200);

      expect(otpResponse.body.success).toBe(true);
      expect(mockSupabase.sendOTP).toHaveBeenCalledWith(validPhone, 'provider');

      // Step 2: Verify OTP and get provider token
      const verifyResponse = await request(app)
        .post('/api/auth/provider/verify-otp')
        .send({ phone: validPhone, otp: validOtp })
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        success: true,
        user: expect.objectContaining({
          id: 'test-provider-123',
          phone: validPhone,
          role: 'provider'
        }),
        token: expect.toBeValidJWT()
      });

      const { token } = verifyResponse.body;

      // Step 3: Access provider-specific route
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meResponse.body.user.role).toBe('provider');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle invalid phone numbers consistently', async () => {
      const invalidPhones = [
        '+1234567890',  // Wrong country
        '+962761234567', // Wrong prefix (76)
        '123456',       // Too short
        '',             // Empty
        'invalid'       // Non-numeric
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringMatching(/INVALID_PHONE|PHONE_REQUIRED/),
          message: expect.any(String),
          messageAr: expect.any(String)
        });
      }
    });

    test('should handle OTP verification failures', async () => {
      const phone = '+962771234567';

      // Mock OTP failure scenarios
      const failureScenarios = [
        {
          mockResponse: {
            success: false,
            error: 'INVALID_OTP',
            message: 'Invalid or expired OTP',
            attemptsRemaining: 2
          },
          expectedStatus: 400
        },
        {
          mockResponse: {
            success: false,
            error: 'OTP_EXPIRED',
            message: 'OTP has expired'
          },
          expectedStatus: 400
        },
        {
          mockResponse: {
            success: false,
            error: 'TOO_MANY_ATTEMPTS',
            message: 'Too many failed attempts',
            lockoutDuration: 900
          },
          expectedStatus: 429
        }
      ];

      for (const scenario of failureScenarios) {
        mockSupabase.verifyOTP.mockResolvedValue(scenario.mockResponse);

        const response = await request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone, otp: '123456' })
          .expect(scenario.expectedStatus);

        expect(response.body).toMatchObject({
          success: false,
          error: scenario.mockResponse.error,
          message: scenario.mockResponse.message,
          messageAr: expect.any(String)
        });

        // Check for additional fields
        if (scenario.mockResponse.attemptsRemaining) {
          expect(response.body.attemptsRemaining).toBe(scenario.mockResponse.attemptsRemaining);
        }
        if (scenario.mockResponse.lockoutDuration) {
          expect(response.body.lockoutDuration).toBe(scenario.mockResponse.lockoutDuration);
        }
      }
    });

    test('should handle unauthorized access to protected routes', async () => {
      // No token
      await request(app)
        .get('/api/auth/me')
        .expect(401);

      // Invalid token
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Malformed header
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    test('should handle SMS service failures', async () => {
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
        message: 'Failed to send SMS',
        messageAr: expect.any(String)
      });
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should enforce OTP rate limiting', async () => {
      const phone = '+962771234567';

      // Mock rate limit response
      mockSupabase.sendOTP.mockResolvedValue({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests',
        retryAfter: 300
      });

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: 'RATE_LIMITED',
        retryAfter: 300
      });
    });
  });

  describe('Session Management', () => {
    test('should handle token refresh correctly', async () => {
      const phone = '+962771234567';
      
      // Get initial token
      await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone });

      const verifyResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const originalToken = verifyResponse.body.token;

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${originalToken}`)
        .expect(200);

      const newToken = refreshResponse.body.token;

      // Both tokens should be valid JWTs but different
      expect(originalToken).toBeValidJWT();
      expect(newToken).toBeValidJWT();
      expect(originalToken).not.toBe(newToken);

      // New token should work for authenticated requests
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
    });

    test('should handle concurrent authentication requests', async () => {
      const phone = '+962771234567';
      
      // Send multiple OTP requests concurrently
      const otpPromises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
      );

      const responses = await Promise.all(otpPromises);
      
      // All should either succeed or fail with rate limiting
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
        } else {
          expect(response.body.error).toBe('RATE_LIMITED');
        }
      });
    });
  });

  describe('Development Mode Features', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      mockOtpService.sendMockOTP.mockReturnValue('123456');
      mockOtpService.verifyMockOTP.mockReturnValue(true);
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    test('should use mock OTP in development mode', async () => {
      const phone = '+962771234567';

      const otpResponse = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone })
        .expect(200);

      // Should include mock OTP in development
      expect(otpResponse.body).toMatchObject({
        success: true,
        mockOtp: '123456'
      });

      expect(mockOtpService.sendMockOTP).toHaveBeenCalledWith(phone);
    });

    test('should accept test phone numbers in development', async () => {
      const testPhone = '+1234567890'; // US test number

      mockOtpService.sendMockOTP.mockReturnValue('123456');

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: testPhone })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockOtpService.sendMockOTP).toHaveBeenCalledWith(testPhone);
    });
  });

  describe('Multi-language Support', () => {
    test('should return Arabic error messages', async () => {
      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: 'invalid' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String),
        messageAr: expect.stringMatching(/[\u0600-\u06FF]/) // Arabic characters
      });
    });

    test('should handle Arabic phone input gracefully', async () => {
      // Test with Arabic numerals (though this should be handled client-side)
      const phoneWithArabicNumerals = '+٩٦٢٧٧١٢٣٤٥٦٧';
      
      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: phoneWithArabicNumerals })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.messageAr).toBeDefined();
    });
  });
});