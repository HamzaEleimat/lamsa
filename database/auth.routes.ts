import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'
import {
  customerSendOTP,
  customerVerifyOTP,
  providerSignup,
  providerLogin,
  logout,
  refreshToken
} from './auth.controller'

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg
      }))
    })
  }
  next()
}

// Initialize router
const router = Router()

// Customer routes
// POST /api/auth/customer/send-otp
router.post(
  '/customer/send-otp',
  [
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string')
      .trim()
      .matches(/^(\+?962|0)?7[789]\d{7}$/).withMessage('Invalid Jordan phone number format. Use 07XXXXXXXX')
  ],
  handleValidationErrors,
  customerSendOTP
)

// POST /api/auth/customer/verify-otp
router.post(
  '/customer/verify-otp',
  [
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string')
      .trim()
      .matches(/^(\+?962|0)?7[789]\d{7}$/).withMessage('Invalid Jordan phone number format'),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isString().withMessage('OTP must be a string')
      .trim()
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
      .matches(/^\d{6}$/).withMessage('OTP must contain only numbers')
  ],
  handleValidationErrors,
  customerVerifyOTP
)

// Provider routes
// POST /api/auth/provider/signup
router.post(
  '/provider/signup',
  [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('business_name_ar')
      .notEmpty().withMessage('Arabic business name is required')
      .isString().withMessage('Arabic business name must be a string')
      .trim()
      .isLength({ min: 2, max: 200 }).withMessage('Arabic business name must be between 2 and 200 characters'),
    body('business_name_en')
      .notEmpty().withMessage('English business name is required')
      .isString().withMessage('English business name must be a string')
      .trim()
      .isLength({ min: 2, max: 200 }).withMessage('English business name must be between 2 and 200 characters'),
    body('owner_name')
      .notEmpty().withMessage('Owner name is required')
      .isString().withMessage('Owner name must be a string')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Owner name must be between 2 and 100 characters'),
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isString().withMessage('Phone number must be a string')
      .trim()
      .matches(/^(\+?962|0)?7[789]\d{7}$/).withMessage('Invalid Jordan phone number format'),
    body('location')
      .optional()
      .isObject().withMessage('Location must be an object')
      .custom((value) => {
        if (value && (!value.lat || !value.lng)) {
          throw new Error('Location must have lat and lng properties')
        }
        if (value && (typeof value.lat !== 'number' || typeof value.lng !== 'number')) {
          throw new Error('Location lat and lng must be numbers')
        }
        if (value && (value.lat < -90 || value.lat > 90)) {
          throw new Error('Latitude must be between -90 and 90')
        }
        if (value && (value.lng < -180 || value.lng > 180)) {
          throw new Error('Longitude must be between -180 and 180')
        }
        return true
      }),
    body('address')
      .optional()
      .isString().withMessage('Address must be a string')
      .trim()
      .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
    body('city')
      .optional()
      .isString().withMessage('City must be a string')
      .trim()
      .isLength({ max: 100 }).withMessage('City must not exceed 100 characters')
  ],
  handleValidationErrors,
  providerSignup
)

// POST /api/auth/provider/login
router.post(
  '/provider/login',
  [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isString().withMessage('Password must be a string')
  ],
  handleValidationErrors,
  providerLogin
)

// Common routes for both customers and providers
// POST /api/auth/logout
router.post('/logout', logout)

// POST /api/auth/refresh-token
router.post('/refresh-token', refreshToken)

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  })
})

export default router