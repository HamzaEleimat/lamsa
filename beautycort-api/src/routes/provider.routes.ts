import { Router } from 'express';
import { body, query } from 'express-validator';
import { providerController } from '../controllers/provider.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();

// Public routes
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('location').optional().isString(),
    query('rating').optional().isFloat({ min: 0, max: 5 }),
  ]),
  providerController.getAllProviders
);

router.get('/:id', providerController.getProviderById);
router.get('/:id/services', providerController.getProviderServices);
router.get(
  '/:id/availability',
  validate([
    query('date').isISO8601().toDate(),
  ]),
  providerController.getProviderAvailability
);

// Protected routes - require authentication
router.post(
  '/',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('name').notEmpty().trim(),
    body('category').notEmpty(),
    body('location').notEmpty(),
    body('description').optional().isString(),
    body('workingHours').optional().isObject(),
  ]),
  providerController.createProvider
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('name').optional().notEmpty().trim(),
    body('category').optional().notEmpty(),
    body('location').optional().notEmpty(),
    body('description').optional().isString(),
    body('workingHours').optional().isObject(),
  ]),
  providerController.updateProvider
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  providerController.deleteProvider
);

router.get(
  '/:id/stats',
  authenticate,
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  providerController.getProviderStats
);

export default router;