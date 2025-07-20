/**
 * Unit Tests for Authentication Controller
 * Tests OTP flow, JWT generation, and edge cases
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { 
  sendCustomerOTP, 
  verifyCustomerOTP, 
  sendProviderOTP,
  verifyProviderOTP,
  refreshToken,
  getCurrentUser,
  signOut
} from '../../../src/controllers/auth.controller';
import * as supabaseSimple from '../../../src/config/supabase-simple';
import * as mockOtp from '../../../src/config/mock-otp';
import { validateJordanPhone } from '../../../src/utils/phone-validation';

// Mock dependencies
jest.mock('../../../src/config/supabase-simple');
jest.mock('../../../src/config/mock-otp');
jest.mock('../../../src/utils/phone-validation');
jest.mock('jsonwebtoken');

const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;
const mockOtpService = mockOtp as jest.Mocked<typeof mockOtp>;
const mockPhoneValidation = validateJordanPhone as jest.MockedFunction<typeof validateJordanPhone>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Controller', () => {
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

    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('sendCustomerOTP', () => {
    beforeEach(() => {
      mockReq.body = { phone: '+962771234567' };
      mockPhoneValidation.mockReturnValue(true);
    });

    test('should send OTP for valid Jordan phone number', async () => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: true,
        mockOtp: '123456',
        message: 'OTP sent successfully'
      });

      await sendCustomerOTP(mockReq as Request, mockRes as Response);

      expect(mockPhoneValidation).toHaveBeenCalledWith('+962771234567');
      expect(mockSupabase.sendOTP).toHaveBeenCalledWith('+962771234567', 'customer');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        mockOtp: expect.any(String),
        retryAfter: expect.any(Number)
      });
    });

    test('should reject invalid phone number', async () => {
      mockReq.body.phone = '+1234567890';
      mockPhoneValidation.mockReturnValue(false);

      await sendCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_PHONE_FORMAT',
        message: expect.stringContaining('Invalid phone number format'),
        messageAr: expect.stringContaining('رقم الهاتف غير صحيح')
      });
    });

    test('should handle missing phone number', async () => {
      mockReq.body = {};

      await sendCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'PHONE_REQUIRED',
        message: 'Phone number is required',
        messageAr: 'رقم الهاتف مطلوب'
      });
    });

    test('should handle SMS service failure', async () => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: false,
        error: 'SMS_SERVICE_ERROR',
        message: 'Failed to send SMS'
      });

      await sendCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'SMS_SERVICE_ERROR',
        message: 'Failed to send SMS',
        messageAr: expect.any(String)
      });
    });

    test('should handle rate limiting', async () => {
      mockSupabase.sendOTP.mockResolvedValue({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests',
        retryAfter: 300
      });

      await sendCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests',
        messageAr: expect.any(String),
        retryAfter: 300
      });
    });
  });

  describe('verifyCustomerOTP', () => {
    beforeEach(() => {
      mockReq.body = {
        phone: '+962771234567',
        otp: '123456'
      };
      mockPhoneValidation.mockReturnValue(true);
    });

    test('should verify correct OTP and return JWT token', async () => {
      const mockUser = {
        id: 'user-123',
        phone: '+962771234567',
        role: 'customer',
        name: 'Test User'
      };

      mockSupabase.verifyOTP.mockResolvedValue({
        success: true,
        user: mockUser
      });

      mockJwt.sign.mockReturnValue('mock-jwt-token');

      await verifyCustomerOTP(mockReq as Request, mockRes as Response);

      expect(mockSupabase.verifyOTP).toHaveBeenCalledWith('+962771234567', '123456', 'customer');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { 
          userId: 'user-123', 
          phone: '+962771234567', 
          role: 'customer' 
        },
        'test-secret',
        { expiresIn: '24h' }
      );
      
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        user: mockUser,
        token: 'mock-jwt-token'
      });
    });

    test('should reject invalid OTP', async () => {
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'INVALID_OTP',
        message: 'Invalid or expired OTP',
        attemptsRemaining: 2
      });

      await verifyCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_OTP',
        message: 'Invalid or expired OTP',
        messageAr: expect.any(String),
        attemptsRemaining: 2
      });
    });

    test('should handle expired OTP', async () => {
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'OTP_EXPIRED',
        message: 'OTP has expired'
      });

      await verifyCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'OTP_EXPIRED',
        message: 'OTP has expired',
        messageAr: expect.any(String)
      });
    });

    test('should handle too many failed attempts', async () => {
      mockSupabase.verifyOTP.mockResolvedValue({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed attempts',
        lockoutDuration: 900
      });

      await verifyCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed attempts',
        messageAr: expect.any(String),
        lockoutDuration: 900
      });
    });

    test('should validate required fields', async () => {
      mockReq.body = { phone: '+962771234567' }; // Missing OTP

      await verifyCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Phone number and OTP are required',
        messageAr: expect.any(String)
      });
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      mockReq.headers = {
        authorization: 'Bearer valid-refresh-token'
      };
    });

    test('should refresh valid token', async () => {
      const mockPayload = {
        userId: 'user-123',
        phone: '+962771234567',
        role: 'customer'
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockJwt.sign.mockReturnValue('new-jwt-token');

      await refreshToken(mockReq as Request, mockRes as Response);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-refresh-token', 'test-secret');
      expect(mockJwt.sign).toHaveBeenCalledWith(mockPayload, 'test-secret', { expiresIn: '24h' });
      
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        token: 'new-jwt-token'
      });
    });

    test('should reject invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await refreshToken(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid refresh token'
      });
    });

    test('should handle missing authorization header', async () => {
      mockReq.headers = {};

      await refreshToken(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'TOKEN_REQUIRED',
        message: 'Authorization header required'
      });
    });
  });

  describe('getCurrentUser', () => {
    test('should return current user info', async () => {
      const mockUser = {
        id: 'user-123',
        phone: '+962771234567',
        role: 'customer',
        name: 'Test User'
      };

      mockReq.user = mockUser;

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        user: mockUser
      });
    });

    test('should handle missing user (should not happen with auth middleware)', async () => {
      mockReq.user = undefined;

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    });
  });

  describe('signOut', () => {
    test('should sign out user successfully', async () => {
      await signOut(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Signed out successfully'
      });
    });
  });

  describe('Provider Authentication', () => {
    describe('sendProviderOTP', () => {
      beforeEach(() => {
        mockReq.body = { phone: '+962771234567' };
        mockPhoneValidation.mockReturnValue(true);
      });

      test('should send OTP for provider signup', async () => {
        mockSupabase.sendOTP.mockResolvedValue({
          success: true,
          message: 'OTP sent successfully'
        });

        await sendProviderOTP(mockReq as Request, mockRes as Response);

        expect(mockSupabase.sendOTP).toHaveBeenCalledWith('+962771234567', 'provider');
        expect(statusSpy).toHaveBeenCalledWith(200);
      });
    });

    describe('verifyProviderOTP', () => {
      beforeEach(() => {
        mockReq.body = {
          phone: '+962771234567',
          otp: '123456'
        };
        mockPhoneValidation.mockReturnValue(true);
      });

      test('should verify provider OTP and return token', async () => {
        const mockProvider = {
          id: 'provider-123',
          phone: '+962771234567',
          role: 'provider',
          businessName: 'Test Salon'
        };

        mockSupabase.verifyOTP.mockResolvedValue({
          success: true,
          user: mockProvider
        });

        mockJwt.sign.mockReturnValue('provider-jwt-token');

        await verifyProviderOTP(mockReq as Request, mockRes as Response);

        expect(mockJwt.sign).toHaveBeenCalledWith(
          { 
            userId: 'provider-123', 
            phone: '+962771234567', 
            role: 'provider' 
          },
          'test-secret',
          { expiresIn: '24h' }
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle unexpected errors gracefully', async () => {
      mockReq.body = { phone: '+962771234567' };
      mockPhoneValidation.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await sendCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        messageAr: expect.any(String)
      });
    });

    test('should handle database connection errors', async () => {
      mockReq.body = { phone: '+962771234567', otp: '123456' };
      mockPhoneValidation.mockReturnValue(true);
      
      mockSupabase.verifyOTP.mockRejectedValue(new Error('Database connection failed'));

      await verifyCustomerOTP(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Database connection failed',
        messageAr: expect.any(String)
      });
    });
  });

  describe('Mock OTP in Development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should use mock OTP service in development', async () => {
      mockReq.body = { phone: '+962771234567' };
      mockPhoneValidation.mockReturnValue(true);
      mockOtpService.sendMockOTP.mockReturnValue('123456');

      await sendCustomerOTP(mockReq as Request, mockRes as Response);

      expect(mockOtpService.sendMockOTP).toHaveBeenCalledWith('+962771234567');
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mockOtp: '123456'
        })
      );
    });
  });
});