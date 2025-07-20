import { Router } from 'express';
import { body, query } from 'express-validator';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Process payment
router.post(
  '/',
  validate([
    body('bookingId').notEmpty(),
    body('paymentMethod').notEmpty(),
    body('amount').isFloat({ min: 0 }),
  ]),
  paymentController.processPayment
);

// Get payment history
router.get(
  '/history',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  paymentController.getPaymentHistory
);

// Refund payment
router.post(
  '/:paymentId/refund',
  validate([
    body('reason').notEmpty().isString(),
  ]),
  paymentController.refundPayment
);

export default router;