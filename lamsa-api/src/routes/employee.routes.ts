import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { employeeController } from '../controllers/employee.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';
import { employeeManagementLimiter } from '../middleware/rate-limit.middleware';
import { validateProviderOwnership } from '../middleware/resource-ownership.middleware';
import { phoneValidation } from '../middleware/phone-validation.middleware';
import multer from 'multer';

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

// ====================================
// PUBLIC ROUTES
// ====================================

// Get provider's employees (public for customer viewing)
router.get(
  '/providers/:providerId/employees',
  validate([
    param('providerId').isUUID().withMessage('Provider ID must be a valid UUID'),
    query('service_id').optional().isUUID().withMessage('Service ID must be a valid UUID'),
    query('active_only').optional().isBoolean().withMessage('active_only must be a boolean'),
  ]),
  employeeController.getProviderEmployees
);

// Get employee details (public for customer viewing)
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
  ]),
  employeeController.getEmployeeById
);

// Get employee availability for booking
router.get(
  '/:id/availability',
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
    query('date').notEmpty().isISO8601().toDate().withMessage('Valid date is required'),
    query('service_id').optional().isUUID().withMessage('Service ID must be a valid UUID'),
  ]),
  employeeController.getEmployeeAvailability
);

// ====================================
// PROTECTED ROUTES - Provider Only
// ====================================

// Create new employee
router.post(
  '/',
  authenticate,
  authorize(UserRole.PROVIDER),
  employeeManagementLimiter,
  upload.single('avatar'),
  validate([
    body('name_ar').notEmpty().trim().withMessage('Arabic name is required'),
    body('name_en').notEmpty().trim().withMessage('English name is required'),
    body('title_ar').optional().trim().withMessage('Arabic title must be a string'),
    body('title_en').optional().trim().withMessage('English title must be a string'),
    phoneValidation.employee,
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('bio_ar').optional().isString().withMessage('Arabic bio must be a string'),
    body('bio_en').optional().isString().withMessage('English bio must be a string'),
    body('years_experience').optional().isInt({ min: 0, max: 50 }).withMessage('Years of experience must be 0-50'),
    body('specialties').optional().isArray().withMessage('Specialties must be an array'),
    body('specialties.*').optional().isString().withMessage('Each specialty must be a string'),
    body('joined_at').optional().isISO8601().toDate().withMessage('Joined date must be valid'),
  ]),
  employeeController.createEmployee
);

// Update employee
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  upload.single('avatar'),
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
    body('name_ar').optional().notEmpty().trim().withMessage('Arabic name cannot be empty'),
    body('name_en').optional().notEmpty().trim().withMessage('English name cannot be empty'),
    body('title_ar').optional().trim().withMessage('Arabic title must be a string'),
    body('title_en').optional().trim().withMessage('English title must be a string'),
    body('phone').optional().matches(/^(\+962|962|07|7)[0-9]{8,9}$/).withMessage('Invalid Jordan phone number'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('bio_ar').optional().isString().withMessage('Arabic bio must be a string'),
    body('bio_en').optional().isString().withMessage('English bio must be a string'),
    body('years_experience').optional().isInt({ min: 0, max: 50 }).withMessage('Years of experience must be 0-50'),
    body('specialties').optional().isArray().withMessage('Specialties must be an array'),
    body('is_active').optional().isBoolean().withMessage('Active status must be a boolean'),
  ]),
  employeeController.updateEmployee
);

// Delete employee (soft delete)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
  ]),
  employeeController.deleteEmployee
);

// ====================================
// EMPLOYEE SERVICE ASSIGNMENTS
// ====================================

// Assign services to employee
router.post(
  '/:id/services',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
    body('service_ids').isArray({ min: 1 }).withMessage('Service IDs must be a non-empty array'),
    body('service_ids.*').isUUID().withMessage('Each service ID must be a valid UUID'),
    body('primary_service_id').optional().isUUID().withMessage('Primary service ID must be a valid UUID'),
  ]),
  employeeController.assignServices
);

// Remove service from employee
router.delete(
  '/:id/services/:serviceId',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
    param('serviceId').isUUID().withMessage('Service ID must be a valid UUID'),
  ]),
  employeeController.removeService
);

// ====================================
// EMPLOYEE AVAILABILITY MANAGEMENT
// ====================================

// Set weekly availability
router.put(
  '/:id/availability/weekly',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
    body('availability').isArray().withMessage('Availability must be an array'),
    body('availability.*.day_of_week').isInt({ min: 0, max: 6 }).withMessage('Day must be 0-6'),
    body('availability.*.starts_at').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be HH:MM'),
    body('availability.*.ends_at').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be HH:MM'),
    body('availability.*.is_available').isBoolean().withMessage('Available must be a boolean'),
    body('availability.*.break_start').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Break start must be HH:MM'),
    body('availability.*.break_end').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Break end must be HH:MM'),
  ]),
  employeeController.setWeeklyAvailability
);

// Set special date (holiday/time off)
router.post(
  '/:id/availability/special-dates',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
    body('date').notEmpty().isISO8601().toDate().withMessage('Valid date is required'),
    body('is_available').isBoolean().withMessage('Availability status is required'),
    body('starts_at').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be HH:MM'),
    body('ends_at').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be HH:MM'),
    body('reason').optional().isString().isLength({ max: 200 }).withMessage('Reason must be max 200 characters'),
  ]),
  employeeController.setSpecialDate
);

// Remove special date
router.delete(
  '/:id/availability/special-dates/:date',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
    param('date').isISO8601().withMessage('Valid date is required'),
  ]),
  employeeController.removeSpecialDate
);

// ====================================
// USER FAVORITES
// ====================================

// Add employee to favorites (customer only)
router.post(
  '/:id/favorite',
  authenticate,
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
  ]),
  employeeController.addToFavorites
);

// Remove employee from favorites (customer only)
router.delete(
  '/:id/favorite',
  authenticate,
  validate([
    param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
  ]),
  employeeController.removeFromFavorites
);

// Get user's favorite employees
router.get(
  '/favorites/mine',
  authenticate,
  employeeController.getUserFavorites
);

export default router;