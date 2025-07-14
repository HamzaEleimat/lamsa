import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { realtimeService } from '../services/realtime.service';

export class RealtimeController {

  // Get real-time connection status
  async getConnectionStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      const clients = realtimeService.getProviderClients(providerId);
      const isConnected = clients.length > 0;

      const response: ApiResponse = {
        success: true,
        data: {
          isConnected,
          activeConnections: clients.length,
          lastConnection: clients.length > 0 ? Math.max(...clients.map(c => c.lastHeartbeat.getTime())) : null,
          totalClients: realtimeService.getConnectedClientsCount()
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Send system announcement (admin endpoint)
  async sendSystemAnnouncement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, titleAr, message, messageAr, priority = 'medium' } = req.body;
      
      if (!title || !message) {
        throw new AppError('Title and message are required', 400);
      }

      realtimeService.broadcastSystemAnnouncement({
        title,
        titleAr: titleAr || title,
        message,
        messageAr: messageAr || message,
        priority
      });

      const response: ApiResponse = {
        success: true,
        message: 'System announcement sent successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Send custom notification to provider
  async sendNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId, type, title, titleAr, message, messageAr, data, priority = 'medium' } = req.body;
      
      if (!providerId || !title || !message) {
        throw new AppError('Provider ID, title, and message are required', 400);
      }

      const notification = {
        id: `custom_${Date.now()}`,
        type: type || 'system',
        title,
        titleAr: titleAr || title,
        message,
        messageAr: messageAr || message,
        data: data || {},
        priority,
        timestamp: new Date().toISOString()
      };

      realtimeService.sendNotification(providerId, notification);

      const response: ApiResponse = {
        success: true,
        message: 'Notification sent successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Trigger metrics update
  async triggerMetricsUpdate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      await realtimeService.sendMetricsUpdate(providerId);

      const response: ApiResponse = {
        success: true,
        message: 'Metrics update sent successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get WebSocket connection info
  async getWebSocketInfo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          endpoint: '/ws',
          protocol: 'ws',
          supportedEvents: [
            'metrics_update',
            'notification', 
            'level_update',
            'goal_completed',
            'achievement_earned',
            'booking_update',
            'review_update',
            'system'
          ],
          messageTypes: {
            client: [
              'authenticate',
              'subscribe', 
              'unsubscribe',
              'heartbeat'
            ],
            server: [
              'connection',
              'authenticated',
              'subscribed',
              'unsubscribed',
              'heartbeat_ack',
              'metrics_update',
              'notification',
              'level_update',
              'error'
            ]
          },
          authenticationRequired: true,
          heartbeatInterval: 30000,
          connectionTimeout: 60000
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Test real-time functionality (development endpoint)
  async testRealtimeFunction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { testType, providerId: targetProviderId } = req.body;
      const providerId = targetProviderId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      switch (testType) {
        case 'booking':
          await realtimeService.handleNewBooking({
            id: 'test_booking_123',
            provider_id: providerId,
            customer_name: 'Test Customer',
            service_name: 'Test Service',
            service_name_ar: 'خدمة تجريبية',
            booking_date: new Date().toISOString().split('T')[0],
            start_time: '14:00'
          });
          break;

        case 'review':
          await realtimeService.handleNewReview({
            id: 'test_review_123',
            provider_id: providerId,
            customer_name: 'Test Customer',
            service_name: 'Test Service',
            rating: 5,
            response: null
          });
          break;

        case 'achievement':
          await realtimeService.handleAchievementEarned(providerId, {
            id: 'test_achievement_123',
            name: 'Test Achievement',
            name_ar: 'إنجاز تجريبي',
            points: 100,
            level: 1
          });
          break;

        case 'metrics':
          await realtimeService.sendMetricsUpdate(providerId);
          break;

        default:
          throw new AppError('Invalid test type', 400);
      }

      const response: ApiResponse = {
        success: true,
        message: `Test ${testType} event sent successfully`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get real-time statistics
  async getRealtimeStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const totalConnections = realtimeService.getConnectedClientsCount();

      const response: ApiResponse = {
        success: true,
        data: {
          totalConnections,
          serverUptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const realtimeController = new RealtimeController();