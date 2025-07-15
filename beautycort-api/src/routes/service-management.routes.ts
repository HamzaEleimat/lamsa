import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { serviceManagementController } from '../controllers/service-management.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();

// ====================================
// SERVICE TEMPLATES - Public access
// ====================================

// Get service templates
router.get(
  '/templates',
  validate([
    query('category_id').optional().isUUID().withMessage('Invalid category ID'),
    query('subcategory').optional().isString().withMessage('Subcategory must be a string'),
    query('market_segment').optional()
      .isIn(['budget', 'standard', 'premium', 'luxury'])
      .withMessage('Invalid market segment'),
    query('gender_specific').optional()
      .isIn(['unisex', 'male', 'female'])
      .withMessage('Invalid gender specification'),
  ]),
  serviceManagementController.getServiceTemplates
);

// Get all service tags
router.get(
  '/tags',
  validate([
    query('category').optional().isString().withMessage('Category must be a string'),
    query('is_system').optional().isBoolean().withMessage('is_system must be a boolean'),
  ]),
  serviceManagementController.getServiceTags
);

// ====================================
// PROVIDER PACKAGES - Mixed access
// ====================================

// Get provider's service packages (public)
router.get(
  '/packages/:providerId',
  validate([
    param('providerId').isUUID().withMessage('Invalid provider ID'),
    query('includeInactive').optional().isBoolean().withMessage('includeInactive must be a boolean'),
  ]),
  serviceManagementController.getProviderPackages
);

// ====================================
// PROTECTED ROUTES - Provider only
// ====================================

// Create services from templates
router.post(
  '/from-templates',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('template_ids').isArray({ min: 1 }).withMessage('At least one template ID is required'),
    body('template_ids.*').isUUID().withMessage('Invalid template ID'),
    body('customizations').optional().isObject().withMessage('Customizations must be an object'),
  ]),
  serviceManagementController.createFromTemplates
);

// Bulk service operations
router.post(
  '/bulk',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('service_ids').isArray({ min: 1 }).withMessage('At least one service ID is required'),
    body('service_ids.*').isUUID().withMessage('Invalid service ID'),
    body('operation').isIn(['activate', 'deactivate', 'delete', 'update_price', 'update_category'])
      .withMessage('Invalid operation'),
    body('data').optional().isObject().withMessage('Operation data must be an object'),
    body('data.price_adjustment').optional().isNumeric().withMessage('Price adjustment must be numeric'),
    body('data.price_adjustment_type').optional()
      .isIn(['fixed', 'percentage'])
      .withMessage('Invalid price adjustment type'),
    body('data.category_id').optional().isUUID().withMessage('Invalid category ID'),
    body('data.tags').optional().isArray().withMessage('Tags must be an array'),
  ]),
  serviceManagementController.bulkServiceOperations
);

// Create service package
router.post(
  '/packages',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('name_en').notEmpty().trim().withMessage('English name is required'),
    body('name_ar').notEmpty().trim().withMessage('Arabic name is required'),
    body('description_en').optional().isString().withMessage('English description must be a string'),
    body('description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('service_ids').isArray({ min: 2 }).withMessage('Package must contain at least 2 services'),
    body('service_ids.*.service_id').isUUID().withMessage('Invalid service ID'),
    body('service_ids.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('service_ids.*.sequence_order').optional().isInt({ min: 0 }).withMessage('Invalid sequence order'),
    body('service_ids.*.is_optional').optional().isBoolean().withMessage('is_optional must be a boolean'),
    body('package_price').isFloat({ min: 0.01 }).withMessage('Package price must be greater than 0'),
    body('package_type').optional()
      .isIn(['bundle', 'subscription', 'promotional'])
      .withMessage('Invalid package type'),
    body('valid_from').optional().isISO8601().withMessage('Invalid valid_from date'),
    body('valid_until').optional().isISO8601().withMessage('Invalid valid_until date'),
    body('max_bookings').optional().isInt({ min: 1 }).withMessage('Max bookings must be at least 1'),
    body('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  ]),
  serviceManagementController.createServicePackage
);

// Update service package
router.put(
  '/packages/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid package ID'),
    body('name_en').optional().notEmpty().trim().withMessage('English name cannot be empty'),
    body('name_ar').optional().notEmpty().trim().withMessage('Arabic name cannot be empty'),
    body('description_en').optional().isString().withMessage('English description must be a string'),
    body('description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('package_price').optional().isFloat({ min: 0.01 }).withMessage('Package price must be greater than 0'),
    body('valid_from').optional().isISO8601().withMessage('Invalid valid_from date'),
    body('valid_until').optional().isISO8601().withMessage('Invalid valid_until date'),
    body('max_bookings').optional().isInt({ min: 1 }).withMessage('Max bookings must be at least 1'),
    body('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean'),
  ]),
  // Controller method to be implemented
  (_req, res) => res.status(501).json({ error: 'Not implemented' })
);

// Delete service package
router.delete(
  '/packages/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid package ID'),
  ]),
  // Controller method to be implemented
  (_req, res) => res.status(501).json({ error: 'Not implemented' })
);

// Duplicate a service
router.post(
  '/duplicate/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid service ID'),
    body('name_en').optional().notEmpty().trim().withMessage('English name cannot be empty'),
    body('name_ar').optional().notEmpty().trim().withMessage('Arabic name cannot be empty'),
  ]),
  serviceManagementController.duplicateService
);

// Get service analytics
router.get(
  '/analytics/:providerId',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('providerId').isUUID().withMessage('Invalid provider ID'),
    query('date_from').optional().isISO8601().withMessage('Invalid date_from format'),
    query('date_to').optional().isISO8601().withMessage('Invalid date_to format'),
    query('service_id').optional().isUUID().withMessage('Invalid service ID'),
  ]),
  serviceManagementController.getServiceAnalytics
);

// Update service variations
router.put(
  '/:id/variations',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid service ID'),
    body('variations').isArray().withMessage('Variations must be an array'),
    body('variations.*.name_en').notEmpty().trim().withMessage('English name is required'),
    body('variations.*.name_ar').notEmpty().trim().withMessage('Arabic name is required'),
    body('variations.*.description_en').optional().isString().withMessage('English description must be a string'),
    body('variations.*.description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('variations.*.price_modifier').isNumeric().withMessage('Price modifier must be numeric'),
    body('variations.*.duration_modifier').isInt().withMessage('Duration modifier must be an integer'),
    body('variations.*.is_default').optional().isBoolean().withMessage('is_default must be a boolean'),
    body('variations.*.metadata').optional().isObject().withMessage('Metadata must be an object'),
  ]),
  serviceManagementController.updateServiceVariations
);

// Update service tags
router.put(
  '/:id/tags',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid service ID'),
    body('tag_ids').isArray().withMessage('Tag IDs must be an array'),
    body('tag_ids.*').isUUID().withMessage('Invalid tag ID'),
  ]),
  serviceManagementController.updateServiceTags
);

// Create custom tag (admin only in production, provider allowed for now)
router.post(
  '/tags',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    body('name_en').notEmpty().trim().withMessage('English name is required'),
    body('name_ar').notEmpty().trim().withMessage('Arabic name is required'),
    body('category').optional().isString().withMessage('Category must be a string'),
    body('icon').optional().isString().withMessage('Icon must be a string'),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format'),
  ]),
  // Controller method to be implemented
  (_req, res) => res.status(501).json({ error: 'Not implemented' })
);

export default router;