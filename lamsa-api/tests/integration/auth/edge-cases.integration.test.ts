/**
 * Integration Tests for Authentication Edge Cases
 * Tests unusual scenarios, security vulnerabilities, and error conditions
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestServer } from '../../utils/testServer';
import { clearTestDatabase } from '../../utils/database';
import * as supabaseSimple from '../../../src/config/supabase-simple';

jest.mock('../../../src/config/supabase-simple');
const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;

describe('Authentication Edge Cases', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-edge-cases';
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

  describe('Phone Number Edge Cases', () => {
    test('should handle extremely long phone numbers', async () => {
      const longPhone = '+962771234567' + '9'.repeat(100);
      
      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: longPhone })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_PHONE_FORMAT'
      });
    });

    test('should handle phone numbers with special characters', async () => {
      const specialCharPhones = [
        '+962-77-123-4567',
        '+962 77 123 4567',
        '+962(77)1234567',
        '+962.77.123.4567',
        '962 77 123 4567',
        '0771234567',
        '771234567'
      ];

      for (const phone of specialCharPhones) {
        mockSupabase.sendOTP.mockResolvedValue({
          success: true,
          message: 'OTP sent successfully'
        });

        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone });

        if (['+962-77-123-4567', '+962 77 123 4567', '962 77 123 4567', '0771234567', '771234567'].includes(phone)) {
          expect(response.status).toBe(200);
          expect(mockSupabase.sendOTP).toHaveBeenCalledWith(
            expect.stringMatching(/^\+962\d{8,9}$/),
            'customer'
          );
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    test('should handle Unicode and emoji in phone numbers', async () => {
      const unicodePhones = [
        '+962771234567🇯🇴',
        '+962771234567📱',
        '+962771234567💯',
        'phone:+962771234567',
        '📞+962771234567'
      ];

      for (const phone of unicodePhones) {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should handle SQL injection attempts in phone field', async () => {
      const maliciousPhones = [
        "'; DROP TABLE users; --",
        "'+962771234567' OR '1'='1",
        "962771234567'; DELETE FROM auth_tokens; --",
        "962771234567\" UNION SELECT * FROM users --"
      ];

      for (const phone of maliciousPhones) {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'INVALID_PHONE_FORMAT'
        });
      }
    });
  });

  describe('OTP Edge Cases', () => {
    beforeEach(() => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully'
      });
    });

    test('should handle various OTP formats', async () => {
      const phone = '+962771234567';
      const otpVariations = [
        '123456',      // Normal
        '000000',      // All zeros
        '999999',      // All nines
        '123456 ',     // Trailing space
        ' 123456',     // Leading space
        '12 34 56',    // Spaces
        '12-34-56',    // Dashes
        '1234567',     // Too long
        '12345',       // Too short
        '',            // Empty
        'ABCDEF',      // Letters
        '12345a',      // Mixed
        '１２３４５６',   // Full-width numbers
        '۱۲۳۴۵۶'       // Arabic-Indic digits
      ];

      for (const otp of otpVariations) {
        if (['123456', '000000', '999999'].includes(otp)) {
          mockSupabase.verifyOTP.mockResolvedValue({
            success: true,
            user: {
              id: 'test-user',
              phone,
              role: 'customer'
            }
          });
          
          await request(app)
            .post('/api/auth/customer/verify-otp')
            .send({ phone, otp })
            .expect(200);
        } else {
          const response = await request(app)
            .post('/api/auth/customer/verify-otp')
            .send({ phone, otp })
            .expect(400);

          expect(response.body.success).toBe(false);
        }
      }
    });

    test('should handle OTP timing attacks', async () => {
      const phone = '+962771234567';
      const correctOtp = '123456';
      const incorrectOtps = ['123455', '123457', '000000', '999999'];

      // Mock correct OTP
      mockSupabase.verifyOTP.mockImplementation((phone, otp) => {
        if (otp === correctOtp) {
          return Promise.resolve({
            success: true,
            user: { id: 'test-user', phone, role: 'customer' }
          });
        }
        return Promise.resolve({
          success: false,
          error: 'INVALID_OTP',
          message: 'Invalid or expired OTP'
        });
      });

      // Test timing consistency
      const timings = [];
      
      for (const otp of [correctOtp, ...incorrectOtps]) {
        const startTime = Date.now();
        
        const response = await request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone, otp });
        
        const endTime = Date.now();
        timings.push(endTime - startTime);
        
        if (otp === correctOtp) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(400);
        }
      }

      // Verify timing consistency (rough check)
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      expect(maxTiming - minTiming).toBeLessThan(100); // Should be within 100ms
    });
  });

  describe('JWT Token Edge Cases', () => {
    test('should handle malformed JWT tokens', async () => {
      const malformedTokens = [
        'notajwt',
        'header.payload',  // Missing signature
        'header.payload.signature.extra',  // Too many parts
        'header..signature',  // Empty payload
        '.payload.signature',  // Empty header
        'header.payload.',  // Empty signature
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_base64.signature',
        'Bearer invalid-token',  // With Bearer prefix
        ''  // Empty string
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    test('should handle extremely long JWT tokens', async () => {
      const longToken = 'a'.repeat(10000);
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${longToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle tokens with null bytes', async () => {
      const tokenWithNulls = 'eyJhbGciOiJIUzI1NiJ9\x00.payload\x00.signature\x00';
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenWithNulls}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Body Edge Cases', () => {
    test('should handle extremely large request bodies', async () => {
      const largePhone = 'a'.repeat(1000000); // 1MB string
      
      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: largePhone })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle nested objects in request body', async () => {
      const nestedRequest = {
        phone: {
          number: '+962771234567',
          nested: {
            deep: {
              value: 'test'
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send(nestedRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle array values in phone field', async () => {
      const arrayRequest = {
        phone: ['+962771234567', '+962781234567']
      };

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send(arrayRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle null and undefined values', async () => {
      const nullRequests = [
        { phone: null },
        { phone: undefined },
        { otp: null },
        { otp: undefined }
      ];

      for (const req of nullRequests) {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send(req)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Concurrent Request Edge Cases', () => {
    test('should handle rapid successive OTP requests', async () => {
      const phone = '+962771234567';
      
      mockSupabase.sendOTP.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully'
      });

      // Send 10 rapid requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone })
      );

      const responses = await Promise.all(promises);

      // Some should succeed, some might be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(10);
      expect(successCount).toBeGreaterThan(0); // At least one should succeed
    });

    test('should handle concurrent verification attempts', async () => {
      const phone = '+962771234567';
      const otp = '123456';
      
      mockSupabase.verifyOTP.mockResolvedValue({
        success: true,
        user: {
          id: 'test-user',
          phone,
          role: 'customer'
        }
      });

      // Send 5 concurrent verify requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone, otp })
      );

      const responses = await Promise.all(promises);

      // All should either succeed or handle gracefully
      responses.forEach(response => {
        expect([200, 400, 429]).toContain(response.status);
      });
    });
  });

  describe('Memory and Resource Edge Cases', () => {
    test('should handle memory exhaustion scenarios', async () => {
      // Create a very large request payload
      const largeData = {
        phone: '+962771234567',
        metadata: 'x'.repeat(100000) // 100KB string
      };

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send(largeData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle circular reference in request', async () => {
      const circularObj: any = { phone: '+962771234567' };
      circularObj.circular = circularObj;

      // This should be handled by Express body parser
      try {
        await request(app)
          .post('/api/auth/customer/send-otp')
          .send(JSON.stringify(circularObj))
          .set('Content-Type', 'application/json');
      } catch (error) {
        // Expected to fail at JSON.stringify level
        expect(error).toBeDefined();
      }
    });
  });

  describe('Network Failure Simulation', () => {
    test('should handle Supabase connection timeouts', async () => {
      mockSupabase.sendOTP.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );

      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/TIMEOUT|CONNECTION|ERROR/)
      });
    });

    test('should handle SMS service intermittent failures', async () => {
      let callCount = 0;
      mockSupabase.sendOTP.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.resolve({
            success: false,
            error: 'SMS_SERVICE_ERROR',
            message: 'Temporary SMS service failure'
          });
        }
        return Promise.resolve({
          success: true,
          message: 'OTP sent successfully'
        });
      });

      // First call should fail
      await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' })
        .expect(500);

      // Second call should succeed
      await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962771234567' })
        .expect(200);
    });
  });

  describe('Security Attack Simulation', () => {
    test('should resist brute force OTP attacks', async () => {
      const phone = '+962771234567';
      
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'INVALID_OTP',
        message: 'Invalid or expired OTP',
        attemptsRemaining: 0
      });

      // Simulate 100 brute force attempts
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone, otp: String(i).padStart(6, '0') })
      );

      const responses = await Promise.all(promises);

      // All should fail, many should be rate limited
      const failedCount = responses.filter(r => r.status === 400).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(failedCount + rateLimitedCount).toBe(100);
      expect(rateLimitedCount).toBeGreaterThan(50); // Most should be rate limited
    });

    test('should handle XSS attempts in request fields', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone: payload })
          .expect(400);

        expect(response.body.success).toBe(false);
        // Ensure the payload is not reflected in the response
        expect(JSON.stringify(response.body)).not.toContain('<script>');
        expect(JSON.stringify(response.body)).not.toContain('javascript:');
      }
    });
  });
});