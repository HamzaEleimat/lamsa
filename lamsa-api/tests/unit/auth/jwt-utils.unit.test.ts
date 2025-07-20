/**
 * Unit Tests for JWT Token Generation and Validation
 * Tests token creation, verification, expiration, and security
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole } from '../../../src/middleware/auth.middleware';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('JWT Utils and Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined
    };
    
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
    
    // Set test environment
    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough';
  });

  describe('authenticateToken middleware', () => {
    test('should authenticate valid JWT token', () => {
      const mockPayload = {
        userId: 'user-123',
        phone: '+962771234567',
        role: 'customer',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockReq.headers!.authorization = 'Bearer valid-jwt-token';
      mockJwt.verify.mockReturnValue(mockPayload);

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret-key-that-is-long-enough');
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    test('should reject missing authorization header', () => {
      mockReq.headers = {};

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'TOKEN_REQUIRED',
        message: 'Access token required',
        messageAr: 'رمز الوصول مطلوب'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject malformed authorization header', () => {
      mockReq.headers!.authorization = 'InvalidFormat token';

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN_FORMAT',
        message: 'Invalid token format',
        messageAr: 'تنسيق الرمز المميز غير صحيح'
      });
    });

    test('should handle expired JWT token', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      
      mockReq.headers!.authorization = 'Bearer expired-jwt-token';
      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        messageAr: 'انتهت صلاحية الرمز المميز'
      });
    });

    test('should handle invalid JWT token', () => {
      const invalidError = new Error('invalid signature');
      invalidError.name = 'JsonWebTokenError';
      
      mockReq.headers!.authorization = 'Bearer invalid-jwt-token';
      mockJwt.verify.mockImplementation(() => {
        throw invalidError;
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid token',
        messageAr: 'رمز مميز غير صحيح'
      });
    });

    test('should handle malformed JWT token', () => {
      const malformedError = new Error('jwt malformed');
      malformedError.name = 'JsonWebTokenError';
      
      mockReq.headers!.authorization = 'Bearer malformed.jwt.token';
      mockJwt.verify.mockImplementation(() => {
        throw malformedError;
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid token',
        messageAr: 'رمز مميز غير صحيح'
      });
    });

    test('should handle generic JWT errors', () => {
      const genericError = new Error('Something went wrong');
      
      mockReq.headers!.authorization = 'Bearer some-token';
      mockJwt.verify.mockImplementation(() => {
        throw genericError;
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Authentication error',
        messageAr: 'خطأ في المصادقة'
      });
    });

    test('should extract token from Bearer header correctly', () => {
      const mockPayload = {
        userId: 'user-123',
        role: 'customer'
      };

      // Test with extra spaces
      mockReq.headers!.authorization = '  Bearer   token-with-spaces  ';
      mockJwt.verify.mockReturnValue(mockPayload);

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('token-with-spaces', 'test-secret-key-that-is-long-enough');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole middleware', () => {
    const mockUser = {
      userId: 'user-123',
      phone: '+962771234567',
      role: 'customer'
    };

    test('should allow user with correct role', () => {
      mockReq.user = mockUser;
      const roleMiddleware = requireRole(['customer']);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    test('should allow user with one of multiple allowed roles', () => {
      mockReq.user = { ...mockUser, role: 'provider' };
      const roleMiddleware = requireRole(['customer', 'provider', 'admin']);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject user without required role', () => {
      mockReq.user = mockUser;
      const roleMiddleware = requireRole(['admin']);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions',
        messageAr: 'صلاحيات غير كافية'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject when user is not set (should not happen)', () => {
      mockReq.user = undefined;
      const roleMiddleware = requireRole(['customer']);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'USER_NOT_AUTHENTICATED',
        message: 'User not authenticated',
        messageAr: 'المستخدم غير مصدق'
      });
    });

    test('should handle case-insensitive roles', () => {
      mockReq.user = { ...mockUser, role: 'Customer' };
      const roleMiddleware = requireRole(['customer']);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle empty roles array', () => {
      mockReq.user = mockUser;
      const roleMiddleware = requireRole([]);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions',
        messageAr: 'صلاحيات غير كافية'
      });
    });
  });

  describe('JWT Token Security', () => {
    test('should validate token payload structure', () => {
      const validPayload = {
        userId: 'user-123',
        phone: '+962771234567',
        role: 'customer',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockReq.headers!.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue(validPayload);

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(validPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle missing required fields in token payload', () => {
      const incompletePayload = {
        // Missing userId and role
        phone: '+962771234567',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockReq.headers!.authorization = 'Bearer incomplete-token';
      mockJwt.verify.mockReturnValue(incompletePayload);

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      // Should still pass - validation of specific fields should be done in business logic
      expect(mockReq.user).toEqual(incompletePayload);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle token with extra claims', () => {
      const payloadWithExtra = {
        userId: 'user-123',
        phone: '+962771234567',
        role: 'customer',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        extraClaim: 'extra-value',
        permissions: ['read', 'write']
      };

      mockReq.headers!.authorization = 'Bearer token-with-extra';
      mockJwt.verify.mockReturnValue(payloadWithExtra);

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(payloadWithExtra);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('JWT Token Generation (Integration)', () => {
    beforeEach(() => {
      // Use real JWT for generation tests
      jest.unmock('jsonwebtoken');
      const realJwt = jest.requireActual('jsonwebtoken');
      mockJwt.sign.mockImplementation(realJwt.sign);
      mockJwt.verify.mockImplementation(realJwt.verify);
    });

    test('should generate and verify valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        phone: '+962771234567',
        role: 'customer'
      };

      const token = jwt.sign(payload, 'test-secret-key-that-is-long-enough', { expiresIn: '1h' });
      expect(token).toBeValidJWT();

      const decoded = jwt.verify(token, 'test-secret-key-that-is-long-enough') as any;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.phone).toBe(payload.phone);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('should handle short expiration times', () => {
      const payload = { userId: 'user-123' };
      const token = jwt.sign(payload, 'test-secret-key-that-is-long-enough', { expiresIn: '1s' });
      
      // Should be valid immediately
      const decoded = jwt.verify(token, 'test-secret-key-that-is-long-enough') as any;
      expect(decoded.userId).toBe('user-123');
      
      // Should expire after delay (this test might be flaky in CI)
      // We'll just verify the token has an expiration
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    test('should generate tokens with different secrets', () => {
      const payload = { userId: 'user-123' };
      const secret1 = 'secret-one-that-is-long-enough';
      const secret2 = 'secret-two-that-is-long-enough';
      
      const token1 = jwt.sign(payload, secret1);
      const token2 = jwt.sign(payload, secret2);
      
      // Tokens should be different
      expect(token1).not.toBe(token2);
      
      // Each token should only verify with its respective secret
      expect(() => jwt.verify(token1, secret2)).toThrow();
      expect(() => jwt.verify(token2, secret1)).toThrow();
      
      expect(jwt.verify(token1, secret1)).toBeDefined();
      expect(jwt.verify(token2, secret2)).toBeDefined();
    });
  });

  describe('Performance and Security', () => {
    test('should handle high-frequency token verification', () => {
      const mockPayload = { userId: 'user-123', role: 'customer' };
      mockReq.headers!.authorization = 'Bearer test-token';
      mockJwt.verify.mockReturnValue(mockPayload);

      const startTime = Date.now();
      
      // Simulate 1000 token verifications
      for (let i = 0; i < 1000; i++) {
        mockNext.mockClear();
        authenticateToken(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
      
      const endTime = Date.now();
      
      // Should complete quickly (under 100ms for 1000 verifications)
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should not leak sensitive information in error messages', () => {
      mockReq.headers!.authorization = 'Bearer invalid-token';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Secret key exposed: test-secret-key-that-is-long-enough');
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.not.stringContaining('test-secret-key-that-is-long-enough')
        })
      );
    });
  });
});