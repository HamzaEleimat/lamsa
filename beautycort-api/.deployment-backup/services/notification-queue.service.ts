/**
 * Notification Queue Service
 * Handles asynchronous notification processing with Redis/memory fallback
 * Provides priority queuing, retry logic, and batch processing
 */

import { getEnvironmentConfig } from '../utils/environment-validation';
import { NotificationData, NotificationService } from './notification.service';

export interface QueuedNotification {
  id: string;
  data: NotificationData;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  createdAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  error?: string;
}

export interface QueueConfig {
  maxRetries: number;
  retryDelay: number; // Base delay in milliseconds
  maxDelay: number;   // Maximum delay in milliseconds
  batchSize: number;
  processingInterval: number; // How often to check queue in milliseconds
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
}

export class NotificationQueueService {
  private static instance: NotificationQueueService;
  private queue: Map<string, QueuedNotification> = new Map();
  private priorityQueues: Map<string, string[]> = new Map();
  private processing: Set<string> = new Set();
  private config: QueueConfig;
  private processingInterval: NodeJS.Timeout | null = null;
  private isRedisAvailable: boolean = false;
  private redis: any = null;
  private notificationService: NotificationService;
  private stats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalProcessed: 0,
    averageProcessingTime: 0
  };

  private constructor() {
    this.config = {
      maxRetries: 5,
      retryDelay: 30000,     // 30 seconds
      maxDelay: 3600000,     // 1 hour
      batchSize: 10,
      processingInterval: 5000 // 5 seconds
    };

    this.notificationService = NotificationService.getInstance();
    this.initializePriorityQueues();
    this.initializeRedis();
    this.startProcessing();
  }

  static getInstance(): NotificationQueueService {
    if (!NotificationQueueService.instance) {
      NotificationQueueService.instance = new NotificationQueueService();
    }
    return NotificationQueueService.instance;
  }

  /**
   * Add notification to queue
   */
  async enqueue(data: NotificationData, priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal'): Promise<string> {
    const notificationId = this.generateId();
    const queuedNotification: QueuedNotification = {
      id: notificationId,
      data,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      createdAt: new Date(),
      status: 'pending'
    };

    try {
      if (this.isRedisAvailable) {
        await this.enqueueToRedis(queuedNotification, priority);
      } else {
        this.enqueueToMemory(queuedNotification, priority);
      }

      this.updateStats('pending', 1);
      console.log(`Notification ${notificationId} queued with priority ${priority}`);
      
      return notificationId;
    } catch (error) {
      console.error('Failed to enqueue notification:', error);
      throw new Error('Failed to queue notification');
    }
  }

  /**
   * Process notifications in queue
   */
  private async processQueue(): Promise<void> {
    try {
      const batch = await this.dequeueBatch();
      if (batch.length === 0) {
        return;
      }

      console.log(`Processing batch of ${batch.length} notifications`);

      // Process notifications concurrently
      const promises = batch.map(notification => this.processNotification(notification));
      await Promise.allSettled(promises);

    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  /**
   * Process a single notification
   */
  private async processNotification(notification: QueuedNotification): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Mark as processing
      notification.status = 'processing';
      notification.attempts++;
      this.processing.add(notification.id);
      this.updateStats('processing', 1);
      this.updateStats('pending', -1);

      await this.updateNotificationStatus(notification);

      // Send notification
      const result = await this.notificationService.sendNotification(notification.data);

      if (result.success) {
        // Success - mark as completed
        notification.status = 'completed';
        notification.processedAt = new Date();
        
        this.updateStats('completed', 1);
        this.updateStats('processing', -1);
        this.updateStats('totalProcessed', 1);
        
        const processingTime = Date.now() - startTime;
        this.updateAverageProcessingTime(processingTime);

        console.log(`Notification ${notification.id} processed successfully`);
      } else {
        // Failed - check if we should retry
        await this.handleNotificationFailure(notification, result.error || 'Unknown error');
      }

    } catch (error) {
      await this.handleNotificationFailure(notification, error instanceof Error ? error.message : 'Processing error');
    } finally {
      this.processing.delete(notification.id);
      await this.updateNotificationStatus(notification);
    }
  }

  /**
   * Handle notification failure with retry logic
   */
  private async handleNotificationFailure(notification: QueuedNotification, error: string): Promise<void> {
    notification.error = error;

    if (notification.attempts >= notification.maxAttempts) {
      // Max attempts reached - mark as failed
      notification.status = 'failed';
      this.updateStats('failed', 1);
      this.updateStats('processing', -1);
      
      console.error(`Notification ${notification.id} failed permanently after ${notification.attempts} attempts: ${error}`);
    } else {
      // Schedule retry with exponential backoff
      const delay = this.calculateRetryDelay(notification.attempts);
      notification.nextRetryAt = new Date(Date.now() + delay);
      notification.status = 'pending';
      
      this.updateStats('pending', 1);
      this.updateStats('processing', -1);

      // Re-queue for retry
      if (this.isRedisAvailable) {
        await this.scheduleRetryInRedis(notification);
      } else {
        this.scheduleRetryInMemory(notification);
      }

      console.log(`Notification ${notification.id} scheduled for retry in ${delay}ms (attempt ${notification.attempts}/${notification.maxAttempts})`);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, attempt - 1),
      this.config.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();
    return Math.floor(delay + jitter);
  }

  /**
   * Get ready notifications from queue
   */
  private async dequeueBatch(): Promise<QueuedNotification[]> {
    const batch: QueuedNotification[] = [];
    const now = new Date();

    try {
      if (this.isRedisAvailable) {
        return await this.dequeueBatchFromRedis(now);
      } else {
        return this.dequeueBatchFromMemory(now);
      }
    } catch (error) {
      console.error('Error dequeuing batch:', error);
      return [];
    }
  }

  /**
   * Memory-based queue operations
   */
  private enqueueToMemory(notification: QueuedNotification, priority: string): void {
    this.queue.set(notification.id, notification);
    
    if (!this.priorityQueues.has(priority)) {
      this.priorityQueues.set(priority, []);
    }
    
    this.priorityQueues.get(priority)!.push(notification.id);
  }

  private dequeueBatchFromMemory(now: Date): QueuedNotification[] {
    const batch: QueuedNotification[] = [];
    const priorities = ['urgent', 'high', 'normal', 'low'];

    for (const priority of priorities) {
      const queue = this.priorityQueues.get(priority) || [];
      const ready: string[] = [];

      for (const id of queue) {
        if (batch.length >= this.config.batchSize) break;
        
        const notification = this.queue.get(id);
        if (!notification) continue;

        // Skip if already processing
        if (this.processing.has(id)) continue;

        // Check if ready for processing
        if (notification.status === 'pending') {
          if (!notification.nextRetryAt || notification.nextRetryAt <= now) {
            batch.push(notification);
            ready.push(id);
          }
        }
      }

      // Remove processed items from priority queue
      if (ready.length > 0) {
        const newQueue = queue.filter(id => !ready.includes(id));
        this.priorityQueues.set(priority, newQueue);
      }
    }

    return batch;
  }

  private scheduleRetryInMemory(notification: QueuedNotification): void {
    const priority = notification.data.priority === 'urgent' ? 'high' : notification.data.priority;
    
    if (!this.priorityQueues.has(priority)) {
      this.priorityQueues.set(priority, []);
    }
    
    this.priorityQueues.get(priority)!.push(notification.id);
  }

  /**
   * Redis-based queue operations (placeholder for Redis integration)
   */
  private async initializeRedis(): Promise<void> {
    try {
      const envConfig = getEnvironmentConfig();
      
      if (envConfig.REDIS_URL || envConfig.REDIS_HOST) {
        // TODO: Initialize Redis client
        // this.redis = new Redis(envConfig.REDIS_URL || { host: envConfig.REDIS_HOST, port: envConfig.REDIS_PORT });
        // this.isRedisAvailable = true;
        console.log('Redis not implemented yet, using memory queue');
      } else {
        console.log('Redis not configured, using memory queue');
      }
    } catch (error) {
      console.log('Redis initialization failed, falling back to memory queue:', error);
      this.isRedisAvailable = false;
    }
  }

  private async enqueueToRedis(notification: QueuedNotification, priority: string): Promise<void> {
    // TODO: Implement Redis queuing
    // await this.redis.lpush(`queue:${priority}`, JSON.stringify(notification));
    // await this.redis.set(`notification:${notification.id}`, JSON.stringify(notification));
    
    // Fallback to memory for now
    this.enqueueToMemory(notification, priority);
  }

  private async dequeueBatchFromRedis(now: Date): Promise<QueuedNotification[]> {
    // TODO: Implement Redis dequeuing
    // For now, fallback to memory
    return this.dequeueBatchFromMemory(now);
  }

  private async scheduleRetryInRedis(notification: QueuedNotification): Promise<void> {
    // TODO: Implement Redis retry scheduling
    // For now, fallback to memory
    this.scheduleRetryInMemory(notification);
  }

  private async updateNotificationStatus(notification: QueuedNotification): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      // TODO: Update in Redis
      // await this.redis.set(`notification:${notification.id}`, JSON.stringify(notification));
    }
    
    // Always update in memory for consistency
    this.queue.set(notification.id, notification);
  }

  /**
   * Initialize priority queues
   */
  private initializePriorityQueues(): void {
    const priorities = ['urgent', 'high', 'normal', 'low'];
    priorities.forEach(priority => {
      this.priorityQueues.set(priority, []);
    });
  }

  /**
   * Start queue processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processQueue().catch(console.error);
    }, this.config.processingInterval);

    console.log(`Notification queue processing started (interval: ${this.config.processingInterval}ms)`);
  }

  /**
   * Stop queue processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('Notification queue processing stopped');
  }

  /**
   * Update statistics
   */
  private updateStats(metric: keyof QueueStats, delta: number): void {
    this.stats[metric] = (this.stats[metric] as number) + delta;
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const total = this.stats.totalProcessed;
    if (total === 1) {
      this.stats.averageProcessingTime = processingTime;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (total - 1) + processingTime) / total;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(notificationId: string): Promise<QueuedNotification | null> {
    if (this.isRedisAvailable && this.redis) {
      // TODO: Get from Redis
      // const data = await this.redis.get(`notification:${notificationId}`);
      // return data ? JSON.parse(data) : null;
    }
    
    return this.queue.get(notificationId) || null;
  }

  /**
   * Clear completed and failed notifications older than specified days
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [id, notification] of this.queue.entries()) {
      if ((notification.status === 'completed' || notification.status === 'failed') &&
          notification.createdAt < cutoffDate) {
        this.queue.delete(id);
        cleaned++;
      }
    }

    console.log(`Cleaned up ${cleaned} old notifications`);
    return cleaned;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Health check
   */
  isHealthy(): boolean {
    return this.processingInterval !== null && !this.hasStuckNotifications();
  }

  /**
   * Check for stuck notifications
   */
  private hasStuckNotifications(): boolean {
    const stuckThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    for (const notificationId of this.processing) {
      const notification = this.queue.get(notificationId);
      if (notification && notification.status === 'processing') {
        const processingTime = now - notification.createdAt.getTime();
        if (processingTime > stuckThreshold) {
          console.warn(`Stuck notification detected: ${notificationId}`);
          return true;
        }
      }
    }

    return false;
  }
}

export const notificationQueueService = NotificationQueueService.getInstance();