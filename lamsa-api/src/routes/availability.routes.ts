import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { availabilityController } from '../controllers/availability.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();

// ====================================
// PUBLIC ROUTES - Customer access
// ====================================

// Get available time slots for a provider
router.get(
  '/providers/:id/availability/slots',
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    query('date').isISO8601().withMessage('Invalid date format'),
    query('serviceId').optional().isUUID().withMessage('Invalid service ID'),
    query('includeInstant').optional().isBoolean().withMessage('includeInstant must be boolean'),
    query('customerGender').optional().isIn(['male', 'female']).withMessage('Invalid gender'),
  ]),
  availabilityController.getAvailableSlots
);

// Check specific slot availability
router.post(
  '/providers/:id/availability/check',
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    body('serviceId').isUUID().withMessage('Service ID is required'),
    body('date').isISO8601().withMessage('Invalid date format'),
    body('time').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
  ]),
  availabilityController.checkAvailability
);

// ====================================
// PROTECTED ROUTES - Provider only
// ====================================

// Get provider availability settings
router.get(
  '/providers/:id/availability/settings',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
  ]),
  availabilityController.getAvailabilitySettings
);

// Update provider availability settings
router.put(
  '/providers/:id/availability/settings',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    body('advance_booking_days').optional().isInt({ min: 1, max: 365 }).withMessage('Must be between 1-365 days'),
    body('min_advance_booking_hours').optional().isInt({ min: 0, max: 168 }).withMessage('Must be between 0-168 hours'),
    body('max_advance_booking_days').optional().isInt({ min: 1, max: 365 }).withMessage('Must be between 1-365 days'),
    body('default_preparation_minutes').optional().isInt({ min: 0, max: 60 }).withMessage('Must be between 0-60 minutes'),
    body('default_cleanup_minutes').optional().isInt({ min: 0, max: 60 }).withMessage('Must be between 0-60 minutes'),
    body('between_appointments_minutes').optional().isInt({ min: 0, max: 60 }).withMessage('Must be between 0-60 minutes'),
    body('enable_prayer_breaks').optional().isBoolean().withMessage('Must be boolean'),
    body('prayer_time_flexibility_minutes').optional().isInt({ min: 0, max: 30 }).withMessage('Must be between 0-30 minutes'),
    body('auto_adjust_prayer_times').optional().isBoolean().withMessage('Must be boolean'),
    body('auto_switch_ramadan_schedule').optional().isBoolean().withMessage('Must be boolean'),
    body('allow_instant_booking').optional().isBoolean().withMessage('Must be boolean'),
    body('require_deposit').optional().isBoolean().withMessage('Must be boolean'),
    body('deposit_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Must be between 0-100'),
    body('cancellation_notice_hours').optional().isInt({ min: 0, max: 168 }).withMessage('Must be between 0-168 hours'),
    body('women_only_hours_enabled').optional().isBoolean().withMessage('Must be boolean'),
    body('women_only_start_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('women_only_end_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('women_only_days').optional().isArray().withMessage('Must be an array'),
    body('women_only_days.*').optional().isInt({ min: 0, max: 6 }).withMessage('Invalid day of week'),
  ]),
  availabilityController.updateAvailabilitySettings
);

// Add time off
router.post(
  '/providers/:id/availability/time-off',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    body('start_date').isISO8601().withMessage('Invalid start date'),
    body('end_date').isISO8601().withMessage('Invalid end date'),
    body('start_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid start time'),
    body('end_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid end time'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('is_recurring').optional().isBoolean().withMessage('Must be boolean'),
    body('recurrence_rule').optional().isString().withMessage('Recurrence rule must be a string'),
    body('block_bookings').optional().isBoolean().withMessage('Must be boolean'),
    body('auto_reschedule').optional().isBoolean().withMessage('Must be boolean'),
  ]),
  availabilityController.addTimeOff
);

// Delete time off
router.delete(
  '/providers/:id/availability/time-off/:timeOffId',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    param('timeOffId').isUUID().withMessage('Invalid time off ID'),
  ]),
  availabilityController.deleteTimeOff
);

// ====================================
// SPECIAL DATES MANAGEMENT
// ====================================

// Get all special dates for provider
router.get(
  '/providers/:id/special-dates',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date'),
  ]),
  availabilityController.getSpecialDates
);

// Add special date (holiday/exception)
router.post(
  '/providers/:id/special-dates',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    body('date').isISO8601().toDate().withMessage('Valid date is required'),
    body('is_holiday').isBoolean().withMessage('Holiday status is required'),
    body('opens_at').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Opens at must be HH:MM'),
    body('closes_at').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Closes at must be HH:MM'),
    body('reason').optional().isString().isLength({ max: 200 }).withMessage('Reason must be max 200 characters'),
  ]),
  availabilityController.addSpecialDate
);

// Update special date
router.put(
  '/providers/:id/special-dates/:date',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    param('date').isISO8601().withMessage('Valid date is required'),
    body('is_holiday').optional().isBoolean().withMessage('Holiday status must be boolean'),
    body('opens_at').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Opens at must be HH:MM'),
    body('closes_at').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Closes at must be HH:MM'),
    body('reason').optional().isString().isLength({ max: 200 }).withMessage('Reason must be max 200 characters'),
  ]),
  availabilityController.updateSpecialDate
);

// Delete special date
router.delete(
  '/providers/:id/special-dates/:date',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    param('date').isISO8601().withMessage('Valid date is required'),
  ]),
  availabilityController.deleteSpecialDate
);

// Get national holidays
router.get(
  '/national-holidays',
  validate([
    query('year').optional().isInt({ min: 2024, max: 2030 }).withMessage('Invalid year'),
    query('country').optional().isString().withMessage('Country must be a string'),
  ]),
  availabilityController.getNationalHolidays
);

// Get prayer settings
router.get(
  '/providers/:id/availability/prayer-settings',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
  ]),
  availabilityController.getPrayerSettings
);

// Update prayer settings
router.put(
  '/providers/:id/availability/prayer-settings',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    body('enable_prayer_breaks').optional().isBoolean().withMessage('Must be boolean'),
    body('prayer_time_flexibility_minutes').optional().isInt({ min: 0, max: 30 }).withMessage('Must be between 0-30 minutes'),
    body('auto_adjust_prayer_times').optional().isBoolean().withMessage('Must be boolean'),
    body('prayer_calculation_method').optional().isString().withMessage('Must be a string'),
  ]),
  availabilityController.updatePrayerSettings
);

// Get Ramadan schedule
router.get(
  '/providers/:id/availability/ramadan-schedule',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    query('year').optional().isInt({ min: 2024, max: 2030 }).withMessage('Invalid year'),
  ]),
  availabilityController.getRamadanSchedule
);

// Update Ramadan schedule
router.put(
  '/providers/:id/availability/ramadan-schedule',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    body('year').isInt({ min: 2024, max: 2030 }).withMessage('Invalid year'),
    body('template_type').isIn(['early_shift', 'late_shift', 'split_shift', 'custom']).withMessage('Invalid template type'),
    body('early_start_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('early_end_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('late_start_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('late_end_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('iftar_break_minutes').optional().isInt({ min: 30, max: 120 }).withMessage('Must be between 30-120 minutes'),
    body('auto_adjust_maghrib').optional().isBoolean().withMessage('Must be boolean'),
    body('offer_home_service_only').optional().isBoolean().withMessage('Must be boolean'),
    body('special_ramadan_services').optional().isArray().withMessage('Must be an array'),
    body('special_ramadan_services.*').optional().isUUID().withMessage('Invalid service ID'),
  ]),
  availabilityController.updateRamadanSchedule
);

// Get weekly schedule view
router.get(
  '/providers/:id/availability/weekly-schedule',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    query('date').optional().isISO8601().withMessage('Invalid date format'),
  ]),
  availabilityController.getWeeklySchedule
);

// Create or update working schedule
router.post(
  '/providers/:id/availability/schedules',
  authenticate,
  authorize(UserRole.PROVIDER),
  validate([
    param('id').isUUID().withMessage('Invalid provider ID'),
    body('schedule').isObject().withMessage('Schedule data is required'),
    body('schedule.schedule_name').optional().isString().withMessage('Schedule name must be a string'),
    body('schedule.is_active').optional().isBoolean().withMessage('Must be boolean'),
    body('schedule.priority').optional().isInt({ min: 0 }).withMessage('Priority must be non-negative'),
    body('schedule.effective_from').optional().isISO8601().withMessage('Invalid date format'),
    body('schedule.effective_to').optional().isISO8601().withMessage('Invalid date format'),
    body('schedule.recurrence_rule').optional().isIn(['yearly', 'ramadan', 'none']).withMessage('Invalid recurrence rule'),
    body('shifts').optional().isArray().withMessage('Shifts must be an array'),
    body('shifts.*.day_of_week').isInt({ min: 0, max: 6 }).withMessage('Invalid day of week'),
    body('shifts.*.start_time').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('shifts.*.end_time').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('shifts.*.shift_type').optional().isString().withMessage('Shift type must be a string'),
    body('shifts.*.max_bookings').optional().isInt({ min: 1 }).withMessage('Max bookings must be positive'),
    body('breaks').optional().isArray().withMessage('Breaks must be an array'),
    body('breaks.*.day_of_week').isInt({ min: 0, max: 6 }).withMessage('Invalid day of week'),
    body('breaks.*.break_type').isIn(['lunch', 'prayer', 'personal', 'maintenance']).withMessage('Invalid break type'),
    body('breaks.*.break_name').optional().isString().withMessage('Break name must be a string'),
    body('breaks.*.start_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('breaks.*.end_time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid time format'),
    body('breaks.*.is_dynamic').optional().isBoolean().withMessage('Must be boolean'),
    body('breaks.*.prayer_name').optional().isIn(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']).withMessage('Invalid prayer name'),
    body('breaks.*.duration_minutes').optional().isInt({ min: 5, max: 60 }).withMessage('Must be between 5-60 minutes'),
    body('breaks.*.is_flexible').optional().isBoolean().withMessage('Must be boolean'),
    body('breaks.*.flexibility_minutes').optional().isInt({ min: 0, max: 30 }).withMessage('Must be between 0-30 minutes'),
  ]),
  availabilityController.createSchedule
);

export default router;