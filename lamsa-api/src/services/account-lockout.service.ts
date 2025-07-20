/**
 * @file account-lockout.service.ts
 * @description Account lockout service to prevent brute force attacks
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { supabaseAdmin } from '../config/supabase';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

interface LockoutConfig {
  maxAttempts: number;
  lockoutDuration: number; // in minutes
  resetWindow: number; // in minutes
}

interface LoginAttempt {
  identifier: string;
  attempts: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  lockedUntil?: Date;
}

export class AccountLockoutService {
  private readonly configs: Record<string, LockoutConfig> = {
    customer: {
      maxAttempts: 5,
      lockoutDuration: 15, // 15 minutes
      resetWindow: 60, // 1 hour
    },
    provider: {
      maxAttempts: 5,
      lockoutDuration: 30, // 30 minutes (longer for providers)
      resetWindow: 60, // 1 hour
    },
    otp: {
      maxAttempts: 5,
      lockoutDuration: 30, // 30 minutes
      resetWindow: 15, // 15 minutes
    },
    mfa: {
      maxAttempts: 3,
      lockoutDuration: 60, // 1 hour
      resetWindow: 30, // 30 minutes
    }
  };

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(
    identifier: string,
    type: 'customer' | 'provider' | 'otp' | 'mfa'
  ): Promise<{ isLocked: boolean; remainingAttempts: number; lockoutUntil?: Date }> {
    const config = this.configs[type];
    const key = this.getRedisKey(identifier, type);

    try {
      // Get current attempt data
      const data = await this.getAttemptData(key);
      
      const now = new Date();
      
      // Check if we should reset the attempt window
      if (data && data.firstAttemptAt) {
        const windowExpired = now.getTime() - data.firstAttemptAt.getTime() > config.resetWindow * 60 * 1000;
        if (windowExpired && (!data.lockedUntil || now > data.lockedUntil)) {
          // Reset attempts after window expired
          await this.resetAttempts(key);
          data.attempts = 0;
          data.firstAttemptAt = now;
        }
      }

      // Check if account is currently locked
      if (data?.lockedUntil && now < data.lockedUntil) {
        return {
          isLocked: true,
          remainingAttempts: 0,
          lockoutUntil: data.lockedUntil,
        };
      }

      // Increment attempts
      const attempts = (data?.attempts || 0) + 1;
      const firstAttemptAt = data?.firstAttemptAt || now;

      // Check if we should lock the account
      const shouldLock = attempts >= config.maxAttempts;
      const lockoutUntil = shouldLock 
        ? new Date(now.getTime() + config.lockoutDuration * 60 * 1000)
        : undefined;

      // Save attempt data
      const attemptData: LoginAttempt = {
        identifier,
        attempts,
        firstAttemptAt,
        lastAttemptAt: now,
        lockedUntil: lockoutUntil,
      };

      await this.saveAttemptData(key, attemptData);

      // Log security event
      if (shouldLock) {
        await this.logSecurityEvent(identifier, type, 'account_locked', {
          attempts,
          lockoutDuration: config.lockoutDuration,
        });
      }

      // Store in database for persistent tracking
      await this.storeLockoutInDatabase(identifier, type, attemptData);

      return {
        isLocked: shouldLock,
        remainingAttempts: Math.max(0, config.maxAttempts - attempts),
        lockoutUntil: lockoutUntil,
      };
    } catch (error) {
      logger.error('Error recording failed attempt:', error);
      // Don't break login flow if lockout service fails
      return { isLocked: false, remainingAttempts: config.maxAttempts };
    }
  }

  /**
   * Check if an account is locked
   */
  async isLocked(
    identifier: string,
    type: 'customer' | 'provider' | 'otp' | 'mfa'
  ): Promise<{ isLocked: boolean; lockoutUntil?: Date }> {
    const key = this.getRedisKey(identifier, type);

    try {
      const data = await this.getAttemptData(key);
      
      if (!data || !data.lockedUntil) {
        return { isLocked: false };
      }

      const now = new Date();
      const isLocked = now < data.lockedUntil;

      if (!isLocked && data.lockedUntil) {
        // Lockout expired, reset attempts
        await this.resetAttempts(key);
      }

      return { isLocked, lockoutUntil: isLocked ? data.lockedUntil : undefined };
    } catch (error) {
      logger.error('Error checking lockout status:', error);
      return { isLocked: false };
    }
  }

  /**
   * Reset failed attempts after successful login
   */
  async resetAttempts(identifier: string, type?: 'customer' | 'provider' | 'otp' | 'mfa'): Promise<void> {
    try {
      if (type) {
        const key = this.getRedisKey(identifier, type);
        await this.deleteAttemptData(key);
        
        // Log successful login
        await this.logSecurityEvent(identifier, type, 'login_success', {});
      } else {
        // Reset all types for this identifier
        const types: Array<'customer' | 'provider' | 'otp' | 'mfa'> = ['customer', 'provider', 'otp', 'mfa'];
        for (const t of types) {
          const key = this.getRedisKey(identifier, t);
          await this.deleteAttemptData(key);
        }
      }

      // Clear from database
      await this.clearLockoutFromDatabase(identifier, type);
    } catch (error) {
      logger.error('Error resetting attempts:', error);
    }
  }

  /**
   * Get lockout status for display
   */
  async getLockoutStatus(
    identifier: string,
    type: 'customer' | 'provider' | 'otp' | 'mfa'
  ): Promise<{
    attempts: number;
    maxAttempts: number;
    isLocked: boolean;
    lockoutUntil?: Date;
    remainingAttempts: number;
  }> {
    const config = this.configs[type];
    const key = this.getRedisKey(identifier, type);

    try {
      const data = await this.getAttemptData(key);
      const now = new Date();

      if (!data) {
        return {
          attempts: 0,
          maxAttempts: config.maxAttempts,
          isLocked: false,
          remainingAttempts: config.maxAttempts,
        };
      }

      const isLocked = data.lockedUntil ? now < data.lockedUntil : false;

      return {
        attempts: data.attempts,
        maxAttempts: config.maxAttempts,
        isLocked,
        lockoutUntil: isLocked ? data.lockedUntil : undefined,
        remainingAttempts: Math.max(0, config.maxAttempts - data.attempts),
      };
    } catch (error) {
      logger.error('Error getting lockout status:', error);
      return {
        attempts: 0,
        maxAttempts: config.maxAttempts,
        isLocked: false,
        remainingAttempts: config.maxAttempts,
      };
    }
  }

  /**
   * Admin unlock account
   */
  async adminUnlock(identifier: string, adminId: string): Promise<void> {
    const types: Array<'customer' | 'provider' | 'otp' | 'mfa'> = ['customer', 'provider', 'otp', 'mfa'];
    
    for (const type of types) {
      await this.resetAttempts(identifier, type);
    }

    // Log admin action
    await this.logSecurityEvent(identifier, 'admin', 'admin_unlock', {
      unlockedBy: adminId,
    });
  }

  /**
   * Get Redis key for storing attempt data
   */
  private getRedisKey(identifier: string, type: string): string {
    return `lockout:${type}:${identifier}`;
  }

  /**
   * Get attempt data from Redis
   */
  private async getAttemptData(key: string): Promise<LoginAttempt | null> {
    if (!redisClient.isOpen) {
      // Fallback to database if Redis is not available
      return this.getAttemptDataFromDatabase(key);
    }

    try {
      const data = await redisClient.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data);
      return {
        ...parsed,
        firstAttemptAt: new Date(parsed.firstAttemptAt),
        lastAttemptAt: new Date(parsed.lastAttemptAt),
        lockedUntil: parsed.lockedUntil ? new Date(parsed.lockedUntil) : undefined,
      };
    } catch (error) {
      logger.error('Error getting attempt data from Redis:', error);
      return null;
    }
  }

  /**
   * Save attempt data to Redis
   */
  private async saveAttemptData(key: string, data: LoginAttempt): Promise<void> {
    if (!redisClient.isOpen) {
      // Fallback to database if Redis is not available
      return;
    }

    try {
      const ttl = 24 * 60 * 60; // 24 hours
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error('Error saving attempt data to Redis:', error);
    }
  }

  /**
   * Delete attempt data from Redis
   */
  private async deleteAttemptData(key: string): Promise<void> {
    if (!redisClient.isOpen) return;

    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Error deleting attempt data from Redis:', error);
    }
  }

  /**
   * Store lockout in database for persistence
   */
  private async storeLockoutInDatabase(
    identifier: string,
    type: string,
    data: LoginAttempt
  ): Promise<void> {
    try {
      await supabaseAdmin.from('account_lockouts').upsert({
        identifier,
        lockout_type: type,
        attempts: data.attempts,
        first_attempt_at: data.firstAttemptAt.toISOString(),
        last_attempt_at: data.lastAttemptAt.toISOString(),
        locked_until: data.lockedUntil?.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'identifier,lockout_type',
      });
    } catch (error) {
      logger.error('Error storing lockout in database:', error);
    }
  }

  /**
   * Get attempt data from database (fallback)
   */
  private async getAttemptDataFromDatabase(key: string): Promise<LoginAttempt | null> {
    try {
      const [type, identifier] = key.split(':').slice(1);
      
      const { data, error } = await supabaseAdmin
        .from('account_lockouts')
        .select('*')
        .eq('identifier', identifier)
        .eq('lockout_type', type)
        .single();

      if (error || !data) return null;

      return {
        identifier: data.identifier,
        attempts: data.attempts,
        firstAttemptAt: new Date(data.first_attempt_at),
        lastAttemptAt: new Date(data.last_attempt_at),
        lockedUntil: data.locked_until ? new Date(data.locked_until) : undefined,
      };
    } catch (error) {
      logger.error('Error getting attempt data from database:', error);
      return null;
    }
  }

  /**
   * Clear lockout from database
   */
  private async clearLockoutFromDatabase(identifier: string, type?: string): Promise<void> {
    try {
      const query = supabaseAdmin.from('account_lockouts').delete();
      
      query.eq('identifier', identifier);
      if (type) {
        query.eq('lockout_type', type);
      }

      await query;
    } catch (error) {
      logger.error('Error clearing lockout from database:', error);
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    identifier: string,
    type: string,
    event: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('security_events').insert({
        identifier,
        event_type: event,
        lockout_type: type,
        metadata,
        created_at: new Date().toISOString(),
      });

      // Also log to application logger
      logger.warn(`Security event: ${event}`, {
        identifier,
        type,
        metadata,
      });
    } catch (error) {
      logger.error('Error logging security event:', error);
    }
  }

  /**
   * Get security events for an identifier
   */
  async getSecurityEvents(
    identifier: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('security_events')
        .select('*')
        .eq('identifier', identifier)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      logger.error('Error getting security events:', error);
      return [];
    }
  }
}

// Export singleton instance
export const accountLockoutService = new AccountLockoutService();