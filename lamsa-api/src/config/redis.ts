/**
 * @file redis.ts
 * @description Redis client configuration for caching and session management
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Redis client type
export type RedisClient = ReturnType<typeof createClient>;

// Create Redis client
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.info(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
    connectTimeout: 10000,
  },
  // Disable Redis if not configured (fallback to in-memory)
  ...(process.env.DISABLE_REDIS === 'true' && { 
    socket: { host: 'non-existent-host' } 
  }),
});

// Error handling
redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

redisClient.on('ready', () => {
  logger.info('Redis Client Ready');
});

redisClient.on('end', () => {
  logger.info('Redis Client Disconnected');
});

// Connect to Redis
export async function connectRedis(): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Don't throw - allow app to run without Redis
    logger.warn('Running without Redis cache - using database fallback');
  }
}

// Disconnect from Redis
export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
}

// Helper functions for common operations
export const redis = {
  // Get with JSON parsing
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis getJSON error for key ${key}:`, error);
      return null;
    }
  },

  // Set with JSON stringification
  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const json = JSON.stringify(value);
      if (ttl) {
        await redisClient.setEx(key, ttl, json);
      } else {
        await redisClient.set(key, json);
      }
    } catch (error) {
      logger.error(`Redis setJSON error for key ${key}:`, error);
    }
  },

  // Increment with expiry
  async incrWithExpiry(key: string, ttl: number): Promise<number> {
    try {
      const multi = redisClient.multi();
      multi.incr(key);
      multi.expire(key, ttl);
      const results = await multi.exec();
      return results?.[0] as number || 0;
    } catch (error) {
      logger.error(`Redis incrWithExpiry error for key ${key}:`, error);
      return 0;
    }
  },

  // Check if Redis is available
  isAvailable(): boolean {
    return redisClient.isOpen;
  },
};