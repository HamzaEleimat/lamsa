/**
 * Booking Validation Middleware
 * Comprehensive validation rules for booking operations with business logic
 */

import { body, param, query, ValidationChain } from 'express-validator';
import { isAfter, parseISO, format, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

// Business rules constants
const BOOKING_ADVANCE_DAYS = 90; // Maximum days in advance
const MIN_ADVANCE_HOURS = 2; // Minimum hours in advance
const MAX_BOOKING_DURATION = 480; // Maximum 8 hours
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 22;

/**
 * Custom validator for Jordan phone numbers
 */
const isJordanianPhone = (phone: string): boolean => {
  // Jordan numbers: +962 7X XXX XXXX or 07X XXX XXXX
  const jordanPhoneRegex = /^(\+9627|07)[789]\d{7}$/;
  return jordanPhoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Custom validator for booking date (must be future and within limits)
 */
const isValidBookingDate = (dateString: string): boolean => {
  try {
    const bookingDate = parseISO(dateString);
    const now = new Date();
    const maxFutureDate = addDays(now, BOOKING_ADVANCE_DAYS);
    
    // Must be in the future and within advance booking limit
    return isAfter(bookingDate, now) && 
           isWithinInterval(bookingDate, { start: startOfDay(now), end: endOfDay(maxFutureDate) });
  } catch {
    return false;
  }
};

/**
 * Custom validator for booking time (must be in business hours and future)
 */
const isValidBookingTime = (time: string, { req }: any): boolean => {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    
    // Check business hours
    if (hours < BUSINESS_START_HOUR || hours >= BUSINESS_END_HOUR) {
      return false;
    }
    
    // If date is today, check minimum advance time
    if (req.body.date) {
      const bookingDate = parseISO(req.body.date);
      const bookingDateTime = new Date(bookingDate);
      bookingDateTime.setHours(hours, minutes, 0, 0);
      
      const now = new Date();
      const minAdvanceTime = new Date(now.getTime() + (MIN_ADVANCE_HOURS * 60 * 60 * 1000));
      
      return isAfter(bookingDateTime, minAdvanceTime);
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Custom validator for payment method based on amount
 */
const isValidPaymentMethod = (paymentMethod: string, { req }: any): boolean => {
  const validMethods = ['cash', 'card', 'online'];
  
  if (!validMethods.includes(paymentMethod)) {
    return false;
  }
  
  // For high amounts, require online payment
  if (req.body.estimatedAmount && parseFloat(req.body.estimatedAmount) > 100) {
    return paymentMethod === 'online';
  }
  
  return true;
};

/**
 * Validation for creating a new booking
 */
export const validateCreateBooking: ValidationChain[] = [
  body('providerId')
    .notEmpty()
    .withMessage('Provider ID is required')
    .isUUID()
    .withMessage('Provider ID must be a valid UUID'),
    
  body('serviceId')
    .notEmpty()
    .withMessage('Service ID is required')
    .isUUID()
    .withMessage('Service ID must be a valid UUID'),
    
  body('date')
    .notEmpty()
    .withMessage('Booking date is required')
    .isISO8601()
    .withMessage('Date must be in ISO8601 format (YYYY-MM-DD)')
    .custom(isValidBookingDate)
    .withMessage(`Booking date must be between ${MIN_ADVANCE_HOURS} hours and ${BOOKING_ADVANCE_DAYS} days from now`),
    
  body('time')
    .notEmpty()
    .withMessage('Booking time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:mm format')
    .custom(isValidBookingTime)
    .withMessage(`Booking time must be between ${BUSINESS_START_HOUR}:00 and ${BUSINESS_END_HOUR}:00, and at least ${MIN_ADVANCE_HOURS} hours from now`),
    
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'online'])
    .withMessage('Payment method must be cash, card, or online')
    .custom(isValidPaymentMethod)
    .withMessage('Online payment required for bookings over 100 JOD'),
    
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim(),
    
  body('customerPhone')
    .optional()
    .custom(isJordanianPhone)
    .withMessage('Phone number must be a valid Jordanian number (+962 7X XXX XXXX)'),
    
  body('estimatedAmount')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Estimated amount must be between 0 and 1000 JOD')
];

/**
 * Validation for updating booking status
 */
export const validateUpdateBookingStatus: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
    
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .withMessage('Status must be: pending, confirmed, completed, cancelled, or no_show'),
    
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
    .trim(),
    
  body('providerNotes')
    .optional()
    .isString()
    .withMessage('Provider notes must be a string')
    .isLength({ max: 300 })
    .withMessage('Provider notes cannot exceed 300 characters')
    .trim()
];

/**
 * Validation for rescheduling a booking
 */
export const validateRescheduleBooking: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
    
  body('date')
    .notEmpty()
    .withMessage('New booking date is required')
    .isISO8601()
    .withMessage('Date must be in ISO8601 format (YYYY-MM-DD)')
    .custom(isValidBookingDate)
    .withMessage(`New booking date must be between ${MIN_ADVANCE_HOURS} hours and ${BOOKING_ADVANCE_DAYS} days from now`),
    
  body('time')
    .notEmpty()
    .withMessage('New booking time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:mm format')
    .custom(isValidBookingTime)
    .withMessage(`New booking time must be between ${BUSINESS_START_HOUR}:00 and ${BUSINESS_END_HOUR}:00, and at least ${MIN_ADVANCE_HOURS} hours from now`),
    
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
    .trim()
];

/**
 * Validation for cancelling a booking
 */
export const validateCancelBooking: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
    
  body('reason')
    .optional()
    .isString()
    .withMessage('Cancellation reason must be a string')
    .isLength({ min: 10, max: 200 })
    .withMessage('Cancellation reason must be between 10 and 200 characters')
    .trim(),
    
  body('refundRequested')
    .optional()
    .isBoolean()
    .withMessage('Refund requested must be a boolean'),
    
  body('notifyCustomer')
    .optional()
    .isBoolean()
    .withMessage('Notify customer must be a boolean')
];

/**
 * Validation for booking queries and filters
 */
export const validateBookingQuery: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a positive integer between 1 and 1000'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .withMessage('Status must be: pending, confirmed, completed, cancelled, or no_show'),
    
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be in ISO8601 format (YYYY-MM-DD)'),
    
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be in ISO8601 format (YYYY-MM-DD)')
    .custom((dateTo, { req }) => {
      if (req.query?.dateFrom && dateTo) {
        const from = parseISO(req.query.dateFrom as string);
        const to = parseISO(dateTo);
        return isAfter(to, from) || format(to, 'yyyy-MM-dd') === format(from, 'yyyy-MM-dd');
      }
      return true;
    })
    .withMessage('Date to must be after or equal to date from'),
    
  query('sortBy')
    .optional()
    .isIn(['date', 'time', 'amount', 'status', 'created', 'updated'])
    .withMessage('Sort by must be: date, time, amount, status, created, or updated'),
    
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
    
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters')
    .trim(),
    
  query('providerId')
    .optional()
    .isUUID()
    .withMessage('Provider ID must be a valid UUID'),
    
  query('serviceId')
    .optional()
    .isUUID()
    .withMessage('Service ID must be a valid UUID'),
    
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be a positive number'),
    
  query('maxAmount')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Maximum amount must be between 0 and 1000')
    .custom((maxAmount, { req }) => {
      if (req.query?.minAmount && maxAmount) {
        return parseFloat(maxAmount) >= parseFloat(req.query.minAmount as string);
      }
      return true;
    })
    .withMessage('Maximum amount must be greater than or equal to minimum amount')
];

/**
 * Validation for bulk operations
 */
export const validateBulkBookingOperation: ValidationChain[] = [
  body('bookingIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Booking IDs must be an array with 1-50 items'),
    
  body('bookingIds.*')
    .isUUID()
    .withMessage('Each booking ID must be a valid UUID'),
    
  body('operation')
    .isIn(['cancel', 'confirm', 'complete', 'reschedule'])
    .withMessage('Operation must be: cancel, confirm, complete, or reschedule'),
    
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
    .trim(),
    
  body('newDate')
    .if(body('operation').equals('reschedule'))
    .notEmpty()
    .withMessage('New date is required for reschedule operation')
    .isISO8601()
    .withMessage('Date must be in ISO8601 format')
    .custom(isValidBookingDate)
    .withMessage('New date must be valid for booking'),
    
  body('newTime')
    .if(body('operation').equals('reschedule'))
    .notEmpty()
    .withMessage('New time is required for reschedule operation')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:mm format')
];

/**
 * Validation for booking analytics queries
 */
export const validateAnalyticsQuery: ValidationChain[] = [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('Period must be: day, week, month, quarter, or year'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO8601 format'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO8601 format')
    .custom((endDate, { req }) => {
      if (req.query?.startDate && endDate) {
        const start = parseISO(req.query.startDate as string);
        const end = parseISO(endDate);
        return isAfter(end, start);
      }
      return true;
    })
    .withMessage('End date must be after start date'),
    
  query('providerId')
    .optional()
    .isUUID()
    .withMessage('Provider ID must be a valid UUID'),
    
  query('includeRevenue')
    .optional()
    .isBoolean()
    .withMessage('Include revenue must be a boolean'),
    
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'service', 'provider', 'status'])
    .withMessage('Group by must be: day, week, month, service, provider, or status')
];

/**
 * Validation for checking booking availability
 */
export const validateAvailabilityCheck: ValidationChain[] = [
  body('providerId')
    .notEmpty()
    .withMessage('Provider ID is required')
    .isUUID()
    .withMessage('Provider ID must be a valid UUID'),
    
  body('serviceId')
    .notEmpty()
    .withMessage('Service ID is required')
    .isUUID()
    .withMessage('Service ID must be a valid UUID'),
    
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be in ISO8601 format (YYYY-MM-DD)')
    .custom(isValidBookingDate)
    .withMessage(`Date must be between ${MIN_ADVANCE_HOURS} hours and ${BOOKING_ADVANCE_DAYS} days from now`),
    
  body('time')
    .notEmpty()
    .withMessage('Time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:mm format')
    .custom(isValidBookingTime)
    .withMessage(`Time must be between ${BUSINESS_START_HOUR}:00 and ${BUSINESS_END_HOUR}:00, and at least ${MIN_ADVANCE_HOURS} hours from now`),
    
  body('duration')
    .optional()
    .isInt({ min: 15, max: MAX_BOOKING_DURATION })
    .withMessage(`Duration must be between 15 and ${MAX_BOOKING_DURATION} minutes`),
    
  body('excludeBookingId')
    .optional()
    .isUUID()
    .withMessage('Exclude booking ID must be a valid UUID')
];

/**
 * Validation for booking reminders query
 */
export const validateRemindersQuery: ValidationChain[] = [
  query('days')
    .optional()
    .isInt({ min: 0, max: 7 })
    .withMessage('Days must be between 0 and 7'),
    
  query('hours')
    .optional()
    .isInt({ min: 1, max: 72 })
    .withMessage('Hours must be between 1 and 72'),
    
  query('includeConfirmed')
    .optional()
    .isBoolean()
    .withMessage('Include confirmed must be a boolean'),
    
  query('includePending')
    .optional()
    .isBoolean()
    .withMessage('Include pending must be a boolean'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

export default {
  validateCreateBooking,
  validateUpdateBookingStatus,
  validateRescheduleBooking,
  validateCancelBooking,
  validateBookingQuery,
  validateBulkBookingOperation,
  validateAnalyticsQuery,
  validateAvailabilityCheck,
  validateRemindersQuery
};