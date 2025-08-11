import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { providerController } from '../controllers/provider.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { searchRateLimiter, providerRegistrationLimiter, providerUpdateLimiter } from '../middleware/rate-limit.middleware';
import { validateProviderOwnership, validateOwnershipWithAdminBypass } from '../middleware/resource-ownership.middleware';
import { UserRole } from '../types';
import { phoneValidation } from '../middleware/phone-validation.middleware';
import { encryptProviderPII, decryptProviderPII } from '../middleware/pii-encryption.middleware';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

// Public routes
// Get all providers with filters
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    query('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters'),
  ]),
  decryptProviderPII,  // Decrypt PII data in response
  providerController.getAllProviders
);

// Search providers with advanced filters
router.post(
  '/search',
  searchRateLimiter, // Rate limit expensive search operations
  validate([
    body('query').optional().isString().trim().withMessage('Search query must be a string'),
    body('location').optional().isObject().withMessage('Location must be an object'),
    body('location.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('location.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    body('location.radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters'),
    body('services').optional().isArray().withMessage('Services must be an array'),
    body('services.*').optional().isString().withMessage('Each service must be a string'),
    body('priceRange').optional().isObject().withMessage('Price range must be an object'),
    body('priceRange.min').optional().isFloat({ min: 0 }).withMessage('Minimum price must be non-negative'),
    body('priceRange.max').optional().isFloat({ min: 0 }).withMessage('Maximum price must be non-negative'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ]),
  decryptProviderPII,  // Decrypt PII data in response
  providerController.searchProviders
);

// Get provider by ID
router.get(
  '/:id',
  validate([
    param('id').notEmpty().withMessage('Provider ID is required'),
  ]),
  decryptProviderPII,  // Decrypt PII data in response
  providerController.getProviderById
);

// Get provider services
router.get(
  '/:id/services',
  validate([
    param('id').notEmpty().withMessage('Provider ID is required'),
    query('category').optional().isString().withMessage('Category must be a string'),
  ]),
  providerController.getProviderServices
);

// Get provider availability
router.get(
  '/:id/availability',
  validate([
    param('id').notEmpty().withMessage('Provider ID is required'),
    query('date').notEmpty().isISO8601().toDate().withMessage('Valid date is required'),
  ]),
  providerController.getProviderAvailability
);

// Protected routes - require authentication
// Create provider profile
router.post(
  '/',
  authenticate,
  authorize(UserRole.PROVIDER),
  providerRegistrationLimiter,
  validate([
    body('business_name_ar').notEmpty().trim().withMessage('Arabic business name is required'),
    body('business_name_en').notEmpty().trim().withMessage('English business name is required'),
    body('owner_name').notEmpty().trim().withMessage('Owner name is required'),
    phoneValidation.providerRegistration,
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('address').notEmpty().isObject().withMessage('Address is required'),
    body('address.street').notEmpty().trim().withMessage('Street is required'),
    body('address.city').notEmpty().trim().withMessage('City is required'),
    body('address.district').notEmpty().trim().withMessage('District is required'),
    body('address.country').notEmpty().trim().withMessage('Country is required'),
    body('latitude').notEmpty().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    body('longitude').notEmpty().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
    body('description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('description_en').optional().isString().withMessage('English description must be a string'),
    body('category').notEmpty().isString().withMessage('Category is required'),
    body('working_hours').optional().isObject().withMessage('Working hours must be an object'),
    body('license_number').optional().isString().withMessage('License number must be a string'),
  ]),
  encryptProviderPII,  // Encrypt PII before saving
  providerController.createProvider
);

// Update provider profile (with optional file upload for license)
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  validateProviderOwnership('id'), // Ensure provider can only update own profile
  providerUpdateLimiter,
  upload.single('license_image'),
  validate([
    param('id').notEmpty().withMessage('Provider ID is required'),
    body('business_name_ar').optional().notEmpty().trim().withMessage('Arabic business name cannot be empty'),
    body('business_name_en').optional().notEmpty().trim().withMessage('English business name cannot be empty'),
    body('owner_name').optional().notEmpty().trim().withMessage('Owner name cannot be empty'),
    phoneValidation.profile,
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('address').optional().isObject().withMessage('Address must be an object'),
    body('address.street').optional().notEmpty().trim().withMessage('Street cannot be empty'),
    body('address.city').optional().notEmpty().trim().withMessage('City cannot be empty'),
    body('address.district').optional().notEmpty().trim().withMessage('District cannot be empty'),
    body('address.country').optional().notEmpty().trim().withMessage('Country cannot be empty'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
    body('description_ar').optional().isString().withMessage('Arabic description must be a string'),
    body('description_en').optional().isString().withMessage('English description must be a string'),
    body('working_hours').optional().isObject().withMessage('Working hours must be an object'),
    body('license_number').optional().isString().withMessage('License number must be a string'),
  ]),
  encryptProviderPII,  // Encrypt PII before updating
  providerController.updateProvider
);

// Delete provider (soft delete)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validateOwnershipWithAdminBypass('id'), // Providers can only delete own profile, admins can delete any
  validate([
    param('id').notEmpty().withMessage('Provider ID is required'),
  ]),
  providerController.deleteProvider
);

// Get provider statistics
router.get(
  '/:id/stats',
  authenticate,
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validateOwnershipWithAdminBypass('id'), // Providers can only view own stats, admins can view any
  validate([
    param('id').notEmpty().withMessage('Provider ID is required'),
  ]),
  decryptProviderPII,  // Decrypt PII data in response
  providerController.getProviderStats
);

export default router;
