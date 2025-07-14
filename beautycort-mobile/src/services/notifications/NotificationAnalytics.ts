import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationDeliveryResult,
  NotificationAnalytics,
  NotificationData,
} from './types';

interface AnalyticsEvent {
  notificationId: string;
  recipientId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  timestamp: Date;
  event: 'sent' | 'delivered' | 'opened' | 'interacted' | 'failed';
  cost?: number;
  error?: string;
  metadata?: any;
}

interface ChannelPerformance {
  channel: NotificationChannel;
  sentCount: number;
  deliveredCount: number;
  deliveryRate: number;
  avgDeliveryTime: number;
  failureRate: number;
  totalCost: number;
}

interface TypePerformance {
  type: NotificationType;
  sentCount: number;
  openRate: number;
  interactionRate: number;
  optOutRate: number;
}

export class NotificationAnalyticsService {
  private static instance: NotificationAnalyticsService;
  private analyticsQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.startFlushInterval();
  }
  
  static getInstance(): NotificationAnalyticsService {
    if (!NotificationAnalyticsService.instance) {
      NotificationAnalyticsService.instance = new NotificationAnalyticsService();
    }
    return NotificationAnalyticsService.instance;
  }
  
  // Track notification sent
  async trackSent(
    notification: NotificationData,
    result: NotificationDeliveryResult
  ): Promise<void> {
    const event: AnalyticsEvent = {
      notificationId: notification.id,
      recipientId: notification.recipientId,
      type: notification.type,
      channel: result.channel,
      priority: notification.priority,
      timestamp: new Date(),
      event: result.status === 'sent' ? 'sent' : 'failed',
      cost: result.cost,
      error: result.error,
    };
    
    await this.addEvent(event);
  }
  
  // Track notification delivered (from webhook or callback)
  async trackDelivered(
    notificationId: string,
    channel: NotificationChannel,
    metadata?: any
  ): Promise<void> {
    const event: AnalyticsEvent = {
      notificationId,
      recipientId: '', // Will be filled from stored data
      type: NotificationType.ANNOUNCEMENT, // Will be filled from stored data
      channel,
      priority: NotificationPriority.MEDIUM, // Will be filled from stored data
      timestamp: new Date(),
      event: 'delivered',
      metadata,
    };
    
    await this.addEvent(event);
  }
  
  // Track notification opened
  async trackOpened(
    notificationId: string,
    recipientId: string,
    channel: NotificationChannel
  ): Promise<void> {
    const event: AnalyticsEvent = {
      notificationId,
      recipientId,
      type: NotificationType.ANNOUNCEMENT, // Will be filled from stored data
      channel,
      priority: NotificationPriority.MEDIUM, // Will be filled from stored data
      timestamp: new Date(),
      event: 'opened',
    };
    
    await this.addEvent(event);
  }
  
  // Track notification interaction
  async trackInteraction(
    notificationId: string,
    recipientId: string,
    action: string,
    metadata?: any
  ): Promise<void> {
    const event: AnalyticsEvent = {
      notificationId,
      recipientId,
      type: NotificationType.ANNOUNCEMENT, // Will be filled from stored data
      channel: NotificationChannel.IN_APP, // Default
      priority: NotificationPriority.MEDIUM, // Will be filled from stored data
      timestamp: new Date(),
      event: 'interacted',
      metadata: { action, ...metadata },
    };
    
    await this.addEvent(event);
  }
  
  // Get analytics for a specific user
  async getUserAnalytics(
    recipientId: string,
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<NotificationAnalytics> {
    const events = await this.getEventsForUser(recipientId, period);
    
    const stats = {
      sent: 0,
      delivered: 0,
      opened: 0,
      interacted: 0,
      byChannel: {} as Record<NotificationChannel, {
        sent: number;
        delivered: number;
        cost: number;
      }>,
      byType: {} as Record<NotificationType, number>,
    };
    
    // Initialize channel stats
    Object.values(NotificationChannel).forEach(channel => {
      stats.byChannel[channel] = { sent: 0, delivered: 0, cost: 0 };
    });
    
    // Initialize type stats
    Object.values(NotificationType).forEach(type => {
      stats.byType[type] = 0;
    });
    
    // Process events
    events.forEach(event => {
      switch (event.event) {
        case 'sent':
          stats.sent++;
          stats.byChannel[event.channel].sent++;
          if (event.cost) {
            stats.byChannel[event.channel].cost += event.cost;
          }
          stats.byType[event.type]++;
          break;
        case 'delivered':
          stats.delivered++;
          stats.byChannel[event.channel].delivered++;
          break;
        case 'opened':
          stats.opened++;
          break;
        case 'interacted':
          stats.interacted++;
          break;
      }
    });
    
    return {
      recipientId,
      period,
      stats,
    };
  }
  
  // Get channel performance metrics
  async getChannelPerformance(
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<ChannelPerformance[]> {
    const events = await this.getAllEvents(period);
    const performance: Map<NotificationChannel, ChannelPerformance> = new Map();
    
    // Initialize performance data
    Object.values(NotificationChannel).forEach(channel => {
      performance.set(channel, {
        channel,
        sentCount: 0,
        deliveredCount: 0,
        deliveryRate: 0,
        avgDeliveryTime: 0,
        failureRate: 0,
        totalCost: 0,
      });
    });
    
    // Track delivery times
    const deliveryTimes: Map<string, { sent: Date; delivered?: Date }> = new Map();
    
    // Process events
    events.forEach(event => {
      const perf = performance.get(event.channel)!;
      
      switch (event.event) {
        case 'sent':
          perf.sentCount++;
          if (event.cost) perf.totalCost += event.cost;
          deliveryTimes.set(event.notificationId, { sent: event.timestamp });
          break;
        case 'delivered':
          perf.deliveredCount++;
          const timing = deliveryTimes.get(event.notificationId);
          if (timing) {
            timing.delivered = event.timestamp;
          }
          break;
        case 'failed':
          perf.failureRate++;
          break;
      }
    });
    
    // Calculate metrics
    performance.forEach((perf, channel) => {
      if (perf.sentCount > 0) {
        perf.deliveryRate = (perf.deliveredCount / perf.sentCount) * 100;
        perf.failureRate = (perf.failureRate / perf.sentCount) * 100;
        
        // Calculate average delivery time
        let totalDeliveryTime = 0;
        let deliveredCount = 0;
        
        deliveryTimes.forEach(timing => {
          if (timing.delivered) {
            totalDeliveryTime += timing.delivered.getTime() - timing.sent.getTime();
            deliveredCount++;
          }
        });
        
        if (deliveredCount > 0) {
          perf.avgDeliveryTime = totalDeliveryTime / deliveredCount / 1000; // Convert to seconds
        }
      }
    });
    
    return Array.from(performance.values());
  }
  
  // Get notification type performance
  async getTypePerformance(
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<TypePerformance[]> {
    const events = await this.getAllEvents(period);
    const performance: Map<NotificationType, TypePerformance> = new Map();
    
    // Initialize performance data
    Object.values(NotificationType).forEach(type => {
      performance.set(type, {
        type,
        sentCount: 0,
        openRate: 0,
        interactionRate: 0,
        optOutRate: 0,
      });
    });
    
    // Track opens and interactions per notification
    const notificationStats: Map<string, {
      type: NotificationType;
      opened: boolean;
      interacted: boolean;
    }> = new Map();
    
    // Process events
    events.forEach(event => {
      if (event.event === 'sent') {
        const perf = performance.get(event.type)!;
        perf.sentCount++;
        notificationStats.set(event.notificationId, {
          type: event.type,
          opened: false,
          interacted: false,
        });
      } else if (event.event === 'opened') {
        const stats = notificationStats.get(event.notificationId);
        if (stats) stats.opened = true;
      } else if (event.event === 'interacted') {
        const stats = notificationStats.get(event.notificationId);
        if (stats) stats.interacted = true;
      }
    });
    
    // Calculate rates
    notificationStats.forEach(stats => {
      const perf = performance.get(stats.type)!;
      if (stats.opened) perf.openRate++;
      if (stats.interacted) perf.interactionRate++;
    });
    
    // Convert counts to percentages
    performance.forEach(perf => {
      if (perf.sentCount > 0) {
        perf.openRate = (perf.openRate / perf.sentCount) * 100;
        perf.interactionRate = (perf.interactionRate / perf.sentCount) * 100;
      }
    });
    
    return Array.from(performance.values());
  }
  
  // Get cost analysis
  async getCostAnalysis(
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<{
    totalCost: number;
    byChannel: Record<NotificationChannel, number>;
    projectedMonthlyCost: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const events = await this.getAllEvents(period);
    const costs: Record<NotificationChannel, number> = {} as any;
    let totalCost = 0;
    
    // Initialize costs
    Object.values(NotificationChannel).forEach(channel => {
      costs[channel] = 0;
    });
    
    // Calculate costs
    events.forEach(event => {
      if (event.event === 'sent' && event.cost) {
        costs[event.channel] += event.cost;
        totalCost += event.cost;
      }
    });
    
    // Calculate projected monthly cost
    const daysInPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const projectedMonthlyCost = (totalCost / daysInPeriod) * 30;
    
    // Determine cost trend (simplified)
    const costTrend = 'stable'; // TODO: Implement trend analysis
    
    return {
      totalCost,
      byChannel: costs,
      projectedMonthlyCost,
      costTrend,
    };
  }
  
  // Private methods
  private async addEvent(event: AnalyticsEvent): Promise<void> {
    this.analyticsQueue.push(event);
    
    // Flush if queue is getting large
    if (this.analyticsQueue.length >= 100) {
      await this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.analyticsQueue.length === 0) return;
    
    const events = [...this.analyticsQueue];
    this.analyticsQueue = [];
    
    try {
      // Store events locally
      await this.storeEvents(events);
      
      // TODO: Send to analytics backend
      // await this.sendToBackend(events);
    } catch (error) {
      console.error('Failed to flush analytics:', error);
      // Re-add events to queue
      this.analyticsQueue.unshift(...events);
    }
  }
  
  private async storeEvents(events: AnalyticsEvent[]): Promise<void> {
    const key = '@notification_analytics';
    const stored = await AsyncStorage.getItem(key);
    const existing = stored ? JSON.parse(stored) : [];
    
    const allEvents = [...existing, ...events];
    
    // Keep only last 10000 events
    if (allEvents.length > 10000) {
      allEvents.splice(0, allEvents.length - 10000);
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(allEvents));
  }
  
  private async getEventsForUser(
    recipientId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<AnalyticsEvent[]> {
    const allEvents = await this.getAllEvents(period);
    return allEvents.filter(event => event.recipientId === recipientId);
  }
  
  private async getAllEvents(
    period: 'day' | 'week' | 'month'
  ): Promise<AnalyticsEvent[]> {
    const key = '@notification_analytics';
    const stored = await AsyncStorage.getItem(key);
    
    if (!stored) return [];
    
    const events: AnalyticsEvent[] = JSON.parse(stored);
    
    // Filter by period
    const now = new Date();
    const cutoff = new Date();
    
    switch (period) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
    }
    
    return events.filter(event => 
      new Date(event.timestamp) >= cutoff
    );
  }
  
  private startFlushInterval(): void {
    // Flush analytics every 5 minutes
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5 * 60 * 1000);
  }
  
  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}