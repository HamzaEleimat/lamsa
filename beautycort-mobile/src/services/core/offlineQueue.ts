import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  QueuedRequest, 
  RequestConfig, 
  RequestPriority, 
  APIResponse 
} from './types';

const QUEUE_STORAGE_KEY = '@beautycort_offline_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_COUNT = 3;

/**
 * Offline request queue with persistence and priority handling
 */
export class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private httpClient: any; // Will be injected

  constructor() {
    this.loadQueue();
  }

  /**
   * Set HTTP client reference for processing requests
   */
  setHttpClient(client: any): void {
    this.httpClient = client;
  }

  /**
   * Enqueue a request for later processing
   */
  async enqueue<T = any>(config: RequestConfig): Promise<APIResponse<T>> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateId(),
        config,
        timestamp: Date.now(),
        priority: config.priority || RequestPriority.NORMAL,
        retryCount: 0,
        resolve,
        reject,
      };

      // Add to queue with priority ordering
      this.insertByPriority(request);

      // Persist queue
      this.saveQueue();

      // Clean up old requests if queue is too large
      this.cleanupQueue();

      console.log(`Request queued: ${config.method} ${config.url}`);
    });
  }

  /**
   * Process all queued requests
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing ${this.queue.length} queued requests`);

    // Process requests in order of priority
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      try {
        // Execute the request
        const response = await this.executeRequest(request);
        
        // Resolve the original promise
        request.resolve(response);
        
        console.log(`Successfully processed: ${request.config.method} ${request.config.url}`);
        
      } catch (error) {
        // Handle retry logic
        if (this.shouldRetry(request, error)) {
          request.retryCount++;
          this.insertByPriority(request);
          console.log(`Retrying request (${request.retryCount}/${MAX_RETRY_COUNT}): ${request.config.url}`);
        } else {
          // Reject the original promise
          request.reject(error);
          console.log(`Failed to process request: ${request.config.url}`, error);
        }
      }
    }

    this.isProcessing = false;
    await this.saveQueue();
  }

  /**
   * Execute a single queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<APIResponse> {
    if (!this.httpClient) {
      throw new Error('HTTP client not set for offline queue');
    }

    // Mark request to skip queue to avoid infinite loop
    const config = { ...request.config, skipQueue: true };
    
    return this.httpClient.request(config);
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(request: QueuedRequest, error: any): boolean {
    if (request.retryCount >= MAX_RETRY_COUNT) {
      return false;
    }

    // Don't retry authentication or validation errors
    const nonRetryableCategories = ['AUTHENTICATION', 'AUTHORIZATION', 'VALIDATION'];
    if (error?.category && nonRetryableCategories.includes(error.category)) {
      return false;
    }

    // Don't retry DELETE requests (they might have succeeded)
    if (request.config.method === 'DELETE') {
      return false;
    }

    return true;
  }

  /**
   * Insert request by priority order
   */
  private insertByPriority(request: QueuedRequest): void {
    let insertIndex = this.queue.length;
    
    // Find insertion point based on priority
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < request.priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, request);
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old or excessive requests
   */
  private cleanupQueue(): void {
    // Remove requests older than 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.queue = this.queue.filter(request => request.timestamp > oneDayAgo);

    // Limit queue size
    if (this.queue.length > MAX_QUEUE_SIZE) {
      // Remove oldest low-priority requests first
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Lower priority first
        }
        return a.timestamp - b.timestamp; // Older first
      });
      
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (storedQueue) {
        const parsedQueue = JSON.parse(storedQueue);
        
        // Filter out expired requests
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.queue = parsedQueue
          .filter((req: any) => req.timestamp > oneDayAgo)
          .map((req: any) => ({
            ...req,
            resolve: () => {}, // These will be replaced when processing
            reject: () => {},
          }));
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      // Only save the serializable parts
      const serializableQueue = this.queue.map(request => ({
        id: request.id,
        config: request.config,
        timestamp: request.timestamp,
        priority: request.priority,
        retryCount: request.retryCount,
      }));
      
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(serializableQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Clear all queued requests
   */
  async clear(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  }

  /**
   * Get current queue size
   */
  async getSize(): Promise<number> {
    return this.queue.length;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    byPriority: Record<RequestPriority, number>;
    oldestRequest?: number;
  } {
    const stats = {
      total: this.queue.length,
      byPriority: {
        [RequestPriority.LOW]: 0,
        [RequestPriority.NORMAL]: 0,
        [RequestPriority.HIGH]: 0,
        [RequestPriority.CRITICAL]: 0,
      },
      oldestRequest: undefined as number | undefined,
    };

    this.queue.forEach(request => {
      stats.byPriority[request.priority]++;
      if (!stats.oldestRequest || request.timestamp < stats.oldestRequest) {
        stats.oldestRequest = request.timestamp;
      }
    });

    return stats;
  }

  /**
   * Remove specific request from queue
   */
  removeRequest(id: string): boolean {
    const index = this.queue.findIndex(request => request.id === id);
    if (index > -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * Get all queued requests (for debugging)
   */
  getQueue(): Omit<QueuedRequest, 'resolve' | 'reject'>[] {
    return this.queue.map(request => ({
      id: request.id,
      config: request.config,
      timestamp: request.timestamp,
      priority: request.priority,
      retryCount: request.retryCount,
    }));
  }
}
