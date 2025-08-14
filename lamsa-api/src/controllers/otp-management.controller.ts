import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';
import { normalizePhoneNumber } from '../utils/phone.utils';

class OTPManagementController {
  // Get OTP statistics
  async getOTPStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, purpose } = req.query;
      const now = new Date();
      const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      let query = supabase
        .from('otp_verifications')
        .select('*', { count: 'exact' });

      if (from) {
        query = query.gte('created_at', from as string);
      } else {
        query = query.gte('created_at', defaultFrom.toISOString());
      }

      if (to) {
        query = query.lte('created_at', to as string);
      }

      if (purpose) {
        query = query.eq('purpose', purpose);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Calculate statistics
      const total = count || 0;
      const verified = data?.filter(otp => otp.verified).length || 0;
      const expired = data?.filter(otp => !otp.verified && new Date(otp.expires_at) < now).length || 0;
      const pending = data?.filter(otp => !otp.verified && new Date(otp.expires_at) >= now).length || 0;
      const maxAttempts = data?.filter(otp => otp.attempts >= 3).length || 0;

      // Group by purpose
      const byPurpose = data?.reduce((acc: any, otp) => {
        acc[otp.purpose] = (acc[otp.purpose] || 0) + 1;
        return acc;
      }, {}) || {};

      // Calculate average attempts
      const totalAttempts = data?.reduce((sum, otp) => sum + otp.attempts, 0) || 0;
      const avgAttempts = total > 0 ? (totalAttempts / total).toFixed(2) : 0;

      res.json({
        success: true,
        data: {
          total,
          verified,
          expired,
          pending,
          maxAttempts,
          avgAttempts: parseFloat(avgAttempts as string),
          byPurpose,
          period: {
            from: from || defaultFrom.toISOString(),
            to: to || now.toISOString()
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get pending OTPs
  async getPendingOTPs(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, page = 1, limit = 20 } = req.query;
      const now = new Date();

      let query = supabase
        .from('otp_verifications')
        .select('*', { count: 'exact' })
        .eq('verified', false)
        .gte('expires_at', now.toISOString())
        .order('created_at', { ascending: false });

      if (phone) {
        const normalizedPhone = normalizePhoneNumber(phone as string);
        query = query.eq('phone', normalizedPhone);
      }

      // Pagination
      const offset = (Number(page) - 1) * Number(limit);
      query = query.range(offset, offset + Number(limit) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Cleanup expired OTPs
  async cleanupExpiredOTPs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { force = false, older_than_hours = 24 } = req.body;
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - older_than_hours);

      // First, get count of records to be deleted
      const { count } = await supabase
        .from('otp_verifications')
        .select('*', { count: 'exact', head: true })
        .lte('expires_at', cutoffDate.toISOString());

      if (!force && count && count > 1000) {
        res.status(400).json({
          success: false,
          message: `This will delete ${count} records. Use force=true to confirm.`,
          data: { recordsToDelete: count }
        });
        return;
      }

      // Perform deletion
      const { error } = await supabase
        .from('otp_verifications')
        .delete()
        .lte('expires_at', cutoffDate.toISOString());

      if (error) throw error;

      res.json({
        success: true,
        message: `Cleaned up ${count || 0} expired OTP records`,
        data: {
          deletedCount: count || 0,
          cutoffDate: cutoffDate.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Invalidate OTPs for a phone number
  async invalidatePhoneOTPs(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, reason } = req.body;
      const normalizedPhone = normalizePhoneNumber(phone);

      // Mark all pending OTPs as verified (invalidated)
      const { data, error } = await supabase
        .from('otp_verifications')
        .update({ 
          verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('phone', normalizedPhone)
        .eq('verified', false)
        .select();

      if (error) throw error;

      // Log the action (you might want to create an audit log table)
      console.log(`OTPs invalidated for ${normalizedPhone}. Reason: ${reason || 'Not specified'}`);

      res.json({
        success: true,
        message: `Invalidated ${data?.length || 0} OTPs for phone ${phone}`,
        data: {
          invalidatedCount: data?.length || 0,
          phone: normalizedPhone,
          reason
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get verification attempts
  async getVerificationAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, status, from, to, page = 1, limit = 50 } = req.query;

      let query = supabase
        .from('otp_verifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (phone) {
        const normalizedPhone = normalizePhoneNumber(phone as string);
        query = query.eq('phone', normalizedPhone);
      }

      if (status === 'success') {
        query = query.eq('verified', true);
      } else if (status === 'failed') {
        query = query.eq('verified', false).gte('attempts', 1);
      } else if (status === 'expired') {
        query = query.eq('verified', false).lte('expires_at', new Date().toISOString());
      }

      if (from) {
        query = query.gte('created_at', from as string);
      }

      if (to) {
        query = query.lte('created_at', to as string);
      }

      // Pagination
      const offset = (Number(page) - 1) * Number(limit);
      query = query.range(offset, offset + Number(limit) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get suspicious activity
  async getSuspiciousActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { threshold = 5, window_hours = 1 } = req.query;
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - Number(window_hours));

      // Get all OTP attempts within the window
      const { data, error } = await supabase
        .from('otp_verifications')
        .select('phone')
        .gte('created_at', cutoffTime.toISOString());

      if (error) throw error;

      // Count attempts per phone
      const phoneCounts = data?.reduce((acc: any, record) => {
        acc[record.phone] = (acc[record.phone] || 0) + 1;
        return acc;
      }, {}) || {};

      // Filter suspicious phones
      const suspiciousPhones = Object.entries(phoneCounts)
        .filter(([_, count]) => count as number >= Number(threshold))
        .map(([phone, count]) => ({
          phone,
          attemptCount: count,
          windowHours: Number(window_hours),
          threshold: Number(threshold)
        }));

      res.json({
        success: true,
        data: suspiciousPhones,
        summary: {
          totalSuspicious: suspiciousPhones.length,
          threshold: Number(threshold),
          windowHours: Number(window_hours),
          cutoffTime: cutoffTime.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Block/unblock phone number
  async togglePhoneBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, blocked, reason, duration_hours } = req.body;
      const normalizedPhone = normalizePhoneNumber(phone);

      // You would need a blocked_phones table for this
      // For now, we'll invalidate all OTPs if blocking
      if (blocked) {
        const { error } = await supabase
          .from('otp_verifications')
          .update({ 
            verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('phone', normalizedPhone)
          .eq('verified', false);

        if (error) throw error;

        // TODO: Add to blocked_phones table with expiry
      }

      res.json({
        success: true,
        message: `Phone ${blocked ? 'blocked' : 'unblocked'} successfully`,
        data: {
          phone: normalizedPhone,
          blocked,
          reason,
          duration_hours,
          blockedUntil: blocked && duration_hours 
            ? new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString()
            : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Cron cleanup endpoint
  async cronCleanup(req: Request, res: Response, next: NextFunction) {
    try {
      const { api_key } = req.body;

      // Verify API key (should match environment variable)
      if (api_key !== process.env.CRON_API_KEY) {
        throw new BilingualAppError('Invalid API key', 401);
      }

      // Clean up OTPs older than 24 hours
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const { error } = await supabase
        .from('otp_verifications')
        .delete()
        .lte('expires_at', cutoffDate.toISOString());

      if (error) throw error;

      // Also clean up max attempts OTPs older than 1 hour
      const recentCutoff = new Date();
      recentCutoff.setHours(recentCutoff.getHours() - 1);

      const { error: maxAttemptsError } = await supabase
        .from('otp_verifications')
        .delete()
        .gte('attempts', 3)
        .lte('created_at', recentCutoff.toISOString());

      if (maxAttemptsError) throw maxAttemptsError;

      res.json({
        success: true,
        message: 'Cron cleanup completed',
        data: {
          message: 'Expired OTPs cleaned up successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const otpManagementController = new OTPManagementController();