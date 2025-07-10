import { Router } from 'express';
import { body, query } from 'express-validator';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Create review (requires auth)
router.post(
  '/',
  authenticate,
  validate([
    body('bookingId').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString(),
  ]),
  reviewController.createReview
);

// Get provider reviews (public)
router.get(
  '/providers/:providerId',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  reviewController.getProviderReviews
);

// Update review (requires auth)
router.put(
  '/:id',
  authenticate,
  validate([
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().isString(),
  ]),
  reviewController.updateReview
);

export default router;