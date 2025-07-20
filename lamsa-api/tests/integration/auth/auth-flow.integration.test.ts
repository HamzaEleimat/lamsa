/**
 * Integration tests for Authentication Flow
 * Tests the complete auth journey including OTP
 */

import request from 'supertest';
import app from '../../../src/app';
import { supabase } from '../../../src/config/supabase-simple';
import { mockOTP } from '../../../src/config/mock-otp';
import { tokenBlacklist } from '../../../src/utils/token-blacklist';
import { refreshTokenManager } from '../../../src/utils/refresh-token-manager';

// Mock Supabase
jest.mock('../../../src/config/supabase-simple', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn()
    },
    from: jest.fn()
  },
  db: {
    from: jest.fn()
  },
  auth: {
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn()
  }
}));

describe('Authentication Flow Integration Tests', () => {
  const testPhone = '+962791234567';
  const testOTP = '123456';
  let authToken: string;
  let refreshToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset in-memory stores
    tokenBlacklist['blacklistedTokens'].clear();
    refreshTokenManager['refreshTokens'].clear();
  });

  describe('Customer OTP Flow', () => {
    describe('POST /api/auth/customer/send-otp', () => {
      it('should send OTP for valid Jordan phone number', async () => {
        // Mock Supabase response
        (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
          success: true,
          data: { messageId: 'test-message-id' }
        });

        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone: testPhone })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: { phone: testPhone },
          message: 'OTP sent successfully'
        });

        expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
          phone: testPhone
        });
      });

      it('should validate phone number format', async () => {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone: '123456' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid');
      });

      it('should handle missing phone number', async () => {
        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Phone number is required');
      });

      it('should use mock OTP in development', async () => {
        process.env.NODE_ENV = 'development';
        process.env.MOCK_OTP = 'true';

        const response = await request(app)
          .post('/api/auth/customer/send-otp')
          .send({ phone: testPhone })
          .expect(200);

        expect(response.body.success).toBe(true);
        // Check that mock OTP was generated
        expect(mockOTP.verify(testPhone, '123456')).toBe(true);

        process.env.NODE_ENV = 'test';
      });
    });

    describe('POST /api/auth/customer/verify-otp', () => {
      beforeEach(() => {
        // Setup mock OTP
        mockOTP.generate(testPhone);
      });

      it('should verify OTP and return tokens', async () => {
        // Mock Supabase responses
        (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            user: { id: 'user-123', phone: testPhone },
            session: { access_token: 'supabase-token' }
          }
        });

        const mockUser = {
          id: 'user-123',
          phone: testPhone,
          name: 'Test User',
          preferred_language: 'ar'
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
        });

        const response = await request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone: testPhone, code: testOTP })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('refreshToken');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toEqual({
          id: 'user-123',
          phone: testPhone,
          name: 'Test User',
          preferred_language: 'ar',
          type: 'customer'
        });

        authToken = response.body.data.token;
        refreshToken = response.body.data.refreshToken;
      });

      it('should create new user if not exists', async () => {
        (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            user: { id: 'new-user-123', phone: testPhone },
            session: { access_token: 'supabase-token' }
          }
        });

        // First query returns no user
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        });

        // Insert returns new user
        const newUser = {
          id: 'new-user-123',
          phone: testPhone,
          name: null,
          preferred_language: 'ar'
        };

        (supabase.from as jest.Mock).mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: newUser, error: null })
        });

        const response = await request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone: testPhone, code: testOTP })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.id).toBe('new-user-123');
      });

      it('should reject invalid OTP', async () => {
        (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
          success: false,
          error: { message: 'Invalid OTP' }
        });

        const response = await request(app)
          .post('/api/auth/customer/verify-otp')
          .send({ phone: testPhone, code: '999999' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid OTP');
      });
    });
  });

  describe('Provider Authentication', () => {
    const providerEmail = 'provider@beautycort.com';
    const providerPassword = 'SecurePass123!';

    describe('POST /api/auth/provider/signup', () => {
      it('should create new provider account', async () => {
        const signupData = {
          email: providerEmail,
          password: providerPassword,
          phone: testPhone,
          business_name_ar: 'صالون الجمال',
          business_name_en: 'Beauty Salon',
          owner_name: 'Test Provider',
          latitude: 31.9454,
          longitude: 35.9284,
          address: {
            street: 'Test Street',
            city: 'Amman',
            district: 'Test District',
            country: 'Jordan'
          }
        };

        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        });

        const mockProvider = {
          id: 'provider-123',
          ...signupData,
          password_hash: 'hashed',
          location: `POINT(${signupData.longitude} ${signupData.latitude})`,
          verified: false,
          active: true
        };

        (supabase.from as jest.Mock).mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProvider, error: null })
        });

        const response = await request(app)
          .post('/api/auth/provider/signup')
          .send(signupData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('refreshToken');
        expect(response.body.data.provider.email).toBe(providerEmail);
      });

      it('should reject duplicate email', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { id: 'existing-provider' }, 
            error: null 
          })
        });

        const response = await request(app)
          .post('/api/auth/provider/signup')
          .send({
            email: providerEmail,
            password: providerPassword,
            phone: testPhone,
            business_name_ar: 'صالون الجمال',
            business_name_en: 'Beauty Salon',
            owner_name: 'Test Provider',
            latitude: 31.9454,
            longitude: 35.9284,
            address: {
              street: 'Test Street',
              city: 'Amman',
              district: 'Test District',
              country: 'Jordan'
            }
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already registered');
      });
    });

    describe('POST /api/auth/provider/login', () => {
      it('should login provider with valid credentials', async () => {
        const mockProvider = {
          id: 'provider-123',
          email: providerEmail,
          password_hash: '$2a$10$YourHashedPasswordHere',
          business_name_en: 'Beauty Salon',
          active: true,
          verified: true
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProvider, error: null })
        });

        // Mock bcrypt comparison
        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);

        const response = await request(app)
          .post('/api/auth/provider/login')
          .send({ email: providerEmail, password: providerPassword })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('refreshToken');
      });

      it('should reject invalid password', async () => {
        const mockProvider = {
          id: 'provider-123',
          email: providerEmail,
          password_hash: '$2a$10$YourHashedPasswordHere',
          active: true
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProvider, error: null })
        });

        jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

        const response = await request(app)
          .post('/api/auth/provider/login')
          .send({ email: providerEmail, password: 'wrongpassword' })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid credentials');
      });

      it('should reject inactive provider', async () => {
        const mockProvider = {
          id: 'provider-123',
          email: providerEmail,
          password_hash: '$2a$10$YourHashedPasswordHere',
          active: false
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProvider, error: null })
        });

        const response = await request(app)
          .post('/api/auth/provider/login')
          .send({ email: providerEmail, password: providerPassword })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Account is inactive');
      });
    });
  });

  describe('Token Management', () => {
    describe('POST /api/auth/logout', () => {
      it('should blacklist token on logout', async () => {
        // Create a test token
        const jwt = require('jsonwebtoken');
        const testToken = jwt.sign(
          { id: 'user-123', type: 'customer' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Logged out successfully');

        // Verify token is blacklisted
        const isBlacklisted = await tokenBlacklist.isTokenBlacklisted(testToken);
        expect(isBlacklisted).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('No token provided');
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('should rotate refresh token', async () => {
        // Create initial tokens
        const payload = { id: 'user-123', type: 'customer' as const, phone: testPhone };
        const { refreshToken: oldRefreshToken } = await refreshTokenManager.generateRefreshToken(
          payload,
          undefined,
          process.env.JWT_SECRET
        );

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: oldRefreshToken })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('refreshToken');
        
        // New refresh token should be different
        expect(response.body.data.refreshToken).not.toBe(oldRefreshToken);
      });

      it('should reject invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid');
      });
    });
  });
});