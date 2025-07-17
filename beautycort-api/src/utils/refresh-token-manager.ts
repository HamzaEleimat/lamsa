/**
 * Refresh Token Management System
 * Implements refresh token rotation and family tracking
 */

import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface RefreshTokenEntry {
  tokenId: string;
  userId: string;
  tokenFamily: string; // All tokens in a rotation family
  isRevoked: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastUsed?: Date;
}

interface JWTPayload {
  id: string;
  type: 'customer' | 'provider' | 'admin';
  phone?: string;
  email?: string;
  tokenId?: string;
  tokenFamily?: string;
}

class RefreshTokenManager {
  private refreshTokens: Map<string, RefreshTokenEntry> = new Map();
  
  /**
   * Generate a new refresh token with rotation support
   * @param payload - User payload for the token
   * @param tokenFamily - Optional existing token family for rotation
   * @returns Object containing new refresh token and its metadata
   */
  async generateRefreshToken(
    payload: Omit<JWTPayload, 'tokenId' | 'tokenFamily'>, 
    tokenFamily?: string,
    jwtSecret?: string
  ): Promise<{ refreshToken: string; tokenId: string; tokenFamily: string }> {
    try {
      const tokenId = crypto.randomUUID();
      const family = tokenFamily || crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const tokenPayload: JWTPayload = {
        ...payload,
        tokenId,
        tokenFamily: family
      };
      
      // Generate JWT refresh token
      const refreshToken = jwt.sign(
        tokenPayload,
        jwtSecret || process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '30d' }
      );
      
      // Store token metadata
      const entry: RefreshTokenEntry = {
        tokenId,
        userId: payload.id,
        tokenFamily: family,
        isRevoked: false,
        createdAt: new Date(),
        expiresAt
      };
      
      this.refreshTokens.set(tokenId, entry);
      
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
   * @param refreshToken - The refresh token to validate and rotate
   * @param jwtSecret - JWT secret for verification
   * @returns New refresh token if valid, throws error if invalid
   */
  async rotateRefreshToken(
    refreshToken: string,
    jwtSecret?: string
  ): Promise<{ newRefreshToken: string; payload: JWTPayload; tokenId: string; tokenFamily: string }> {
    try {
      // Verify and decode the refresh token
      const decoded = jwt.verify(
        refreshToken,
        jwtSecret || process.env.JWT_SECRET || 'fallback-secret'
      ) as JWTPayload;
      
      if (!decoded.tokenId || !decoded.tokenFamily) {
        throw new Error('Invalid refresh token structure');
      }
      
      // Check if token exists and is valid
      const tokenEntry = this.refreshTokens.get(decoded.tokenId);
      
      if (!tokenEntry) {
        throw new Error('Refresh token not found');
      }
      
      if (tokenEntry.isRevoked) {
        // If this token is revoked, revoke the entire family (potential security breach)
        await this.revokeTokenFamily(tokenEntry.tokenFamily);
        throw new Error('Refresh token has been revoked');
      }
      
      if (tokenEntry.expiresAt <= new Date()) {
        // Clean up expired token
        this.refreshTokens.delete(decoded.tokenId);
        throw new Error('Refresh token has expired');
      }
      
      // Revoke the current token (it's been used)
      tokenEntry.isRevoked = true;
      tokenEntry.lastUsed = new Date();
      
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
   * @param tokenId - The token ID to revoke
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    try {
      const tokenEntry = this.refreshTokens.get(tokenId);
      
      if (tokenEntry) {
        tokenEntry.isRevoked = true;
        tokenEntry.lastUsed = new Date();
        console.log(`Refresh token revoked: ${tokenId.substring(0, 8)}...`);
      }
    } catch (error) {
      console.error('Error revoking refresh token:', error);
    }
  }
  
  /**
   * Revoke all tokens in a token family (security measure)
   * @param tokenFamily - The token family to revoke
   */
  async revokeTokenFamily(tokenFamily: string): Promise<void> {
    try {
      let revokedCount = 0;
      
      for (const [_, entry] of this.refreshTokens.entries()) {
        if (entry.tokenFamily === tokenFamily && !entry.isRevoked) {
          entry.isRevoked = true;
          entry.lastUsed = new Date();
          revokedCount++;
        }
      }
      
      console.log(`Revoked ${revokedCount} tokens in family: ${tokenFamily.substring(0, 8)}...`);
    } catch (error) {
      console.error('Error revoking token family:', error);
    }
  }
  
  /**
   * Revoke all refresh tokens for a user
   * @param userId - The user ID to revoke all tokens for
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      let revokedCount = 0;
      
      for (const [_, entry] of this.refreshTokens.entries()) {
        if (entry.userId === userId && !entry.isRevoked) {
          entry.isRevoked = true;
          entry.lastUsed = new Date();
          revokedCount++;
        }
      }
      
      console.log(`Revoked ${revokedCount} refresh tokens for user: ${userId}`);
    } catch (error) {
      console.error('Error revoking user tokens:', error);
    }
  }
  
  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();
      const expiredTokens: string[] = [];
      
      for (const [tokenId, entry] of this.refreshTokens.entries()) {
        if (entry.expiresAt <= now) {
          expiredTokens.push(tokenId);
        }
      }
      
      for (const tokenId of expiredTokens) {
        this.refreshTokens.delete(tokenId);
      }
      
      if (expiredTokens.length > 0) {
        console.log(`Cleaned up ${expiredTokens.length} expired refresh tokens`);
      }
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }
  
  /**
   * Get refresh token statistics
   */
  getStats(): { totalTokens: number; activeTokens: number; revokedTokens: number; expiredTokens: number } {
    const now = new Date();
    let activeTokens = 0;
    let revokedTokens = 0;
    let expiredTokens = 0;
    
    for (const entry of this.refreshTokens.values()) {
      if (entry.expiresAt <= now) {
        expiredTokens++;
      } else if (entry.isRevoked) {
        revokedTokens++;
      } else {
        activeTokens++;
      }
    }
    
    return {
      totalTokens: this.refreshTokens.size,
      activeTokens,
      revokedTokens,
      expiredTokens
    };
  }
}

// Singleton instance
export const refreshTokenManager = new RefreshTokenManager();

// Start cleanup interval (every 4 hours)
setInterval(() => {
  refreshTokenManager.cleanupExpiredTokens();
}, 4 * 60 * 60 * 1000);

export default RefreshTokenManager;