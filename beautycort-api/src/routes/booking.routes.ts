import { Router } from 'express';
import { body, query } from 'express-validator';
import { bookingController } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create booking
router.post(
  '/',
  validate([
    body('providerId').notEmpty(),
    body('serviceId').notEmpty(),
    body('date').isISO8601().toDate(),
    body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('notes').optional().isString(),
  ]),
  bookingController.createBooking
);

// Get user's bookings
router.get(
  '/user',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']),
  ]),
  bookingController.getUserBookings
);

// Get provider's bookings
router.get(
  '/provider/:providerId',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']),
    query('date').optional().isISO8601().toDate(),
  ]),
  bookingController.getProviderBookings
);

// Get booking by ID
router.get('/:id', bookingController.getBookingById);

// Update booking status (provider only)
router.patch(
  '/:id/status',
  authorize(UserRole.PROVIDER, UserRole.ADMIN),
  validate([
    body('status').isIn(['confirmed', 'completed', 'cancelled']),
  ]),
  bookingController.updateBookingStatus
);

// Cancel booking
router.post(
  '/:id/cancel',
  validate([
    body('reason').optional().isString(),
  ]),
  bookingController.cancelBooking
);

// Reschedule booking
router.post(
  '/:id/reschedule',
  validate([
    body('date').isISO8601().toDate(),
    body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  ]),
  bookingController.rescheduleBooking
);

// Get booking history
router.get(
  '/:id/history',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  bookingController.getBookingHistory
);

export default router;