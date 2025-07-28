import { supabase } from './supabase';
import { validateUUID } from '../utils/validation';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'review' | 'system' | 'promotion';
  read: boolean;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface NotificationCount {
  unread: number;
  total: number;
}

export class NotificationService {
  /**
   * Get notification count for a user
   */
  async getNotificationCount(userId: string): Promise<NotificationCount> {
    try {
      // Try to validate as UUID, but use as-is if not valid
      let validatedUserId = userId;
      try {
        validatedUserId = validateUUID(userId, 'userId');
      } catch (error) {
        console.log('Using non-UUID user ID:', userId);
      }

      const { count: unreadCount, error: unreadError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', validatedUserId)
        .eq('read', false);

      const { count: totalCount, error: totalError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', validatedUserId);

      if (unreadError || totalError) {
        console.warn('Error fetching notification count:', unreadError || totalError);
        return { unread: 0, total: 0 };
      }

      return {
        unread: unreadCount || 0,
        total: totalCount || 0
      };
    } catch (error) {
      console.error('Error in getNotificationCount:', error);
      return { unread: 0, total: 0 };
    }
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    }
  ): Promise<Notification[]> {
    try {
      let validatedUserId = userId;
      try {
        validatedUserId = validateUUID(userId, 'userId');
      } catch (error) {
        console.log('Using non-UUID user ID:', userId);
      }

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', validatedUserId)
        .order('created_at', { ascending: false });

      if (options?.unreadOnly) {
        query = query.eq('read', false);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const validatedId = validateUUID(notificationId, 'notificationId');

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      let validatedUserId = userId;
      try {
        validatedUserId = validateUUID(userId, 'userId');
      } catch (error) {
        console.log('Using non-UUID user ID:', userId);
      }

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', validatedUserId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const validatedId = validateUUID(notificationId, 'notificationId');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', validatedId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ) {
    let validatedUserId = userId;
    try {
      validatedUserId = validateUUID(userId, 'userId');
    } catch (error) {
      console.log('Using non-UUID user ID:', userId);
    }

    const subscription = supabase
      .channel(`notifications:${validatedUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${validatedUserId}`
        },
        (payload) => {
          onNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return subscription;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();