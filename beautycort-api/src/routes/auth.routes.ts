import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { otpRateLimiter, authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// ========================================
// CUSTOMER AUTH ENDPOINTS
// ========================================

// Send OTP to customer phone
router.post(
  '/customer/send-otp',
  otpRateLimiter, // Rate limit OTP requests to prevent SMS bombing
  validate([
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string')
      .matches(/^(\+962|962|07|7)[0-9]{8,9}$/).withMessage('Invalid Jordan phone number format')
  ]),
  (req, res, next) => authController.customerSendOTP(req, res, next)
);

// Verify OTP and create/login customer account
router.post(
  '/customer/verify-otp',
  validate([
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string')
      .matches(/^(\+962|962|07|7)[0-9]{8,9}$/).withMessage('Invalid Jordan phone number format'),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isString().withMessage('OTP must be a string')
      .matches(/^[0-9]{6}$/).withMessage('OTP must be exactly 6 digits'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  ]),
  (req, res, next) => authController.verifyOTP(req, res, next)
);

// ========================================
// PROVIDER AUTH ENDPOINTS
// ========================================

// Send OTP to provider phone (for phone verification during signup)
router.post(
  '/provider/send-otp',
  otpRateLimiter, // Rate limit OTP requests
  validate([
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string')
      .matches(/^(\+962|962|07|7)[0-9]{8,9}$/).withMessage('Invalid Jordan phone number format')
  ]),
  (req, res, next) => authController.providerSendOTP(req, res, next)
);

// Verify provider phone number
router.post(
  '/provider/verify-otp',
  validate([
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string')
      .matches(/^(\+962|962|07|7)[0-9]{8,9}$/).withMessage('Invalid Jordan phone number format'),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isString().withMessage('OTP must be a string')
      .matches(/^[0-9]{6}$/).withMessage('OTP must be exactly 6 digits'),
  ]),
  (req, res, next) => authController.providerVerifyOTP(req, res, next)
);

// Provider signup with email/password
router.post(
  '/provider/signup',
  authRateLimiter, // Rate limit auth attempts
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail()
      .isLength({ max: 255 }).withMessage('Email is too long'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number'),
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .matches(/^(\+962|962|07|7)[0-9]{8,9}$/).withMessage('Invalid Jordan phone number format'),
    body('phoneVerified')
      .optional()
      .isBoolean().withMessage('Phone verified must be a boolean'),
    body('business_name_ar')
      .notEmpty().withMessage('Arabic business name is required')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Arabic business name must be between 2 and 100 characters'),
    body('business_name_en')
      .notEmpty().withMessage('English business name is required')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('English business name must be between 2 and 100 characters'),
    body('owner_name')
      .notEmpty().withMessage('Owner name is required')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Owner name must be between 2 and 100 characters'),
    body('latitude')
      .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude')
      .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('address')
      .isObject().withMessage('Address must be an object'),
    body('address.street')
      .notEmpty().withMessage('Street is required')
      .isLength({ max: 255 }).withMessage('Street address is too long'),
    body('address.city')
      .notEmpty().withMessage('City is required')
      .isLength({ max: 100 }).withMessage('City name is too long'),
    body('address.district')
      .notEmpty().withMessage('District is required')
      .isLength({ max: 100 }).withMessage('District name is too long'),
    body('address.country')
      .notEmpty().withMessage('Country is required')
      .equals('Jordan').withMessage('Country must be Jordan'),
    body('license_number')
      .optional()
      .trim()
      .isLength({ min: 5, max: 50 }).withMessage('License number must be between 5 and 50 characters'),
  ]),
  (req, res, next) => authController.providerSignup(req, res, next)
);

// Provider login with email/password
router.post(
  '/provider/login',
  authRateLimiter, // Rate limit auth attempts
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
  ]),
  (req, res, next) => authController.providerLogin(req, res, next)
);

// Provider forgot password
router.post(
  '/provider/forgot-password',
  authRateLimiter, // Rate limit to prevent abuse
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
  ]),
  (req, res, next) => authController.forgotPassword(req, res, next)
);

// Provider reset password
router.post(
  '/provider/reset-password',
  validate([
    body('token')
      .notEmpty().withMessage('Reset token is required')
      .isLength({ min: 32 }).withMessage('Invalid reset token'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number'),
  ]),
  (req, res, next) => authController.resetPassword(req, res, next)
);

// ========================================
// SHARED ENDPOINTS (AUTHENTICATED)
// ========================================

// Get current user profile
router.get(
  '/me',
  authenticate,
  (req, res, next) => authController.getCurrentUser(req, res, next)
);

// Sign out (invalidate token)
router.post(
  '/signout',
  authenticate,
  (req, res, next) => authController.signout(req, res, next)
);

// Refresh JWT token
router.post(
  '/refresh',
  validate([
    body('refreshToken')
      .notEmpty().withMessage('Refresh token is required')
      .isJWT().withMessage('Invalid refresh token format'),
  ]),
  (req, res, next) => authController.refreshToken(req, res, next)
);

export default router;
