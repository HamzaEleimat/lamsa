import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { settlementController } from '../controllers/settlement.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';
import { apiRateLimiter, settlementOperationsLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// All settlement routes require authentication
router.use(authenticate);
router.use(apiRateLimiter);

// ====================================
// PROVIDER ROUTES
// ====================================

// Get provider's settlements
router.get(
  '/provider/:providerId',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validate([
    param('providerId').isUUID().withMessage('Provider ID must be a valid UUID'),
    query('year').optional().isInt({ min: 2024, max: 2100 }).withMessage('Invalid year'),
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  settlementController.getProviderSettlements
);

// Get settlement details
router.get(
  '/:id',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validate([
    param('id').isUUID().withMessage('Settlement ID must be a valid UUID'),
  ]),
  settlementController.getSettlementById
);

// Get pending settlement amount for current month
router.get(
  '/provider/:providerId/pending',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validate([
    param('providerId').isUUID().withMessage('Provider ID must be a valid UUID'),
  ]),
  settlementController.getPendingSettlement
);

// Get settlement breakdown (detailed bookings)
router.get(
  '/:id/breakdown',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validate([
    param('id').isUUID().withMessage('Settlement ID must be a valid UUID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  settlementController.getSettlementBreakdown
);

// Export settlement report (CSV/PDF)
router.get(
  '/:id/export',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validate([
    param('id').isUUID().withMessage('Settlement ID must be a valid UUID'),
    query('format').optional().isIn(['csv', 'pdf']).withMessage('Format must be csv or pdf'),
  ]),
  settlementController.exportSettlement
);

// ====================================
// ADMIN ROUTES
// ====================================

// Get all settlements (admin only)
router.get(
  '/',
  authorize(UserRole.ADMIN),
  validate([
    query('year').optional().isInt({ min: 2024, max: 2100 }).withMessage('Invalid year'),
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']).withMessage('Invalid status'),
    query('provider_id').optional().isUUID().withMessage('Provider ID must be a valid UUID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  settlementController.getAllSettlements
);

// Create monthly settlements (admin only - usually automated)
router.post(
  '/generate',
  authorize(UserRole.ADMIN),
  validate([
    body('month').isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
    body('year').isInt({ min: 2024, max: 2100 }).withMessage('Invalid year'),
    body('provider_ids').optional().isArray().withMessage('Provider IDs must be an array'),
    body('provider_ids.*').optional().isUUID().withMessage('Each provider ID must be a valid UUID'),
  ]),
  settlementController.generateMonthlySettlements
);

// Process settlement payment (admin only)
router.post(
  '/:id/process',
  authorize(UserRole.ADMIN),
  settlementOperationsLimiter,
  validate([
    param('id').isUUID().withMessage('Settlement ID must be a valid UUID'),
    body('payment_method').notEmpty().isIn(['bank_transfer', 'cash', 'check']).withMessage('Invalid payment method'),
    body('payment_reference').notEmpty().withMessage('Payment reference is required'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ]),
  settlementController.processSettlement
);

// Mark settlement as failed (admin only)
router.post(
  '/:id/fail',
  authorize(UserRole.ADMIN),
  validate([
    param('id').isUUID().withMessage('Settlement ID must be a valid UUID'),
    body('reason').notEmpty().withMessage('Failure reason is required'),
  ]),
  settlementController.failSettlement
);

// Recalculate settlement (admin only - in case of errors)
router.post(
  '/:id/recalculate',
  authorize(UserRole.ADMIN),
  validate([
    param('id').isUUID().withMessage('Settlement ID must be a valid UUID'),
  ]),
  settlementController.recalculateSettlement
);

// Get settlement statistics (admin dashboard)
router.get(
  '/statistics/overview',
  authorize(UserRole.ADMIN),
  validate([
    query('year').optional().isInt({ min: 2024, max: 2100 }).withMessage('Invalid year'),
  ]),
  settlementController.getSettlementStatistics
);

export default router;