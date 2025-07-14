import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../services/notifications/NotificationService';
import { NotificationData } from '../services/notifications/types';
import { useAuth } from './AuthContext';

interface InAppNotification extends NotificationData {
  receivedAt: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  loading: boolean;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  
  // Real-time
  addNotification: (notification: NotificationData) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const notificationService = NotificationService.getInstance();

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id]);

  // Update unread count when notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const key = `@notifications_${user.id}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const notifs = JSON.parse(stored);
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotifications = async (notifs: InAppNotification[]) => {
    if (!user?.id) return;

    const key = `@notifications_${user.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(notifs));
    setNotifications(notifs);
  };

  const markAsRead = async (notificationId: string) => {
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    await saveNotifications(updated);
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    await saveNotifications(updated);
  };

  const deleteNotification = async (notificationId: string) => {
    const updated = notifications.filter(n => n.id !== notificationId);
    await saveNotifications(updated);
  };

  const clearAll = async () => {
    await saveNotifications([]);
  };

  const refreshNotifications = async () => {
    await loadNotifications();
  };

  const addNotification = (notification: NotificationData) => {
    const inAppNotif: InAppNotification = {
      ...notification,
      receivedAt: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [inAppNotif, ...prev]);
    
    // Save to storage
    if (user?.id) {
      const key = `@notifications_${user.id}`;
      AsyncStorage.setItem(key, JSON.stringify([inAppNotif, ...notifications]));
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refreshNotifications,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Hook for notification badge
export const useNotificationBadge = () => {
  const { unreadCount } = useNotifications();
  
  return {
    count: unreadCount,
    visible: unreadCount > 0,
    displayCount: unreadCount > 99 ? '99+' : unreadCount.toString(),
  };
};