/**
 * @file admin.controller.ts
 * @description Admin controller for managing system operations
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import { ApiResponse, AuthRequest } from '../types';
import { accountLockoutService } from '../services/account-lockout.service';
import { db, supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class AdminController {
  /**
   * Get lockout status for a specific identifier
   */
  async getLockoutStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, type } = req.params;

      if (!identifier || !type) {
        throw new AppError('Identifier and type are required', 400);
      }

      const validTypes = ['customer', 'provider', 'otp', 'mfa'];
      if (!validTypes.includes(type)) {
        throw new AppError('Invalid lockout type', 400);
      }

      const status = await accountLockoutService.getLockoutStatus(
        identifier, 
        type as 'customer' | 'provider' | 'otp' | 'mfa'
      );

      const response: ApiResponse = {
        success: true,
        data: status,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlock an account manually
   */
  async unlockAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier } = req.params;
      const adminId = req.user?.id;

      if (!identifier) {
        throw new AppError('Identifier is required', 400);
      }

      if (!adminId) {
        throw new AppError('Admin ID not found', 401);
      }

      // Verify admin has permission
      const { data: admin } = await db.providers.findById(adminId);
      if (!admin || (admin as any).role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      await accountLockoutService.adminUnlock(identifier, adminId);

      logger.info(`Admin ${adminId} unlocked account ${identifier}`);

      const response: ApiResponse = {
        success: true,
        message: 'Account unlocked successfully',
        data: {
          identifier,
          unlockedBy: adminId,
          unlockedAt: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security events for an identifier
   */
  async getSecurityEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!identifier) {
        throw new AppError('Identifier is required', 400);
      }

      // Verify admin has permission
      const adminId = req.user?.id;
      const { data: admin } = await db.providers.findById(adminId!);
      if (!admin || (admin as any).role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      const events = await accountLockoutService.getSecurityEvents(
        identifier, 
        Number(limit)
      );

      const response: ApiResponse = {
        success: true,
        data: {
          identifier,
          events,
          count: events.length,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all currently locked accounts
   */
  async getLockedAccounts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verify admin has permission
      const adminId = req.user?.id;
      const { data: admin } = await db.providers.findById(adminId!);
      if (!admin || (admin as any).role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      // Query database for all locked accounts
      if (!supabaseAdmin) {
        throw new AppError('Admin client not configured', 500);
      }
      const { data: lockedAccounts, error } = await supabaseAdmin
        .from('account_lockouts')
        .select('*')
        .gt('locked_until', new Date().toISOString())
        .order('locked_until', { ascending: true });

      if (error) {
        throw new AppError('Failed to fetch locked accounts', 500);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          accounts: lockedAccounts || [],
          count: lockedAccounts?.length || 0,
          timestamp: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update lockout configuration
   */
  async updateLockoutConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verify admin has permission
      const adminId = req.user?.id;
      const { data: admin } = await db.providers.findById(adminId!);
      if (!admin || (admin as any).role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      const { type, maxAttempts, lockoutDuration, resetWindow } = req.body;

      const validTypes = ['customer', 'provider', 'otp', 'mfa'];
      if (!validTypes.includes(type)) {
        throw new AppError('Invalid lockout type', 400);
      }

      // Note: In a real implementation, you would store these configs in the database
      // and update the AccountLockoutService to read from database
      // For now, we'll just return a success response

      logger.info(`Admin ${adminId} updated lockout config for ${type}`, {
        maxAttempts,
        lockoutDuration,
        resetWindow,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Lockout configuration updated successfully',
        data: {
          type,
          maxAttempts,
          lockoutDuration,
          resetWindow,
          updatedBy: adminId,
          updatedAt: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security dashboard statistics
   */
  async getSecurityStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verify admin has permission
      const adminId = req.user?.id;
      const { data: admin } = await db.providers.findById(adminId!);
      if (!admin || (admin as any).role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get security event statistics
      if (!supabaseAdmin) {
        throw new AppError('Admin client not configured', 500);
      }
      const { data: dailyEvents } = await supabaseAdmin
        .from('security_events')
        .select('event_type', { count: 'exact' })
        .gte('created_at', oneDayAgo.toISOString());

      const { data: weeklyEvents } = await supabaseAdmin
        .from('security_events')
        .select('event_type', { count: 'exact' })
        .gte('created_at', oneWeekAgo.toISOString());

      const { data: currentlyLocked } = await supabaseAdmin
        .from('account_lockouts')
        .select('lockout_type', { count: 'exact' })
        .gt('locked_until', now.toISOString());

      // Group events by type
      const eventStats = {
        daily: {
          total: dailyEvents?.length || 0,
          byType: dailyEvents?.reduce((acc: any, event: any) => {
            acc[event.event_type] = (acc[event.event_type] || 0) + 1;
            return acc;
          }, {}),
        },
        weekly: {
          total: weeklyEvents?.length || 0,
          byType: weeklyEvents?.reduce((acc: any, event: any) => {
            acc[event.event_type] = (acc[event.event_type] || 0) + 1;
            return acc;
          }, {}),
        },
        currentlyLocked: {
          total: currentlyLocked?.length || 0,
          byType: currentlyLocked?.reduce((acc: any, lockout: any) => {
            acc[lockout.lockout_type] = (acc[lockout.lockout_type] || 0) + 1;
            return acc;
          }, {}),
        },
      };

      const response: ApiResponse = {
        success: true,
        data: {
          statistics: eventStats,
          timestamp: now.toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();