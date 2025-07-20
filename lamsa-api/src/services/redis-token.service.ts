/**
 * Redis-based Token Management Service
 * Replaces in-memory Maps for horizontal scaling support
 */

import { createClient, RedisClientType } from 'redis';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface TokenBlacklistEntry {
  userId: string;
  reason: 'logout' | 'security' | 'expired';
  blacklistedAt: string;
}

interface RefreshTokenEntry {
  userId: string;
  tokenFamily: string;
  isRevoked: boolean;
  createdAt: string;
  lastUsed?: string;
}

export class RedisTokenService {
  private client: RedisClientType;
  private connected: boolean = false;
  
  // Key prefixes for different token types
  private readonly BLACKLIST_PREFIX = 'blacklist:';
  private readonly REFRESH_TOKEN_PREFIX = 'refresh:';
  private readonly TOKEN_FAMILY_PREFIX = 'family:';
  private readonly USER_TOKENS_PREFIX = 'user_tokens:';

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      console.error('Redis Token Service Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Token Service connected');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Token Service disconnected');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
    }
  }

  // ==================== Token Blacklisting ====================

  /**
   * Add a token to the blacklist
   */
  async blacklistToken(token: string, userId: string, reason: 'logout' | 'security' | 'expired' = 'logout'): Promise<void> {
    await this.ensureConnected();
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Get token expiration
    let expiresIn = 7 * 24 * 60 * 60; // 7 days default
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded?.exp) {
        expiresIn = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0);
      }
    } catch (error) {
      console.error('Error decoding token for expiry:', error);
    }

    const entry: TokenBlacklistEntry = {
      userId,
      reason,
      blacklistedAt: new Date().toISOString()
    };

    // Store with TTL matching token expiry
    await this.client.setEx(
      `${this.BLACKLIST_PREFIX}${tokenHash}`,
      expiresIn,
      JSON.stringify(entry)
    );

    // Add to user's token list for bulk revocation
    await this.client.sAdd(`${this.USER_TOKENS_PREFIX}${userId}`, tokenHash);
    await this.client.expire(`${this.USER_TOKENS_PREFIX}${userId}`, 30 * 24 * 60 * 60); // 30 days

    console.log(`Token blacklisted: ${tokenHash.substring(0, 8)}... for user ${userId} (${reason})`);
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const exists = await this.client.exists(`${this.BLACKLIST_PREFIX}${tokenHash}`);
      
      return exists > 0;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      // On error, assume token is valid to prevent service disruption
      return false;
    }
  }

  /**
   * Blacklist all tokens for a user
   */
  async blacklistAllUserTokens(userId: string): Promise<void> {
    await this.ensureConnected();
    
    // Get all token hashes for the user
    const tokenHashes = await this.client.sMembers(`${this.USER_TOKENS_PREFIX}${userId}`);
    
    if (tokenHashes.length > 0) {
      // Use pipeline for efficiency
      const pipeline = this.client.multi();
      
      for (const hash of tokenHashes) {
        const entry: TokenBlacklistEntry = {
          userId,
          reason: 'security',
          blacklistedAt: new Date().toISOString()
        };
        
        pipeline.setEx(
          `${this.BLACKLIST_PREFIX}${hash}`,
          7 * 24 * 60 * 60, // 7 days
          JSON.stringify(entry)
        );
      }
      
      await pipeline.exec();
    }
    
    console.log(`Blacklisted ${tokenHashes.length} tokens for user: ${userId}`);
  }

  // ==================== Refresh Token Management ====================

  /**
   * Store a refresh token
   */
  async storeRefreshToken(
    tokenId: string,
    userId: string,
    tokenFamily: string,
    expiresIn: number = 30 * 24 * 60 * 60 // 30 days
  ): Promise<void> {
    await this.ensureConnected();
    
    const entry: RefreshTokenEntry = {
      userId,
      tokenFamily,
      isRevoked: false,
      createdAt: new Date().toISOString()
    };

    // Store the refresh token
    await this.client.setEx(
      `${this.REFRESH_TOKEN_PREFIX}${tokenId}`,
      expiresIn,
      JSON.stringify(entry)
    );

    // Add to token family set
    await this.client.sAdd(`${this.TOKEN_FAMILY_PREFIX}${tokenFamily}`, tokenId);
    await this.client.expire(`${this.TOKEN_FAMILY_PREFIX}${tokenFamily}`, expiresIn);

    // Add to user's refresh token set
    await this.client.sAdd(`${this.USER_TOKENS_PREFIX}refresh:${userId}`, tokenId);
    await this.client.expire(`${this.USER_TOKENS_PREFIX}refresh:${userId}`, expiresIn);
  }

  /**
   * Get refresh token data
   */
  async getRefreshToken(tokenId: string): Promise<RefreshTokenEntry | null> {
    await this.ensureConnected();
    
    const data = await this.client.get(`${this.REFRESH_TOKEN_PREFIX}${tokenId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.ensureConnected();
    
    const key = `${this.REFRESH_TOKEN_PREFIX}${tokenId}`;
    const data = await this.client.get(key);
    
    if (data) {
      const entry: RefreshTokenEntry = JSON.parse(data);
      entry.isRevoked = true;
      entry.lastUsed = new Date().toISOString();
      
      // Update with same TTL
      const ttl = await this.client.ttl(key);
      if (ttl > 0) {
        await this.client.setEx(key, ttl, JSON.stringify(entry));
      }
    }
  }

  /**
   * Revoke all tokens in a family
   */
  async revokeTokenFamily(tokenFamily: string): Promise<void> {
    await this.ensureConnected();
    
    const tokenIds = await this.client.sMembers(`${this.TOKEN_FAMILY_PREFIX}${tokenFamily}`);
    
    if (tokenIds.length > 0) {
      const pipeline = this.client.multi();
      
      for (const tokenId of tokenIds) {
        const key = `${this.REFRESH_TOKEN_PREFIX}${tokenId}`;
        pipeline.get(key);
      }
      
      const results = await pipeline.exec();
      const updatePipeline = this.client.multi();
      
      for (let i = 0; i < tokenIds.length; i++) {
        const data = results[i];
        if (data) {
          const entry: RefreshTokenEntry = JSON.parse(data as string);
          entry.isRevoked = true;
          entry.lastUsed = new Date().toISOString();
          
          const key = `${this.REFRESH_TOKEN_PREFIX}${tokenIds[i]}`;
          const ttl = await this.client.ttl(key);
          
          if (ttl > 0) {
            updatePipeline.setEx(key, ttl, JSON.stringify(entry));
          }
        }
      }
      
      await updatePipeline.exec();
    }
    
    console.log(`Revoked ${tokenIds.length} tokens in family: ${tokenFamily.substring(0, 8)}...`);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.ensureConnected();
    
    const tokenIds = await this.client.sMembers(`${this.USER_TOKENS_PREFIX}refresh:${userId}`);
    
    if (tokenIds.length > 0) {
      const pipeline = this.client.multi();
      
      for (const tokenId of tokenIds) {
        const key = `${this.REFRESH_TOKEN_PREFIX}${tokenId}`;
        pipeline.get(key);
      }
      
      const results = await pipeline.exec();
      const updatePipeline = this.client.multi();
      
      for (let i = 0; i < tokenIds.length; i++) {
        const data = results[i];
        if (data) {
          const entry: RefreshTokenEntry = JSON.parse(data as string);
          entry.isRevoked = true;
          entry.lastUsed = new Date().toISOString();
          
          const key = `${this.REFRESH_TOKEN_PREFIX}${tokenIds[i]}`;
          const ttl = await this.client.ttl(key);
          
          if (ttl > 0) {
            updatePipeline.setEx(key, ttl, JSON.stringify(entry));
          }
        }
      }
      
      await updatePipeline.exec();
    }
    
    console.log(`Revoked ${tokenIds.length} refresh tokens for user: ${userId}`);
  }

  // ==================== Stats and Monitoring ====================

  /**
   * Get token statistics
   */
  async getStats(): Promise<{
    blacklistedTokens: number;
    refreshTokens: number;
    tokenFamilies: number;
    usersWithTokens: number;
  }> {
    await this.ensureConnected();
    
    // Use SCAN to count keys with different prefixes
    const counts = {
      blacklistedTokens: 0,
      refreshTokens: 0,
      tokenFamilies: 0,
      usersWithTokens: 0
    };

    // Count blacklisted tokens
    for await (const key of this.client.scanIterator({
      MATCH: `${this.BLACKLIST_PREFIX}*`,
      COUNT: 100
    })) {
      counts.blacklistedTokens++;
    }

    // Count refresh tokens
    for await (const key of this.client.scanIterator({
      MATCH: `${this.REFRESH_TOKEN_PREFIX}*`,
      COUNT: 100
    })) {
      counts.refreshTokens++;
    }

    // Count token families
    for await (const key of this.client.scanIterator({
      MATCH: `${this.TOKEN_FAMILY_PREFIX}*`,
      COUNT: 100
    })) {
      counts.tokenFamilies++;
    }

    // Count users with tokens
    for await (const key of this.client.scanIterator({
      MATCH: `${this.USER_TOKENS_PREFIX}*`,
      COUNT: 100
    })) {
      counts.usersWithTokens++;
    }

    return counts;
  }

  // ==================== Utility Methods ====================

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureConnected();
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis Token Service health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const redisTokenService = new RedisTokenService();

// Initialize connection
redisTokenService.connect().catch(error => {
  console.error('Failed to initialize Redis Token Service:', error);
});

export default RedisTokenService;