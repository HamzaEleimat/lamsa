import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { serviceController } from '../controllers/service.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();

// ====================================
// PUBLIC ROUTES - No authentication required
// ====================================

// Get all services with optional filters
router.get(
  '/',
  validate([
    query('category').optional().isString().withMessage('Category must be a string'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be non-negative'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be non-negative'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  serviceController.getAllServices
);

// Get all service categories
router.get('/categories', serviceController.getCategories);

// Search services with advanced filters
router.get(
  '/search',
  validate([
    query('q').optional().isString().trim().withMessage('Search query must be a string'),
    query('location').optional().isString().withMessage('Location must be a string (lat,lng format)'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('priceRange').optional().isString().withMessage('Price range must be a string (min-max format)'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  serviceController.searchServices
);

// Get services by provider (public access)
router.get(
  '/providers/:providerId/services',
  validate([
    param('providerId').notEmpty().withMessage('Provider ID is required'),
    query('includeInactive').optional().isBoolean().withMessage('Include inactive must be a boolean'),
    query('category').optional().isString().withMessage('Category must be a string'),
  ]),
  serviceController.getServicesByProvider
);

// Get service by ID (public access)
router.get(
  '/:id',
  validate([
    param('id').notEmpty().withMessage('Service ID is required'),
  ]),
  serviceController.getServiceById
);

// ====================================
// PROTECTED ROUTES - Provider authentication required
// ====================================

// Create a new service (Provider only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('name_ar').notEmpty().trim().withMessage('Arabic name is required'),
    body('name_en').notEmpty().trim().withMessage('English name is required'),
    body('description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('description_en').optional().isString().withMessage('English description must be a string'),
    body('category').notEmpty().withMessage('Category is required')
      .isIn(['HAIR', 'NAILS', 'SKINCARE', 'MAKEUP', 'MASSAGE', 'WAXING', 'AESTHETIC'])
      .withMessage('Invalid category'),
    body('price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
    body('duration_minutes').isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  ]),
  serviceController.createService
);

// Update a service (Provider only - ownership checked in controller)
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').notEmpty().withMessage('Service ID is required'),
    body('name_ar').optional().notEmpty().trim().withMessage('Arabic name cannot be empty'),
    body('name_en').optional().notEmpty().trim().withMessage('English name cannot be empty'),
    body('description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('description_en').optional().isString().withMessage('English description must be a string'),
    body('category').optional().notEmpty()
      .isIn(['HAIR', 'NAILS', 'SKINCARE', 'MAKEUP', 'MASSAGE', 'WAXING', 'AESTHETIC'])
      .withMessage('Invalid category'),
    body('price').optional().isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
    body('duration_minutes').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  ]),
  serviceController.updateService
);

// Delete a service - soft delete (Provider only - ownership checked in controller)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').notEmpty().withMessage('Service ID is required'),
  ]),
  serviceController.deleteService
);

// ====================================
// LEGACY ROUTES - For backward compatibility
// ====================================

// Create service with provider ID in path
router.post(
  '/providers/:providerId/services',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('providerId').notEmpty().withMessage('Provider ID is required'),
    body('name_ar').notEmpty().trim().withMessage('Arabic name is required'),
    body('name_en').notEmpty().trim().withMessage('English name is required'),
    body('description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('description_en').optional().isString().withMessage('English description must be a string'),
    body('category').notEmpty().withMessage('Category is required')
      .isIn(['HAIR', 'NAILS', 'SKINCARE', 'MAKEUP', 'MASSAGE', 'WAXING', 'AESTHETIC'])
      .withMessage('Invalid category'),
    body('price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
    body('duration_minutes').isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  ]),
  serviceController.createService
);

// Update service with provider ID in path
router.put(
  '/providers/:providerId/services/:serviceId',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('providerId').notEmpty().withMessage('Provider ID is required'),
    param('serviceId').notEmpty().withMessage('Service ID is required'),
    body('name_ar').optional().notEmpty().trim().withMessage('Arabic name cannot be empty'),
    body('name_en').optional().notEmpty().trim().withMessage('English name cannot be empty'),
    body('description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('description_en').optional().isString().withMessage('English description must be a string'),
    body('category').optional().notEmpty()
      .isIn(['HAIR', 'NAILS', 'SKINCARE', 'MAKEUP', 'MASSAGE', 'WAXING', 'AESTHETIC'])
      .withMessage('Invalid category'),
    body('price').optional().isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
    body('duration_minutes').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean'),
  ]),
  serviceController.updateService
);

// Delete service with provider ID in path
router.delete(
  '/providers/:providerId/services/:serviceId',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('providerId').notEmpty().withMessage('Provider ID is required'),
    param('serviceId').notEmpty().withMessage('Service ID is required'),
  ]),
  serviceController.deleteService
);

export default router;