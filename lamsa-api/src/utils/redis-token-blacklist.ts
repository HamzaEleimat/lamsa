/**
 * Redis-based JWT Token Blacklisting System
 * Replaces in-memory implementation for horizontal scaling
 */

import { redisTokenService } from '../services/redis-token.service';

class RedisTokenBlacklist {
  /**
   * Add a token to the blacklist
   */
  async blacklistToken(
    token: string,
    userId: string,
    reason: 'logout' | 'security' | 'expired' = 'logout'
  ): Promise<void> {
    return redisTokenService.blacklistToken(token, userId, reason);
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return redisTokenService.isTokenBlacklisted(token);
  }

  /**
   * Blacklist all tokens for a user
   */
  async blacklistAllUserTokens(userId: string): Promise<void> {
    return redisTokenService.blacklistAllUserTokens(userId);
  }

  /**
   * Get blacklist statistics
   */
  async getStats(): Promise<{ totalEntries: number; entriesByReason?: Record<string, number> }> {
    const stats = await redisTokenService.getStats();
    return {
      totalEntries: stats.blacklistedTokens,
      // Note: Detailed reason breakdown would require additional Redis operations
    };
  }

  /**
   * No-op for compatibility - Redis handles expiration automatically
   */
  async cleanupExpiredEntries(): Promise<void> {
    console.log('Cleanup not needed - Redis handles expiration automatically');
  }
}

// Export singleton instance for drop-in replacement
export const tokenBlacklist = new RedisTokenBlacklist();

export default RedisTokenBlacklist;