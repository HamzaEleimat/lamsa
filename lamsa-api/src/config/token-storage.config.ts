/**
 * Token Storage Configuration
 * Determines whether to use in-memory or Redis-based token storage
 */

import { tokenBlacklist as inMemoryBlacklist } from '../utils/token-blacklist';
import { tokenBlacklist as redisBlacklist } from '../utils/redis-token-blacklist';
import { refreshTokenManager as inMemoryRefreshManager } from '../utils/refresh-token-manager';
import { refreshTokenManager as redisRefreshManager } from '../utils/redis-refresh-token-manager';

// Check if Redis is available and should be used
const useRedis = process.env.USE_REDIS_TOKENS === 'true' || process.env.NODE_ENV === 'production';

// Export the appropriate implementations
export const tokenBlacklist = useRedis ? redisBlacklist : inMemoryBlacklist;
export const refreshTokenManager = useRedis ? redisRefreshManager : inMemoryRefreshManager;

// Log which implementation is being used
console.log(`Token Storage: Using ${useRedis ? 'Redis' : 'in-memory'} implementation`);

// Health check function
export async function checkTokenStorageHealth(): Promise<{
  type: 'redis' | 'memory';
  healthy: boolean;
  stats?: any;
}> {
  if (useRedis) {
    try {
      const { redisTokenService } = await import('../services/redis-token.service');
      const healthy = await redisTokenService.healthCheck();
      const stats = healthy ? await redisTokenService.getStats() : undefined;
      
      return {
        type: 'redis',
        healthy,
        stats
      };
    } catch (error) {
      console.error('Redis token storage health check failed:', error);
      return {
        type: 'redis',
        healthy: false
      };
    }
  } else {
    return {
      type: 'memory',
      healthy: true,
      stats: {
        blacklist: await tokenBlacklist.getStats(),
        refreshTokens: await refreshTokenManager.getStats()
      }
    };
  }
}

export default {
  tokenBlacklist,
  refreshTokenManager,
  useRedis,
  checkTokenStorageHealth
};