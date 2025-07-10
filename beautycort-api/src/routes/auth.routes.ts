import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Customer signup with phone
router.post(
  '/customer/signup',
  validate([
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string'),
    body('name')
      .notEmpty().withMessage('Name is required')
      .trim()
      .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
    body('email')
      .optional()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('language')
      .optional()
      .isIn(['ar', 'en']).withMessage('Language must be either ar or en'),
  ]),
  (req, res, next) => authController.customerSignup(req, res, next)
);

// Provider signup with email/password
router.post(
  '/provider/signup',
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone')
      .notEmpty().withMessage('Phone number is required'),
    body('business_name_ar')
      .notEmpty().withMessage('Arabic business name is required')
      .trim(),
    body('business_name_en')
      .notEmpty().withMessage('English business name is required')
      .trim(),
    body('owner_name')
      .notEmpty().withMessage('Owner name is required')
      .trim(),
    body('latitude')
      .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude')
      .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('address')
      .isObject().withMessage('Address must be an object'),
    body('address.street')
      .notEmpty().withMessage('Street is required'),
    body('address.city')
      .notEmpty().withMessage('City is required'),
    body('address.district')
      .notEmpty().withMessage('District is required'),
    body('address.country')
      .notEmpty().withMessage('Country is required'),
    body('license_number')
      .optional()
      .isString(),
  ]),
  (req, res, next) => authController.providerSignup(req, res, next)
);

// Customer login with phone
router.post(
  '/customer/login',
  validate([
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string'),
  ]),
  (req, res, next) => authController.customerLogin(req, res, next)
);

// Provider login with email/password
router.post(
  '/provider/login',
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
  ]),
  (req, res, next) => authController.providerLogin(req, res, next)
);

// Verify OTP for customer (for production use)
router.post(
  '/customer/verify-otp',
  validate([
    body('phone')
      .notEmpty().withMessage('Phone number is required'),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
      .isNumeric().withMessage('OTP must contain only numbers'),
  ]),
  (req, res, next) => authController.verifyOTP(req, res, next)
);

// Refresh token (for both customer and provider)
router.post(
  '/refresh',
  validate([
    body('refreshToken')
      .notEmpty().withMessage('Refresh token is required'),
  ]),
  (req, res, next) => authController.refreshToken(req, res, next)
);

// Logout (for both customer and provider)
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Forgot password (providers only)
router.post(
  '/provider/forgot-password',
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
  ]),
  (req, res, next) => authController.forgotPassword(req, res, next)
);

// Reset password (providers only)
router.post(
  '/provider/reset-password',
  validate([
    body('token')
      .notEmpty().withMessage('Reset token is required')
      .isLength({ min: 32 }).withMessage('Invalid reset token'),
    body('newPassword')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ]),
  (req, res, next) => authController.resetPassword(req, res, next)
);

export default router;