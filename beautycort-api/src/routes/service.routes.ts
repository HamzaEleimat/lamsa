import { Router } from 'express';
import { body, query } from 'express-validator';
import { serviceController } from '../controllers/service.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();

// Public routes
router.get(
  '/',
  validate([
    query('category').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
  ]),
  serviceController.getAllServices
);

router.get('/categories', serviceController.getServiceCategories);

router.get(
  '/search',
  validate([
    query('q').optional().isString(),
    query('location').optional().isString(),
    query('category').optional().isString(),
    query('priceRange').optional().isString(),
  ]),
  serviceController.searchServices
);

router.get('/:id', serviceController.getServiceById);

// Provider-specific service routes
router.post(
  '/providers/:providerId/services',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('name').notEmpty().trim(),
    body('category').notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('duration').isInt({ min: 1 }),
    body('description').optional().isString(),
  ]),
  serviceController.createService
);

router.put(
  '/providers/:providerId/services/:serviceId',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('name').optional().notEmpty().trim(),
    body('category').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('duration').optional().isInt({ min: 1 }),
    body('description').optional().isString(),
  ]),
  serviceController.updateService
);

router.delete(
  '/providers/:providerId/services/:serviceId',
  authenticate,
  authorize(UserRole.PROVIDER),
  serviceController.deleteService
);

export default router;