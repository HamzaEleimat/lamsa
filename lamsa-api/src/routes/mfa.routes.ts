/**
 * @file mfa.routes.ts
 * @description Multi-Factor Authentication routes
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { Router } from 'express';
import { MFAController, mfaValidation } from '../controllers/mfa.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

// All MFA routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/mfa/setup
 * @desc    Setup MFA for provider account
 * @access  Provider only
 */
router.post(
  '/setup',
  authorize(UserRole.PROVIDER),
  MFAController.setupMFA
);

/**
 * @route   POST /api/mfa/verify-setup
 * @desc    Verify MFA setup and enable it
 * @access  Provider only
 */
router.post(
  '/verify-setup',
  authorize(UserRole.PROVIDER),
  mfaValidation.verifyToken,
  MFAController.verifySetup
);

/**
 * @route   POST /api/mfa/verify
 * @desc    Verify MFA token during login
 * @access  Public (but requires valid provider ID and token)
 */
router.post(
  '/verify',
  mfaValidation.verifyLogin,
  MFAController.verifyToken
);

/**
 * @route   POST /api/mfa/disable
 * @desc    Disable MFA (requires password)
 * @access  Provider only
 */
router.post(
  '/disable',
  authorize(UserRole.PROVIDER),
  mfaValidation.disableMFA,
  MFAController.disableMFA
);

/**
 * @route   POST /api/mfa/backup-codes
 * @desc    Regenerate backup codes
 * @access  Provider only
 */
router.post(
  '/backup-codes',
  authorize(UserRole.PROVIDER),
  MFAController.regenerateBackupCodes
);

/**
 * @route   GET /api/mfa/status
 * @desc    Get MFA status for current provider
 * @access  Provider only
 */
router.get(
  '/status',
  authorize(UserRole.PROVIDER),
  MFAController.getMFAStatus
);

export default router;