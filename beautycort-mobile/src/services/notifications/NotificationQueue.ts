import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationData,
  NotificationBatch,
  NotificationPriority,
} from './types';

const QUEUE_KEY = '@notification_queue';
const BATCH_KEY_PREFIX = '@notification_batch_';

export class NotificationQueue {
  private static instance: NotificationQueue;
  private queue: NotificationData[] = [];
  private batches: Map<string, NotificationBatch> = new Map();
  private processing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.loadQueue();
  }

  static getInstance(): NotificationQueue {
    if (!NotificationQueue.instance) {
      NotificationQueue.instance = new NotificationQueue();
    }
    return NotificationQueue.instance;
  }

  // Load queue from storage
  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notification queue:', error);
    }
  }

  // Save queue to storage
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving notification queue:', error);
    }
  }

  // Add notification to queue
  async enqueue(notification: NotificationData): Promise<void> {
    // Insert based on priority
    const insertIndex = this.findInsertIndex(notification.priority);
    this.queue.splice(insertIndex, 0, notification);
    await this.saveQueue();
  }

  // Find correct position for priority-based insertion
  private findInsertIndex(priority: NotificationPriority): number {
    const priorityOrder = {
      [NotificationPriority.CRITICAL]: 0,
      [NotificationPriority.HIGH]: 1,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.LOW]: 3,
    };

    const targetPriority = priorityOrder[priority];

    for (let i = 0; i < this.queue.length; i++) {
      const currentPriority = priorityOrder[this.queue[i].priority];
      if (currentPriority > targetPriority) {
        return i;
      }
    }

    return this.queue.length;
  }

  // Get next notification from queue
  async dequeue(): Promise<NotificationData | null> {
    if (this.queue.length === 0) {
      return null;
    }

    const notification = this.queue.shift();
    await this.saveQueue();
    return notification || null;
  }

  // Peek at next notification without removing
  peek(): NotificationData | null {
    return this.queue[0] || null;
  }

  // Get queue size
  size(): number {
    return this.queue.length;
  }

  // Add notification to batch
  async addToBatch(notification: NotificationData): Promise<void> {
    if (!notification.groupKey) {
      throw new Error('Notification must have groupKey for batching');
    }

    const batchKey = `${notification.recipientId}_${notification.groupKey}`;
    let batch = this.batches.get(batchKey);

    if (!batch) {
      batch = {
        id: `batch_${Date.now()}`,
        notifications: [],
        scheduledFor: this.calculateBatchSchedule(notification),
        recipientId: notification.recipientId,
        type: 'grouped',
      };
      this.batches.set(batchKey, batch);
    }

    batch.notifications.push(notification);
    await this.saveBatch(batchKey, batch);
  }

  // Calculate when to send batch
  private calculateBatchSchedule(notification: NotificationData): Date {
    const now = new Date();
    
    // For now, schedule hourly batches at the top of the hour
    const scheduledTime = new Date(now);
    scheduledTime.setHours(scheduledTime.getHours() + 1, 0, 0, 0);
    
    return scheduledTime;
  }

  // Save batch to storage
  private async saveBatch(key: string, batch: NotificationBatch): Promise<void> {
    const storageKey = `${BATCH_KEY_PREFIX}${key}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(batch));
  }

  // Load all batches
  async loadBatches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const batchKeys = keys.filter(key => key.startsWith(BATCH_KEY_PREFIX));
      
      for (const key of batchKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const batch = JSON.parse(stored);
          const batchKey = key.replace(BATCH_KEY_PREFIX, '');
          this.batches.set(batchKey, batch);
        }
      }
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  }

  // Get batches ready to send
  async getReadyBatches(): Promise<NotificationBatch[]> {
    const now = new Date();
    const readyBatches: NotificationBatch[] = [];

    for (const [key, batch] of this.batches.entries()) {
      if (new Date(batch.scheduledFor) <= now) {
        readyBatches.push(batch);
        this.batches.delete(key);
        await AsyncStorage.removeItem(`${BATCH_KEY_PREFIX}${key}`);
      }
    }

    return readyBatches;
  }

  // Start processing queue
  startProcessing(): void {
    if (this.processing) return;

    this.processing = true;
    
    // Process queue every minute
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 60000); // 1 minute

    // Process immediately
    this.processQueue();
  }

  // Stop processing
  stopProcessing(): void {
    this.processing = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  // Process queued notifications
  private async processQueue(): Promise<void> {
    if (!this.processing) return;

    try {
      // Process regular queue
      const notification = await this.dequeue();
      if (notification) {
        // Send notification
        // This will be handled by NotificationService
        console.log('Processing queued notification:', notification.id);
      }

      // Process batches
      const readyBatches = await this.getReadyBatches();
      for (const batch of readyBatches) {
        console.log('Processing batch:', batch.id);
        // Send batch notification
        // This will be handled by NotificationService
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  // Get queue status
  async getQueueStatus(): Promise<{
    queueSize: number;
    batchCount: number;
    nextScheduled: Date | null;
  }> {
    await this.loadBatches();

    let nextScheduled: Date | null = null;
    
    // Find next scheduled batch
    for (const batch of this.batches.values()) {
      const scheduledDate = new Date(batch.scheduledFor);
      if (!nextScheduled || scheduledDate < nextScheduled) {
        nextScheduled = scheduledDate;
      }
    }

    return {
      queueSize: this.queue.length,
      batchCount: this.batches.size,
      nextScheduled,
    };
  }

  // Clear all queued notifications for a user
  async clearUserQueue(userId: string): Promise<void> {
    // Remove from queue
    this.queue = this.queue.filter(n => n.recipientId !== userId);
    await this.saveQueue();

    // Remove batches
    const keysToRemove: string[] = [];
    for (const [key, batch] of this.batches.entries()) {
      if (batch.recipientId === userId) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.batches.delete(key);
      await AsyncStorage.removeItem(`${BATCH_KEY_PREFIX}${key}`);
    }
  }

  // Emergency clear all
  async clearAll(): Promise<void> {
    this.queue = [];
    await this.saveQueue();

    // Clear all batches
    const keys = await AsyncStorage.getAllKeys();
    const batchKeys = keys.filter(key => key.startsWith(BATCH_KEY_PREFIX));
    await AsyncStorage.multiRemove(batchKeys);
    
    this.batches.clear();
  }
}