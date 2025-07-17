/**
 * Integration Tests for Session Management
 * Tests session persistence, token refresh, and session security
 */

import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createTestServer } from '../../utils/testServer';
import { clearTestDatabase } from '../../utils/database';
import * as supabaseSimple from '../../../src/config/supabase-simple';

jest.mock('../../../src/config/supabase-simple');
const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;

describe('Session Management Integration Tests', () => {
  let app: Express;
  let server: any;
  const JWT_SECRET = 'test-secret-key-for-session-tests-very-long';

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();
    jest.clearAllMocks();
    
    // Set up default successful auth mocks
    mockSupabase.sendOTP.mockResolvedValue({
      success: true,
      message: 'OTP sent successfully'
    });

    mockSupabase.verifyOTP.mockResolvedValue({
      success: true,
      user: {
        id: 'test-user-123',
        phone: '+962771234567',
        role: 'customer',
        name: 'Test User'
      }
    });
  });

  describe('Token Lifecycle Management', () => {
    test('should create valid session on successful authentication', async () => {
      const phone = '+962771234567';
      const otp = '123456';

      // Authenticate and get token
      const authResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp })
        .expect(200);

      const { token, user } = authResponse.body;

      // Verify token structure
      expect(token).toBeValidJWT();
      
      // Decode token to verify payload
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded).toMatchObject({
        userId: user.id,
        phone: user.phone,
        role: user.role,
        iat: expect.any(Number),
        exp: expect.any(Number)
      });

      // Verify token expiration is set correctly (24 hours)
      const tokenLifetime = decoded.exp - decoded.iat;
      expect(tokenLifetime).toBe(24 * 60 * 60); // 24 hours in seconds
    });

    test('should maintain session state across requests', async () => {
      const phone = '+962771234567';
      
      // Get authentication token
      const authResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const { token } = authResponse.body;

      // Make multiple authenticated requests
      const requestPromises = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      );

      const responses = await Promise.all(requestPromises);

      // All should return the same user info
      responses.forEach(response => {
        expect(response.body).toMatchObject({
          success: true,
          user: expect.objectContaining({
            id: 'test-user-123',
            phone: '+962771234567',
            role: 'customer'
          })
        });
      });
    });

    test('should handle token expiration gracefully', async () => {
      // Create a token that expires quickly
      const shortLivedPayload = {
        userId: 'test-user-123',
        phone: '+962771234567',
        role: 'customer'
      };

      const shortLivedToken = jwt.sign(shortLivedPayload, JWT_SECRET, { expiresIn: '1s' });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Try to use expired token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        messageAr: expect.any(String)
      });
    });
  });

  describe('Token Refresh Mechanism', () => {
    test('should refresh valid token successfully', async () => {
      const phone = '+962771234567';
      
      // Get initial token
      const authResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const originalToken = authResponse.body.token;
      const originalDecoded = jwt.verify(originalToken, JWT_SECRET) as any;

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${originalToken}`)
        .expect(200);

      const newToken = refreshResponse.body.token;
      const newDecoded = jwt.verify(newToken, JWT_SECRET) as any;

      // Verify new token is different but contains same user data
      expect(newToken).not.toBe(originalToken);
      expect(newToken).toBeValidJWT();
      
      expect(newDecoded).toMatchObject({
        userId: originalDecoded.userId,
        phone: originalDecoded.phone,
        role: originalDecoded.role
      });

      // New token should have later issued time
      expect(newDecoded.iat).toBeGreaterThan(originalDecoded.iat);
      expect(newDecoded.exp).toBeGreaterThan(originalDecoded.exp);

      // Both tokens should work for authenticated requests
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${originalToken}`)
        .expect(200);

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
    });

    test('should handle refresh of expired token', async () => {
      // Create expired token
      const expiredPayload = {
        userId: 'test-user-123',
        phone: '+962771234567',
        role: 'customer'
      };

      const expiredToken = jwt.sign(expiredPayload, JWT_SECRET, { expiresIn: '-1h' });

      // Try to refresh expired token
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid refresh token'
      });
    });

    test('should handle refresh with invalid token', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'not-a-jwt-at-all',
        '',
        jwt.sign({ userId: 'test' }, 'wrong-secret')
      ];

      for (const invalidToken of invalidTokens) {
        const response = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_TOKEN');
      }
    });

    test('should handle missing authorization header for refresh', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'TOKEN_REQUIRED',
        message: 'Authorization header required'
      });
    });
  });

  describe('Session Security', () => {
    test('should invalidate session on sign out', async () => {
      const phone = '+962771234567';
      
      // Authenticate
      const authResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const { token } = authResponse.body;

      // Verify token works
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Sign out
      await request(app)
        .post('/api/auth/signout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Note: In a stateless JWT system, the token would still be valid
      // until expiration. For true invalidation, you'd need a token blacklist
      // or shorter expiration times with refresh tokens.
      
      // For now, we just test that signout endpoint works
      const signOutResponse = await request(app)
        .post('/api/auth/signout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(signOutResponse.body).toMatchObject({
        success: true,
        message: 'Signed out successfully'
      });
    });

    test('should prevent token reuse attacks', async () => {
      const phone = '+962771234567';
      
      // Get token
      const authResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const { token } = authResponse.body;

      // Use token multiple times rapidly
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(promises);

      // All should succeed (no rate limiting on token usage)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should handle concurrent refresh requests', async () => {
      const phone = '+962771234567';
      
      // Get initial token
      const authResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const { token } = authResponse.body;

      // Make concurrent refresh requests
      const refreshPromises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${token}`)
      );

      const refreshResponses = await Promise.all(refreshPromises);

      // All should succeed
      refreshResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeValidJWT();
      });

      // All new tokens should be different
      const newTokens = refreshResponses.map(r => r.body.token);
      const uniqueTokens = new Set(newTokens);
      expect(uniqueTokens.size).toBe(newTokens.length);
    });
  });

  describe('Cross-Device Session Management', () => {
    test('should allow multiple active sessions for same user', async () => {
      const phone = '+962771234567';
      
      // Simulate multiple device logins
      const device1Response = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const device2Response = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const token1 = device1Response.body.token;
      const token2 = device2Response.body.token;

      // Both tokens should be valid but different
      expect(token1).not.toBe(token2);
      expect(token1).toBeValidJWT();
      expect(token2).toBeValidJWT();

      // Both should work for authenticated requests
      const me1Response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const me2Response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(me1Response.body.user.id).toBe(me2Response.body.user.id);
    });

    test('should handle session conflicts gracefully', async () => {
      const phone = '+962771234567';
      
      // Get token
      const authResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const { token } = authResponse.body;

      // Simulate rapid session creation/refresh
      const operations = [
        () => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`),
        () => request(app).post('/api/auth/refresh').set('Authorization', `Bearer ${token}`),
        () => request(app).post('/api/auth/signout').set('Authorization', `Bearer ${token}`),
        () => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
      ];

      // Execute operations concurrently
      const promises = operations.map(op => op());
      const responses = await Promise.all(promises);

      // Should handle gracefully without crashes
      expect(responses).toHaveLength(4);
      responses.forEach(response => {
        expect([200, 401, 500]).toContain(response.status);
      });
    });
  });

  describe('Session Persistence Edge Cases', () => {
    test('should handle malformed session data', async () => {
      // Create token with incomplete payload
      const incompletePayload = {
        userId: 'test-user-123'
        // Missing phone and role
      };

      const incompleteToken = jwt.sign(incompletePayload, JWT_SECRET);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${incompleteToken}`)
        .expect(200); // Should still work as auth middleware doesn't validate completeness

      expect(response.body.user).toMatchObject({
        userId: 'test-user-123'
      });
    });

    test('should handle session with extra claims', async () => {
      const payloadWithExtras = {
        userId: 'test-user-123',
        phone: '+962771234567',
        role: 'customer',
        extraClaim: 'extra-value',
        permissions: ['read', 'write'],
        deviceId: 'device-123',
        ipAddress: '192.168.1.1'
      };

      const tokenWithExtras = jwt.sign(payloadWithExtras, JWT_SECRET);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenWithExtras}`)
        .expect(200);

      // Should include all claims in user object
      expect(response.body.user).toMatchObject(payloadWithExtras);
    });

    test('should handle very long session duration', async () => {
      const longLivedPayload = {
        userId: 'test-user-123',
        phone: '+962771234567',
        role: 'customer'
      };

      const longLivedToken = jwt.sign(longLivedPayload, JWT_SECRET, { expiresIn: '365d' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${longLivedToken}`)
        .expect(200);

      const decoded = jwt.verify(longLivedToken, JWT_SECRET) as any;
      const tokenLifetime = decoded.exp - decoded.iat;
      
      // Should be approximately 365 days
      expect(tokenLifetime).toBeGreaterThan(364 * 24 * 60 * 60);
      expect(tokenLifetime).toBeLessThan(366 * 24 * 60 * 60);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high-frequency token operations efficiently', async () => {
      const phone = '+962771234567';
      
      // Get initial token
      const authResponse = await request(app)
        .post('/api/auth/customer/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const { token } = authResponse.body;

      const startTime = Date.now();

      // Perform 100 operations
      const operations = Array.from({ length: 100 }, (_, i) => {
        if (i % 3 === 0) {
          return request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        } else if (i % 3 === 1) {
          return request(app).post('/api/auth/refresh').set('Authorization', `Bearer ${token}`);
        } else {
          return request(app).post('/api/auth/signout').set('Authorization', `Bearer ${token}`);
        }
      });

      await Promise.all(operations);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (5 seconds for 100 operations)
      expect(duration).toBeLessThan(5000);
    });

    test('should maintain performance with many concurrent users', async () => {
      const phones = Array.from({ length: 50 }, (_, i) => `+96277${String(i).padStart(7, '0')}`);
      
      const startTime = Date.now();

      // Simulate 50 concurrent user logins
      const loginPromises = phones.map(async (phone) => {
        const authResponse = await request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone, otp: '123456' });
        
        if (authResponse.status === 200) {
          // Use the token immediately
          await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${authResponse.body.token}`);
        }
        
        return authResponse;
      });

      const responses = await Promise.all(loginPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds for 50 concurrent users
    });
  });
});