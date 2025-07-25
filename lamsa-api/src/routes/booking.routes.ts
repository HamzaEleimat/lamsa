import { Router } from 'express';
import { param, query } from 'express-validator';
import { bookingController } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { enhancedValidate } from '../middleware/enhanced-error.middleware';
import { UserRole } from '../types';
import {
  validateCreateBooking,
  validateUpdateBookingStatus,
  validateRescheduleBooking,
  validateCancelBooking,
  validateBookingQuery,
  validateBulkBookingOperation,
  validateAnalyticsQuery,
  validateAvailabilityCheck,
  validateRemindersQuery
} from '../middleware/booking-validation.middleware';
import {
  bookingCreationLimiter,
  bookingCancellationLimiter,
  bookingRescheduleLimiter,
  bulkOperationLimiter,
  generalBookingLimiter,
  suspiciousActivityDetector
} from '../middleware/booking-rate-limit.middleware';
import {
  bookingRequestLogger,
  bookingErrorTracker,
  bookingPerformanceMonitor,
  bookingAuditLogger,
  bookingHealthCheck
} from '../middleware/booking-monitoring.middleware';
import {
  bookingCacheMiddleware,
  bookingCacheInvalidator,
  bookingCacheManager,
  CACHE_CONFIG
} from '../middleware/booking-cache.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Apply monitoring and logging middleware
router.use(bookingRequestLogger);
router.use(bookingPerformanceMonitor);
router.use(bookingAuditLogger);

// Apply caching middleware
router.use(bookingCacheInvalidator);

// Apply general rate limiting and suspicious activity detection
router.use(generalBookingLimiter);
router.use(suspiciousActivityDetector);

// Create booking
router.post(
  '/',
  bookingCreationLimiter,
  ...validateCreateBooking,
  enhancedValidate,
  bookingController.createBooking
);

// Get user's bookings
router.get(
  '/user',
  bookingCacheMiddleware(CACHE_CONFIG.SHORT_TTL),
  ...validateBookingQuery,
  enhancedValidate,
  bookingController.getUserBookings
);

// Get provider's bookings
router.get(
  '/provider/:providerId',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  bookingCacheMiddleware(CACHE_CONFIG.SHORT_TTL),
  param('providerId').isUUID().withMessage('Provider ID must be a valid UUID'),
  ...validateBookingQuery,
  enhancedValidate,
  bookingController.getProviderBookings
);

// Get booking by ID
router.get(
  '/:id',
  param('id').isUUID().withMessage('Booking ID must be a valid UUID'),
  enhancedValidate,
  bookingController.getBookingById
);

// Update booking status (provider only)
router.patch(
  '/:id/status',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  ...validateUpdateBookingStatus,
  enhancedValidate,
  bookingController.updateBookingStatus
);

// Cancel booking
router.post(
  '/:id/cancel',
  bookingCancellationLimiter,
  ...validateCancelBooking,
  enhancedValidate,
  bookingController.cancelBooking
);

// Reschedule booking
router.post(
  '/:id/reschedule',
  bookingRescheduleLimiter,
  ...validateRescheduleBooking,
  enhancedValidate,
  bookingController.rescheduleBooking
);

// Get booking history
router.get(
  '/:id/history',
  param('id').isUUID().withMessage('Booking ID must be a valid UUID'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  enhancedValidate,
  bookingController.getBookingHistory
);

// ===========================================
// ENHANCED ENDPOINTS
// ===========================================

// Search bookings with advanced filters
router.get(
  '/search',
  bookingCacheMiddleware(CACHE_CONFIG.DEFAULT_TTL),
  ...validateBookingQuery,
  enhancedValidate,
  bookingController.searchBookings
);

// Bulk booking operations (admin/provider only)
router.post(
  '/bulk',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  bulkOperationLimiter,
  ...validateBulkBookingOperation,
  enhancedValidate,
  bookingController.bulkOperation
);

// Get booking analytics (admin/provider only)
router.get(
  '/analytics/stats',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  bookingCacheMiddleware(CACHE_CONFIG.LONG_TTL),
  ...validateAnalyticsQuery,
  enhancedValidate,
  bookingController.getBookingAnalytics
);

// Get booking revenue analytics (admin only)
router.get(
  '/analytics/revenue',
  authorize(UserRole.ADMIN),
  bookingCacheMiddleware(CACHE_CONFIG.LONG_TTL),
  ...validateAnalyticsQuery,
  enhancedValidate,
  bookingController.getRevenueAnalytics
);

// Export bookings to CSV (admin/provider only)
router.get(
  '/export/csv',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  ...validateBookingQuery,
  enhancedValidate,
  bookingController.exportBookingsCSV
);

// ===========================================
// ADDITIONAL SPECIALIZED ENDPOINTS
// ===========================================

// Check booking availability
router.post(
  '/check-availability',
  ...validateAvailabilityCheck,
  enhancedValidate,
  bookingController.checkAvailability
);

// Get booking reminders
router.get(
  '/reminders',
  bookingCacheMiddleware(CACHE_CONFIG.SHORT_TTL),
  ...validateRemindersQuery,
  enhancedValidate,
  bookingController.getBookingReminders
);

// Get booking dashboard data
router.get(
  '/dashboard',
  bookingCacheMiddleware(CACHE_CONFIG.DEFAULT_TTL),
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  enhancedValidate,
  bookingController.getBookingDashboard
);

// Booking system health check
router.get('/health', bookingHealthCheck);

// Cache management endpoint (admin only)
router.get('/cache/stats', authorize(UserRole.ADMIN), (req, res) => {
  res.json({
    success: true,
    data: bookingCacheManager.getStats()
  });
});

router.delete('/cache', authorize(UserRole.ADMIN), (req, res) => {
  bookingCacheManager.clearAll();
  res.json({
    success: true,
    message: 'Cache cleared successfully'
  });
});

// Add error tracking middleware
router.use(bookingErrorTracker);

export default router;