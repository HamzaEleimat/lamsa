/**
 * Notification Controller
 * Handles notification preferences, delivery tracking, and admin management
 */

import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { notificationService, NotificationPreferences } from '../services/notification.service';
import { notificationQueueService } from '../services/notification-queue.service';
import { notificationTemplatesService } from '../services/notification-templates.service';

export class NotificationController {
  /**
   * Get user notification preferences
   */
  async getUserPreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const preferences = await notificationService.getUserPreferences(req.user.id);

      const response: ApiResponse = {
        success: true,
        data: preferences
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to get notification preferences', 500));
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const preferences: Partial<NotificationPreferences> = req.body;

      const success = await notificationService.updateUserPreferences(req.user.id, preferences);

      if (!success) {
        return next(new AppError('Failed to update preferences', 500));
      }

      const response: ApiResponse = {
        success: true,
        message: 'Notification preferences updated successfully'
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to update notification preferences', 500));
    }
  }

  /**
   * Get notification templates (admin only)
   */
  async getTemplates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { event, channel } = req.query;

      let templates;
      if (event && channel) {
        templates = notificationTemplatesService.getTemplate(event as any, channel as any);
      } else if (event) {
        templates = notificationTemplatesService.getTemplatesForEvent(event as any);
      } else {
        templates = notificationTemplatesService.getAllTemplates();
      }

      const response: ApiResponse = {
        success: true,
        data: templates
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to get notification templates', 500));
    }
  }

  /**
   * Get template groups
   */
  async getTemplateGroups(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const groups = notificationTemplatesService.getTemplateGroups();

      const response: ApiResponse = {
        success: true,
        data: groups
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to get template groups', 500));
    }
  }

  /**
   * Preview template rendering
   */
  async previewTemplate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { templateId, language = 'en', data = {} } = req.body;

      if (!templateId) {
        return next(new AppError('Template ID is required', 400));
      }

      const rendered = notificationTemplatesService.renderTemplate(templateId, language, data);

      if (!rendered) {
        return next(new AppError('Template not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        data: rendered
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to preview template', 500));
    }
  }

  /**
   * Send test notification (admin only)
   */
  async sendTestNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, event, data = {}, channels = ['sms'] } = req.body;

      if (!userId || !event) {
        return next(new AppError('User ID and event are required', 400));
      }

      // Get user details for notification
      // TODO: Implement user lookup
      const testRecipient = {
        id: userId,
        type: 'customer' as const,
        phone: '+962781234567', // Test phone
        language: 'en' as const,
        preferences: {
          sms: true,
          push: true,
          websocket: true,
          email: false,
          eventPreferences: {
            bookingCreated: true,
            bookingConfirmed: true,
            bookingCancelled: true,
            bookingRescheduled: true,
            reminders: true,
            payments: true,
            marketing: true
          }
        }
      };

      const notificationData = {
        event,
        recipient: testRecipient,
        data: {
          customerName: 'Test Customer',
          serviceName: 'Test Service',
          bookingDate: '2024-01-15',
          startTime: '14:00',
          providerName: 'Test Provider',
          ...data
        },
        priority: 'normal' as const,
        channels
      };

      const result = await notificationService.sendNotification(notificationData);

      const response: ApiResponse = {
        success: result.success,
        data: result,
        message: result.success ? 'Test notification sent successfully' : 'Failed to send test notification'
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to send test notification', 500));
    }
  }

  /**
   * Get notification queue statistics (admin only)
   */
  async getQueueStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = notificationQueueService.getStats();
      const isHealthy = notificationQueueService.isHealthy();

      const response: ApiResponse = {
        success: true,
        data: {
          ...stats,
          healthy: isHealthy,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to get queue statistics', 500));
    }
  }

  /**
   * Get notification delivery status
   */
  async getNotificationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notificationId } = req.params;

      if (!notificationId) {
        return next(new AppError('Notification ID is required', 400));
      }

      const status = await notificationQueueService.getNotificationStatus(notificationId);

      if (!status) {
        return next(new AppError('Notification not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        data: status
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to get notification status', 500));
    }
  }

  /**
   * Clean up old notifications (admin only)
   */
  async cleanupNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { olderThanDays = 7 } = req.body;

      const cleaned = await notificationQueueService.cleanup(olderThanDays);

      const response: ApiResponse = {
        success: true,
        data: { cleaned },
        message: `Cleaned up ${cleaned} old notifications`
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to cleanup notifications', 500));
    }
  }

  /**
   * Opt out of notifications (public endpoint)
   */
  async optOut(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, email } = req.query;

      if (!phone && !email) {
        return next(new AppError('Phone number or email is required', 400));
      }

      // TODO: Implement opt-out functionality
      // This would typically:
      // 1. Find user by phone/email
      // 2. Update their preferences to disable all notifications
      // 3. Add them to a global opt-out list

      console.log(`Opt-out request for phone: ${phone}, email: ${email}`);

      const response: ApiResponse = {
        success: true,
        message: 'Successfully opted out of notifications'
      };

      res.json(response);
    } catch (error) {
      next(new AppError('Failed to process opt-out request', 500));
    }
  }

  /**
   * Health check for notification system
   */
  async healthCheck(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const queueHealthy = notificationQueueService.isHealthy();
      const stats = notificationQueueService.getStats();

      const health = {
        status: queueHealthy ? 'healthy' : 'unhealthy',
        queue: {
          healthy: queueHealthy,
          stats
        },
        timestamp: new Date().toISOString()
      };

      const response: ApiResponse = {
        success: true,
        data: health
      };

      const statusCode = queueHealthy ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error) {
      next(new AppError('Health check failed', 500));
    }
  }
}

export const notificationController = new NotificationController();