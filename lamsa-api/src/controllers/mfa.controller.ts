/**
 * @file mfa.controller.ts
 * @description Multi-Factor Authentication controller
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { mfaService } from '../services/mfa.service';
import { AuthRequest } from '../types';

export class MFAController {
  /**
   * Setup MFA for provider
   * @route POST /api/mfa/setup
   */
  static async setupMFA(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Check if user is a provider
      if (!req.user || req.user.role !== 'provider') {
        return res.status(403).json({
          success: false,
          error: 'MFA is only available for providers',
          error_ar: 'المصادقة الثنائية متاحة فقط لمقدمي الخدمة',
        });
      }

      const providerId = req.user.id;
      const email = req.user.email;

      // Check if MFA is already enabled
      const isEnabled = await mfaService.isMFAEnabled(providerId);
      if (isEnabled) {
        return res.status(400).json({
          success: false,
          error: 'MFA is already enabled',
          error_ar: 'المصادقة الثنائية مفعلة بالفعل',
        });
      }

      // Generate MFA secret and QR code
      const setupData = await mfaService.generateSecret(providerId, email);

      return res.json({
        success: true,
        data: {
          secret: setupData.secret,
          qrCode: setupData.qrCode,
          backupCodes: setupData.backupCodes,
          instructions: {
            en: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code to verify.',
            ar: 'امسح رمز QR باستخدام تطبيق المصادقة (Google Authenticator، Authy، إلخ) وأدخل الرمز المكون من 6 أرقام للتحقق.',
          },
        },
      });
    } catch (error) {
      console.error('MFA setup error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to setup MFA',
        error_ar: 'فشل في إعداد المصادقة الثنائية',
      });
    }
  }

  /**
   * Verify MFA setup
   * @route POST /api/mfa/verify-setup
   */
  static async verifySetup(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      if (!req.user || req.user.role !== 'provider') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
          error_ar: 'غير مصرح',
        });
      }

      const { token } = req.body;
      const providerId = req.user.id;

      // Verify the token and enable MFA
      const result = await mfaService.verifyToken(providerId, token, true);

      if (result.verified) {
        return res.json({
          success: true,
          message: 'MFA has been successfully enabled',
          message_ar: 'تم تفعيل المصادقة الثنائية بنجاح',
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || 'Invalid verification code',
          error_ar: 'رمز التحقق غير صالح',
        });
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify MFA',
        error_ar: 'فشل في التحقق من المصادقة الثنائية',
      });
    }
  }

  /**
   * Verify MFA token for login
   * @route POST /api/mfa/verify
   */
  static async verifyToken(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { providerId, token } = req.body;

      // Verify the token
      const result = await mfaService.verifyToken(providerId, token);

      if (result.verified) {
        return res.json({
          success: true,
          message: 'MFA verification successful',
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || 'Invalid code',
          error_ar: 'الرمز غير صالح',
        });
      }
    } catch (error) {
      console.error('MFA token verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify MFA token',
        error_ar: 'فشل في التحقق من رمز المصادقة الثنائية',
      });
    }
  }

  /**
   * Disable MFA
   * @route POST /api/mfa/disable
   */
  static async disableMFA(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      if (!req.user || req.user.role !== 'provider') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
          error_ar: 'غير مصرح',
        });
      }

      const { password } = req.body;
      const providerId = req.user.id;

      // TODO: Verify password before disabling MFA
      // For now, we'll just disable it

      await mfaService.disableMFA(providerId);

      return res.json({
        success: true,
        message: 'MFA has been disabled',
        message_ar: 'تم تعطيل المصادقة الثنائية',
      });
    } catch (error) {
      console.error('MFA disable error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to disable MFA',
        error_ar: 'فشل في تعطيل المصادقة الثنائية',
      });
    }
  }

  /**
   * Regenerate backup codes
   * @route POST /api/mfa/backup-codes
   */
  static async regenerateBackupCodes(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || req.user.role !== 'provider') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
          error_ar: 'غير مصرح',
        });
      }

      const providerId = req.user.id;

      // Check if MFA is enabled
      const isEnabled = await mfaService.isMFAEnabled(providerId);
      if (!isEnabled) {
        return res.status(400).json({
          success: false,
          error: 'MFA is not enabled',
          error_ar: 'المصادقة الثنائية غير مفعلة',
        });
      }

      const backupCodes = await mfaService.regenerateBackupCodes(providerId);

      return res.json({
        success: true,
        data: {
          backupCodes,
          warning: {
            en: 'Save these codes in a safe place. Each code can only be used once.',
            ar: 'احفظ هذه الرموز في مكان آمن. يمكن استخدام كل رمز مرة واحدة فقط.',
          },
        },
      });
    } catch (error) {
      console.error('Backup codes regeneration error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to regenerate backup codes',
        error_ar: 'فشل في إعادة توليد رموز الاحتياط',
      });
    }
  }

  /**
   * Get MFA status
   * @route GET /api/mfa/status
   */
  static async getMFAStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || req.user.role !== 'provider') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
          error_ar: 'غير مصرح',
        });
      }

      const providerId = req.user.id;
      const status = await mfaService.getMFAStatus(providerId);

      return res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('MFA status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get MFA status',
        error_ar: 'فشل في الحصول على حالة المصادقة الثنائية',
      });
    }
  }
}

// Validation rules
export const mfaValidation = {
  verifyToken: [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Verification code is required')
      .isLength({ min: 6, max: 8 })
      .withMessage('Invalid code format'),
  ],
  
  verifyLogin: [
    body('providerId')
      .trim()
      .notEmpty()
      .withMessage('Provider ID is required')
      .isUUID()
      .withMessage('Invalid provider ID'),
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Verification code is required')
      .isLength({ min: 6, max: 8 })
      .withMessage('Invalid code format'),
  ],

  disableMFA: [
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required to disable MFA'),
  ],
};