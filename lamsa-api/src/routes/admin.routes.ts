/**
 * @file admin.routes.ts
 * @description Admin routes for system management
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { apiRateLimiter } from '../middleware/rate-limit.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

// All admin routes require authentication
router.use(authenticate);
router.use(apiRateLimiter);

/**
 * @route GET /api/admin/lockout/:identifier/:type
 * @desc Get lockout status for a specific identifier
 * @access Admin only
 */
router.get(
  '/lockout/:identifier/:type',
  [
    param('identifier').notEmpty().withMessage('Identifier is required'),
    param('type').isIn(['customer', 'provider', 'otp', 'mfa']).withMessage('Invalid lockout type'),
  ],
  validate,
  adminController.getLockoutStatus
);

/**
 * @route POST /api/admin/unlock/:identifier
 * @desc Unlock an account manually
 * @access Admin only
 */
router.post(
  '/unlock/:identifier',
  [
    param('identifier').notEmpty().withMessage('Identifier is required'),
  ],
  validate,
  adminController.unlockAccount
);

/**
 * @route GET /api/admin/security-events/:identifier
 * @desc Get security events for an identifier
 * @access Admin only
 */
router.get(
  '/security-events/:identifier',
  [
    param('identifier').notEmpty().withMessage('Identifier is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  ],
  validate,
  adminController.getSecurityEvents
);

/**
 * @route GET /api/admin/locked-accounts
 * @desc Get all currently locked accounts
 * @access Admin only
 */
router.get('/locked-accounts', adminController.getLockedAccounts);

/**
 * @route PUT /api/admin/lockout-config
 * @desc Update lockout configuration
 * @access Admin only
 */
router.put(
  '/lockout-config',
  [
    body('type').isIn(['customer', 'provider', 'otp', 'mfa']).withMessage('Invalid lockout type'),
    body('maxAttempts').optional().isInt({ min: 1, max: 20 }).withMessage('Max attempts must be between 1 and 20'),
    body('lockoutDuration').optional().isInt({ min: 1, max: 1440 }).withMessage('Lockout duration must be between 1 and 1440 minutes'),
    body('resetWindow').optional().isInt({ min: 1, max: 1440 }).withMessage('Reset window must be between 1 and 1440 minutes'),
  ],
  validate,
  adminController.updateLockoutConfig
);

/**
 * @route GET /api/admin/security-stats
 * @desc Get security dashboard statistics
 * @access Admin only
 */
router.get('/security-stats', adminController.getSecurityStats);

export default router;