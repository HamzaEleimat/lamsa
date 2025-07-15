/**
 * Notification Routes
 * Handles notification preferences, templates, and delivery tracking
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { notificationController } from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();

// ====================================
// PUBLIC ROUTES
// ====================================

// Opt-out from notifications (no authentication required)
router.get(
  '/opt-out',
  validate([
    query('phone').optional().isString().withMessage('Phone must be a string'),
    query('email').optional().isEmail().withMessage('Email must be valid'),
  ]),
  notificationController.optOut
);

// Health check for notification system
router.get('/health', notificationController.healthCheck);

// ====================================
// AUTHENTICATED ROUTES
// ====================================

// All routes below require authentication
router.use(authenticate);

// Get user notification preferences
router.get('/preferences', notificationController.getUserPreferences);

// Update user notification preferences
router.put(
  '/preferences',
  validate([
    body('sms').optional().isBoolean().withMessage('SMS preference must be boolean'),
    body('push').optional().isBoolean().withMessage('Push preference must be boolean'),
    body('websocket').optional().isBoolean().withMessage('WebSocket preference must be boolean'),
    body('email').optional().isBoolean().withMessage('Email preference must be boolean'),
    body('quietHours').optional().isObject().withMessage('Quiet hours must be an object'),
    body('quietHours.start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:mm format'),
    body('quietHours.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:mm format'),
    body('eventPreferences').optional().isObject().withMessage('Event preferences must be an object'),
    body('eventPreferences.bookingCreated').optional().isBoolean(),
    body('eventPreferences.bookingConfirmed').optional().isBoolean(),
    body('eventPreferences.bookingCancelled').optional().isBoolean(),
    body('eventPreferences.bookingRescheduled').optional().isBoolean(),
    body('eventPreferences.reminders').optional().isBoolean(),
    body('eventPreferences.payments').optional().isBoolean(),
    body('eventPreferences.marketing').optional().isBoolean(),
  ]),
  notificationController.updateUserPreferences
);

// Get notification delivery status
router.get(
  '/status/:notificationId',
  validate([
    param('notificationId').notEmpty().withMessage('Notification ID is required'),
  ]),
  notificationController.getNotificationStatus
);

// ====================================
// ADMIN ROUTES
// ====================================

// Get notification templates
router.get(
  '/templates',
  authorize(UserRole.ADMIN),
  validate([
    query('event').optional().isIn([
      'booking_created',
      'booking_confirmed', 
      'booking_cancelled',
      'booking_rescheduled',
      'booking_reminder',
      'payment_processed',
      'payment_failed',
      'review_request'
    ]).withMessage('Invalid event type'),
    query('channel').optional().isIn(['sms', 'websocket', 'push', 'email']).withMessage('Invalid channel type'),
  ]),
  notificationController.getTemplates
);

// Get template groups
router.get(
  '/template-groups',
  authorize(UserRole.ADMIN),
  notificationController.getTemplateGroups
);

// Preview template rendering
router.post(
  '/templates/preview',
  authorize(UserRole.ADMIN),
  validate([
    body('templateId').notEmpty().withMessage('Template ID is required'),
    body('language').optional().isIn(['ar', 'en']).withMessage('Language must be ar or en'),
    body('data').optional().isObject().withMessage('Data must be an object'),
  ]),
  notificationController.previewTemplate
);

// Send test notification
router.post(
  '/test',
  authorize(UserRole.ADMIN),
  validate([
    body('userId').notEmpty().withMessage('User ID is required'),
    body('event').isIn([
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'booking_rescheduled',
      'booking_reminder',
      'payment_processed',
      'payment_failed',
      'review_request'
    ]).withMessage('Invalid event type'),
    body('data').optional().isObject().withMessage('Data must be an object'),
    body('channels').optional().isArray().withMessage('Channels must be an array'),
    body('channels.*').optional().isIn(['sms', 'websocket', 'push', 'email']).withMessage('Invalid channel'),
  ]),
  notificationController.sendTestNotification
);

// Get notification queue statistics
router.get(
  '/queue/stats',
  authorize(UserRole.ADMIN),
  notificationController.getQueueStats
);

// Clean up old notifications
router.post(
  '/cleanup',
  authorize(UserRole.ADMIN),
  validate([
    body('olderThanDays').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  ]),
  notificationController.cleanupNotifications
);

export default router;