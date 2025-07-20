/**
 * Booking Audit Service
 * Tracks booking history and state changes for audit trail and analytics
 */

import { supabase } from '../config/supabase-simple';
import { AppError } from '../middleware/error.middleware';

export interface AuditEntry {
  id: string;
  bookingId: string;
  action: BookingAuditAction;
  userId: string;
  userRole: 'customer' | 'provider' | 'admin' | 'system';
  timestamp: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export type BookingAuditAction = 
  | 'created'
  | 'status_changed'
  | 'rescheduled'
  | 'cancelled'
  | 'payment_processed'
  | 'payment_failed'
  | 'notification_sent'
  | 'reviewed'
  | 'refunded'
  | 'system_update';

export interface CreateAuditEntryData {
  bookingId: string;
  action: BookingAuditAction;
  userId: string;
  userRole: 'customer' | 'provider' | 'admin' | 'system';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditFilters {
  bookingId?: string;
  userId?: string;
  action?: BookingAuditAction;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export class BookingAuditService {
  private static instance: BookingAuditService;

  private constructor() {}

  static getInstance(): BookingAuditService {
    if (!BookingAuditService.instance) {
      BookingAuditService.instance = new BookingAuditService();
    }
    return BookingAuditService.instance;
  }

  /**
   * Create a new audit entry
   */
  async createAuditEntry(data: CreateAuditEntryData): Promise<AuditEntry> {
    try {
      // For now, we'll create a simple audit entry
      // In a production environment, this would be stored in a dedicated audit table
      const auditEntry: AuditEntry = {
        id: this.generateAuditId(),
        bookingId: data.bookingId,
        action: data.action,
        userId: data.userId,
        userRole: data.userRole,
        timestamp: new Date().toISOString(),
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      };

      // Store in a hypothetical audit table (for now we'll just log)
      // TODO: Create actual audit table and store there
      console.log('Audit Entry Created:', auditEntry);

      // In production, you would:
      // const { data: savedEntry, error } = await supabase
      //   .from('booking_audit_log')
      //   .insert(auditEntry)
      //   .single();

      return auditEntry;
    } catch (error) {
      console.error('Failed to create audit entry:', error);
      // Don't throw errors for audit failures to avoid breaking main functionality
      return {
        id: this.generateAuditId(),
        bookingId: data.bookingId,
        action: data.action,
        userId: data.userId,
        userRole: data.userRole,
        timestamp: new Date().toISOString(),
        details: { error: 'Failed to save audit entry' }
      };
    }
  }

  /**
   * Get audit history for a booking
   */
  async getBookingAuditHistory(
    bookingId: string,
    filters: Omit<AuditFilters, 'bookingId'> = {}
  ): Promise<{
    entries: AuditEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // For now, return mock data based on booking status
      // TODO: Implement actual audit table query
      const mockEntries = this.generateMockAuditHistory(bookingId);
      
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      let filteredEntries = mockEntries;
      
      if (filters.action) {
        filteredEntries = filteredEntries.filter(entry => entry.action === filters.action);
      }
      
      if (filters.userId) {
        filteredEntries = filteredEntries.filter(entry => entry.userId === filters.userId);
      }
      
      if (filters.dateFrom) {
        filteredEntries = filteredEntries.filter(entry => 
          new Date(entry.timestamp) >= filters.dateFrom!
        );
      }
      
      if (filters.dateTo) {
        filteredEntries = filteredEntries.filter(entry => 
          new Date(entry.timestamp) <= filters.dateTo!
        );
      }
      
      const total = filteredEntries.length;
      const paginatedEntries = filteredEntries.slice(startIndex, endIndex);
      const totalPages = Math.ceil(total / limit);

      return {
        entries: paginatedEntries,
        total,
        page,
        totalPages
      };
    } catch (error) {
      throw new AppError('Failed to fetch audit history', 500);
    }
  }

  /**
   * Get audit summary for a booking
   */
  async getBookingAuditSummary(bookingId: string): Promise<{
    totalEntries: number;
    actions: Record<BookingAuditAction, number>;
    firstEntry: AuditEntry | null;
    lastEntry: AuditEntry | null;
    uniqueUsers: string[];
  }> {
    try {
      const { entries } = await this.getBookingAuditHistory(bookingId, { limit: 1000 });
      
      const actions: Record<string, number> = {};
      const uniqueUsers = new Set<string>();
      
      entries.forEach(entry => {
        actions[entry.action] = (actions[entry.action] || 0) + 1;
        uniqueUsers.add(entry.userId);
      });
      
      return {
        totalEntries: entries.length,
        actions: actions as Record<BookingAuditAction, number>,
        firstEntry: entries[entries.length - 1] || null, // Oldest first
        lastEntry: entries[0] || null, // Newest first
        uniqueUsers: Array.from(uniqueUsers)
      };
    } catch (error) {
      throw new AppError('Failed to fetch audit summary', 500);
    }
  }

  /**
   * Track booking creation
   */
  async trackBookingCreated(
    bookingId: string,
    userId: string,
    bookingData: any,
    request?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    await this.createAuditEntry({
      bookingId,
      action: 'created',
      userId,
      userRole: 'customer',
      details: {
        bookingData: this.sanitizeData(bookingData),
        timestamp: new Date().toISOString()
      },
      ipAddress: request?.ip,
      userAgent: request?.userAgent
    });
  }

  /**
   * Track status changes
   */
  async trackStatusChange(
    bookingId: string,
    userId: string,
    userRole: 'customer' | 'provider' | 'admin',
    previousStatus: string,
    newStatus: string,
    reason?: string
  ): Promise<void> {
    await this.createAuditEntry({
      bookingId,
      action: 'status_changed',
      userId,
      userRole,
      details: {
        previousStatus,
        newStatus,
        reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track rescheduling
   */
  async trackReschedule(
    bookingId: string,
    userId: string,
    userRole: 'customer' | 'provider' | 'admin',
    changes: {
      previousDate: string;
      previousTime: string;
      newDate: string;
      newTime: string;
      reason?: string;
    }
  ): Promise<void> {
    await this.createAuditEntry({
      bookingId,
      action: 'rescheduled',
      userId,
      userRole,
      details: {
        ...changes,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track payment events
   */
  async trackPayment(
    bookingId: string,
    userId: string,
    success: boolean,
    paymentDetails: any
  ): Promise<void> {
    await this.createAuditEntry({
      bookingId,
      action: success ? 'payment_processed' : 'payment_failed',
      userId,
      userRole: 'customer',
      details: {
        ...this.sanitizeData(paymentDetails),
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track system updates
   */
  async trackSystemUpdate(
    bookingId: string,
    updateType: string,
    details: any
  ): Promise<void> {
    await this.createAuditEntry({
      bookingId,
      action: 'system_update',
      userId: 'system',
      userRole: 'system',
      details: {
        updateType,
        ...this.sanitizeData(details),
        timestamp: new Date().toISOString()
      }
    });
  }

  // Private helper methods

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeData(data: any): any {
    // Remove sensitive information from audit logs
    const sanitized = { ...data };
    
    // Remove password, payment info, etc.
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'cardNumber', 'cvv'];
    
    function removeSensitive(obj: any): any {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(removeSensitive);
      }
      
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.some(sensitive => 
          key.toLowerCase().includes(sensitive.toLowerCase())
        )) {
          cleaned[key] = '[REDACTED]';
        } else {
          cleaned[key] = removeSensitive(value);
        }
      }
      return cleaned;
    }
    
    return removeSensitive(sanitized);
  }

  private generateMockAuditHistory(bookingId: string): AuditEntry[] {
    // Generate mock audit history for demonstration
    // In production, this would come from the database
    const baseTime = new Date();
    
    return [
      {
        id: `${bookingId}_1`,
        bookingId,
        action: 'created',
        userId: 'user_123',
        userRole: 'customer',
        timestamp: new Date(baseTime.getTime() - 3600000).toISOString(), // 1 hour ago
        details: { method: 'mobile_app' }
      },
      {
        id: `${bookingId}_2`,
        bookingId,
        action: 'status_changed',
        userId: 'provider_456',
        userRole: 'provider',
        timestamp: new Date(baseTime.getTime() - 1800000).toISOString(), // 30 min ago
        details: { previousStatus: 'pending', newStatus: 'confirmed' }
      }
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const bookingAuditService = BookingAuditService.getInstance();