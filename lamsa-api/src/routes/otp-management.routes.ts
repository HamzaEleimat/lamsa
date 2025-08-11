import { Router } from 'express';
import { body, query } from 'express-validator';
import { otpManagementController } from '../controllers/otp-management.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';
import { apiRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// ====================================
// ADMIN ROUTES - OTP Management
// ====================================

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));
router.use(apiRateLimiter);

// Get OTP statistics
router.get(
  '/statistics',
  validate([
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date'),
    query('purpose').optional().isIn(['signup', 'login', 'reset_password']).withMessage('Invalid purpose'),
  ]),
  otpManagementController.getOTPStatistics
);

// Get pending OTPs
router.get(
  '/pending',
  validate([
    query('phone').optional().isString().withMessage('Phone must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  ]),
  otpManagementController.getPendingOTPs
);

// Cleanup expired OTPs
router.post(
  '/cleanup',
  validate([
    body('force').optional().isBoolean().withMessage('Force must be boolean'),
    body('older_than_hours').optional().isInt({ min: 1, max: 720 }).withMessage('Hours must be 1-720'),
  ]),
  otpManagementController.cleanupExpiredOTPs
);

// Invalidate OTPs for a phone number
router.post(
  '/invalidate',
  validate([
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ]),
  otpManagementController.invalidatePhoneOTPs
);

// Get OTP verification attempts
router.get(
  '/attempts',
  validate([
    query('phone').optional().isString().withMessage('Phone must be a string'),
    query('status').optional().isIn(['success', 'failed', 'expired']).withMessage('Invalid status'),
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  ]),
  otpManagementController.getVerificationAttempts
);

// Get suspicious activity
router.get(
  '/suspicious',
  validate([
    query('threshold').optional().isInt({ min: 3, max: 20 }).withMessage('Threshold must be 3-20'),
    query('window_hours').optional().isInt({ min: 1, max: 24 }).withMessage('Window must be 1-24 hours'),
  ]),
  otpManagementController.getSuspiciousActivity
);

// Block/unblock phone number
router.post(
  '/block',
  validate([
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('blocked').isBoolean().withMessage('Blocked status is required'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    body('duration_hours').optional().isInt({ min: 1, max: 720 }).withMessage('Duration must be 1-720 hours'),
  ]),
  otpManagementController.togglePhoneBlock
);

// ====================================
// AUTOMATED CLEANUP ENDPOINT
// ====================================

// This endpoint can be called by a cron job
router.post(
  '/cron/cleanup',
  validate([
    body('api_key').notEmpty().withMessage('API key is required'),
  ]),
  otpManagementController.cronCleanup
);

export default router;