/**
 * Redis-based Refresh Token Management System
 * Replaces in-memory implementation for horizontal scaling
 */

import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { redisTokenService } from '../services/redis-token.service';

interface JWTPayload {
  id: string;
  type: 'customer' | 'provider' | 'admin';
  phone?: string;
  email?: string;
  tokenId?: string;
  tokenFamily?: string;
}

class RedisRefreshTokenManager {
  /**
   * Generate a new refresh token with rotation support
   */
  async generateRefreshToken(
    payload: Omit<JWTPayload, 'tokenId' | 'tokenFamily'>, 
    tokenFamily?: string,
    jwtSecret?: string
  ): Promise<{ refreshToken: string; tokenId: string; tokenFamily: string }> {
    try {
      const tokenId = crypto.randomUUID();
      const family = tokenFamily || crypto.randomUUID();
      
      const tokenPayload: JWTPayload = {
        ...payload,
        tokenId,
        tokenFamily: family
      };
      
      // Generate JWT refresh token
      const secret = jwtSecret || process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }
      
      const refreshToken = jwt.sign(
        tokenPayload,
        secret,
        { expiresIn: '30d' }
      );
      
      // Store in Redis
      await redisTokenService.storeRefreshToken(
        tokenId,
        payload.id,
        family,
        30 * 24 * 60 * 60 // 30 days in seconds
      );
      
      console.log(`New refresh token generated: ${tokenId.substring(0, 8)}... for user ${payload.id}`);
      
      return {
        refreshToken,
        tokenId,
        tokenFamily: family
      };
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Validate and rotate a refresh token
   */
  async rotateRefreshToken(
    refreshToken: string,
    jwtSecret?: string
  ): Promise<{ newRefreshToken: string; payload: JWTPayload; tokenId: string; tokenFamily: string }> {
    try {
      // Verify and decode the refresh token
      const secret = jwtSecret || process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }
      
      const decoded = jwt.verify(
        refreshToken,
        secret
      ) as JWTPayload;
      
      if (!decoded.tokenId || !decoded.tokenFamily) {
        throw new Error('Invalid refresh token structure');
      }
      
      // Check if token exists and is valid in Redis
      const tokenEntry = await redisTokenService.getRefreshToken(decoded.tokenId);
      
      if (!tokenEntry) {
        throw new Error('Refresh token not found');
      }
      
      if (tokenEntry.isRevoked) {
        // If this token is revoked, revoke the entire family (potential security breach)
        await redisTokenService.revokeTokenFamily(tokenEntry.tokenFamily);
        throw new Error('Refresh token has been revoked');
      }
      
      // Revoke the current token (it's been used)
      await redisTokenService.revokeRefreshToken(decoded.tokenId);
      
      // Generate new refresh token in the same family
      const newTokenData = await this.generateRefreshToken(
        {
          id: decoded.id,
          type: decoded.type,
          phone: decoded.phone,
          email: decoded.email
        },
        decoded.tokenFamily,
        jwtSecret
      );
      
      console.log(`Refresh token rotated for user ${decoded.id}: ${decoded.tokenId?.substring(0, 8)}... -> ${newTokenData.tokenId.substring(0, 8)}...`);
      
      return {
        newRefreshToken: newTokenData.refreshToken,
        payload: decoded,
        tokenId: newTokenData.tokenId,
        tokenFamily: newTokenData.tokenFamily
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    return redisTokenService.revokeRefreshToken(tokenId);
  }

  /**
   * Revoke all tokens in a token family
   */
  async revokeTokenFamily(tokenFamily: string): Promise<void> {
    return redisTokenService.revokeTokenFamily(tokenFamily);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    return redisTokenService.revokeAllUserRefreshTokens(userId);
  }

  /**
   * Get refresh token statistics
   */
  async getStats(): Promise<{ 
    totalTokens: number; 
    activeTokens?: number; 
    revokedTokens?: number; 
    expiredTokens?: number 
  }> {
    const stats = await redisTokenService.getStats();
    return {
      totalTokens: stats.refreshTokens,
      // Note: Detailed breakdown would require additional Redis operations
    };
  }

  /**
   * No-op for compatibility - Redis handles expiration automatically
   */
  async cleanupExpiredTokens(): Promise<void> {
    console.log('Cleanup not needed - Redis handles expiration automatically');
  }
}

// Export singleton instance for drop-in replacement
export const refreshTokenManager = new RedisRefreshTokenManager();

export default RedisRefreshTokenManager;