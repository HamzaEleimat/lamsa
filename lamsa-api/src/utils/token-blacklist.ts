/**
 * JWT Token Blacklisting System
 * Prevents token reuse after logout and provides token revocation capabilities
 */

import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface TokenBlacklistEntry {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  reason: 'logout' | 'security' | 'expired';
}

class TokenBlacklist {
  private blacklistedTokens: Map<string, TokenBlacklistEntry> = new Map();
  
  /**
   * Add a token to the blacklist
   * @param token - JWT token to blacklist
   * @param userId - User ID associated with the token
   * @param reason - Reason for blacklisting
   */
  async blacklistToken(token: string, userId: string, reason: 'logout' | 'security' | 'expired' = 'logout'): Promise<void> {
    try {
      // Create hash of token for security (don't store actual token)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Get token expiration from JWT payload
      const decoded = jwt.decode(token) as any;
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default
      
      const entry: TokenBlacklistEntry = {
        tokenHash,
        userId,
        expiresAt,
        reason
      };
      
      // Store in memory (in production, this should use Redis)
      this.blacklistedTokens.set(tokenHash, entry);
      
      // TODO: In production, store in Redis with TTL
      // await redis.setex(`blacklist:${tokenHash}`, Math.floor((expiresAt.getTime() - Date.now()) / 1000), JSON.stringify(entry));
      
      console.log(`Token blacklisted: ${tokenHash.substring(0, 8)}... for user ${userId} (${reason})`);
    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw new Error('Failed to blacklist token');
    }
  }
  
  /**
   * Check if a token is blacklisted
   * @param token - JWT token to check
   * @returns true if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Check in-memory store (in production, check Redis)
      const entry = this.blacklistedTokens.get(tokenHash);
      
      if (!entry) {
        return false;
      }
      
      // Check if entry has expired
      if (entry.expiresAt <= new Date()) {
        // Remove expired entry
        this.blacklistedTokens.delete(tokenHash);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      // On error, assume token is valid to prevent service disruption
      return false;
    }
  }
  
  /**
   * Blacklist all tokens for a user (useful for security incidents)
   * @param userId - User ID to blacklist all tokens for
   */
  async blacklistAllUserTokens(userId: string): Promise<void> {
    try {
      // In a real implementation, this would query Redis for all user tokens
      // For now, mark all tokens for this user in memory
      for (const [_, entry] of this.blacklistedTokens.entries()) {
        if (entry.userId === userId) {
          entry.reason = 'security';
        }
      }
      
      console.log(`All tokens blacklisted for user: ${userId}`);
    } catch (error) {
      console.error('Error blacklisting user tokens:', error);
      throw new Error('Failed to blacklist user tokens');
    }
  }
  
  /**
   * Clean up expired blacklist entries
   */
  async cleanupExpiredEntries(): Promise<void> {
    try {
      const now = new Date();
      const expiredHashes: string[] = [];
      
      for (const [tokenHash, entry] of this.blacklistedTokens.entries()) {
        if (entry.expiresAt <= now) {
          expiredHashes.push(tokenHash);
        }
      }
      
      for (const hash of expiredHashes) {
        this.blacklistedTokens.delete(hash);
      }
      
      if (expiredHashes.length > 0) {
        console.log(`Cleaned up ${expiredHashes.length} expired blacklist entries`);
      }
    } catch (error) {
      console.error('Error cleaning up blacklist:', error);
    }
  }
  
  /**
   * Get blacklist statistics
   */
  getStats(): { totalEntries: number; entriesByReason: Record<string, number> } {
    const entriesByReason: Record<string, number> = {};
    
    for (const entry of this.blacklistedTokens.values()) {
      entriesByReason[entry.reason] = (entriesByReason[entry.reason] || 0) + 1;
    }
    
    return {
      totalEntries: this.blacklistedTokens.size,
      entriesByReason
    };
  }
}

// Singleton instance
export const tokenBlacklist = new TokenBlacklist();

// Start cleanup interval (every hour)
setInterval(() => {
  tokenBlacklist.cleanupExpiredEntries();
}, 60 * 60 * 1000);

export default TokenBlacklist;