/**
 * WebSocket Notification Service
 * Handles real-time notifications via WebSocket connections
 */

import { logger } from '../utils/logger';
import { NotificationRecipient } from './notification.service';

export interface WebSocketSendResult {
  success: boolean;
  error?: string;
  externalId?: string;
}

export class WebSocketNotificationService {
  private static instance: WebSocketNotificationService;
  private realtimeService: any; // Will be injected

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WebSocketNotificationService {
    if (!WebSocketNotificationService.instance) {
      WebSocketNotificationService.instance = new WebSocketNotificationService();
    }
    return WebSocketNotificationService.instance;
  }

  /**
   * Set the realtime service for WebSocket notifications
   */
  setRealtimeService(realtimeService: any): void {
    this.realtimeService = realtimeService;
    logger.info('WebSocket realtime service configured');
  }

  /**
   * Send WebSocket notification to a specific user
   */
  async sendToUser(
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string
  ): Promise<WebSocketSendResult> {
    try {
      if (!this.realtimeService) {
        return { success: false, error: 'WebSocket service not available' };
      }

      const payload = {
        id: notificationId,
        type: 'notification',
        title: content.title,
        message: content.body,
        timestamp: new Date().toISOString(),
        priority: 'normal',
        actionRequired: false,
        recipient: {
          id: recipient.id,
          type: recipient.type
        }
      };

      // Send to specific user via WebSocket
      await this.realtimeService.sendToUser(recipient.id, payload);

      logger.info(`WebSocket notification sent to user ${recipient.id}: ${notificationId}`);
      return { success: true, externalId: notificationId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'WebSocket sending failed';
      logger.error(`WebSocket notification failed for user ${recipient.id}:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send WebSocket notification to a room/group
   */
  async sendToRoom(
    roomId: string,
    content: { title: string; body: string },
    notificationId: string,
    metadata?: Record<string, any>
  ): Promise<WebSocketSendResult> {
    try {
      if (!this.realtimeService) {
        return { success: false, error: 'WebSocket service not available' };
      }

      const payload = {
        id: notificationId,
        type: 'notification',
        title: content.title,
        message: content.body,
        timestamp: new Date().toISOString(),
        priority: 'normal',
        actionRequired: false,
        roomId,
        metadata
      };

      // Send to room via WebSocket
      await this.realtimeService.sendToRoom(roomId, payload);

      logger.info(`WebSocket notification sent to room ${roomId}: ${notificationId}`);
      return { success: true, externalId: notificationId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'WebSocket room sending failed';
      logger.error(`WebSocket notification failed for room ${roomId}:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Broadcast WebSocket notification to all connected users
   */
  async broadcast(
    content: { title: string; body: string },
    notificationId: string,
    metadata?: Record<string, any>
  ): Promise<WebSocketSendResult> {
    try {
      if (!this.realtimeService) {
        return { success: false, error: 'WebSocket service not available' };
      }

      const payload = {
        id: notificationId,
        type: 'broadcast',
        title: content.title,
        message: content.body,
        timestamp: new Date().toISOString(),
        priority: 'normal',
        actionRequired: false,
        metadata
      };

      // Broadcast to all connected users
      await this.realtimeService.broadcast(payload);

      logger.info(`WebSocket notification broadcasted: ${notificationId}`);
      return { success: true, externalId: notificationId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'WebSocket broadcast failed';
      logger.error('WebSocket broadcast notification failed:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send typing indicator to a user
   */
  async sendTypingIndicator(
    userId: string,
    isTyping: boolean,
    conversationId?: string
  ): Promise<WebSocketSendResult> {
    try {
      if (!this.realtimeService) {
        return { success: false, error: 'WebSocket service not available' };
      }

      const payload = {
        type: 'typing_indicator',
        isTyping,
        conversationId,
        timestamp: new Date().toISOString()
      };

      await this.realtimeService.sendToUser(userId, payload);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Typing indicator failed'
      };
    }
  }

  /**
   * Send presence update (user online/offline status)
   */
  async sendPresenceUpdate(
    userId: string,
    status: 'online' | 'offline' | 'away',
    metadata?: Record<string, any>
  ): Promise<WebSocketSendResult> {
    try {
      if (!this.realtimeService) {
        return { success: false, error: 'WebSocket service not available' };
      }

      const payload = {
        type: 'presence_update',
        status,
        userId,
        timestamp: new Date().toISOString(),
        metadata
      };

      await this.realtimeService.broadcast(payload);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Presence update failed'
      };
    }
  }

  /**
   * Get WebSocket service status
   */
  getServiceStatus(): { available: boolean; connected: boolean; activeConnections?: number } {
    const available = !!this.realtimeService;
    let connected = false;
    let activeConnections: number | undefined;

    if (this.realtimeService) {
      // Try to get connection status from the realtime service
      try {
        connected = this.realtimeService.isConnected?.() ?? true;
        activeConnections = this.realtimeService.getActiveConnections?.() ?? undefined;
      } catch (error) {
        // Ignore errors when getting status
        connected = true; // Assume connected if service is available
      }
    }

    return {
      available,
      connected,
      activeConnections
    };
  }

  /**
   * Check if a user is currently connected
   */
  async isUserConnected(userId: string): Promise<boolean> {
    try {
      if (!this.realtimeService) {
        return false;
      }

      return this.realtimeService.isUserConnected?.(userId) ?? false;

    } catch (error) {
      logger.error(`Error checking user connection status for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    try {
      if (!this.realtimeService) {
        return 0;
      }

      return this.realtimeService.getConnectedUsersCount?.() ?? 0;

    } catch (error) {
      logger.error('Error getting connected users count:', error);
      return 0;
    }
  }

  /**
   * Join a user to a specific room
   */
  async joinRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      if (!this.realtimeService) {
        return false;
      }

      await this.realtimeService.joinRoom?.(userId, roomId);
      logger.info(`User ${userId} joined room ${roomId}`);
      return true;

    } catch (error) {
      logger.error(`Error joining user ${userId} to room ${roomId}:`, error);
      return false;
    }
  }

  /**
   * Remove a user from a specific room
   */
  async leaveRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      if (!this.realtimeService) {
        return false;
      }

      await this.realtimeService.leaveRoom?.(userId, roomId);
      logger.info(`User ${userId} left room ${roomId}`);
      return true;

    } catch (error) {
      logger.error(`Error removing user ${userId} from room ${roomId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const websocketNotificationService = WebSocketNotificationService.getInstance();