import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse, PaginatedResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { bookingService, CreateBookingData, BookingFilters, BulkOperationData, BulkRescheduleData, AnalyticsFilters, AvailabilityCheckData, ReminderFilters } from '../services/booking.service';
import { BookingError } from '../types/booking-errors';
import { parseISO, format, startOfDay, endOfDay } from 'date-fns';

export class BookingController {
  async createBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId, serviceId, date, time, paymentMethod, notes } = req.body;
      
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const createData: CreateBookingData = {
        userId: req.user.id,
        providerId,
        serviceId,
        bookingDate: parseISO(date),
        startTime: time,
        paymentMethod,
        notes
      };

      const newBooking = await bookingService.createBooking(createData);

      const response: ApiResponse = {
        success: true,
        data: newBooking,
        message: 'Booking created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to create booking', 500));
      }
    }
  }

  async getUserBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const { page = 1, limit = 20, status } = req.query;
      
      const filters: BookingFilters = {
        userId: req.user.id,
        page: Number(page),
        limit: Number(limit),
        status: status as any
      };

      const result = await bookingService.getBookings(filters);

      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: result.bookings,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev,
        },
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch bookings', 500));
      }
    }
  }

  async getProviderBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId } = req.params;
      const { page = 1, limit = 20, status, date } = req.query;
      
      // Validate provider access
      if (req.user?.role !== 'admin' && req.user?.id !== providerId) {
        return next(new AppError('Insufficient permissions', 403));
      }

      const filters: BookingFilters = {
        providerId,
        page: Number(page),
        limit: Number(limit),
        status: status as any
      };

      if (date) {
        filters.dateFrom = parseISO(date as string);
        filters.dateTo = parseISO(date as string);
      }

      const result = await bookingService.getBookings(filters);

      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: result.bookings,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev,
        },
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch bookings', 500));
      }
    }
  }

  async getBookingById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const booking = await bookingService.getBookingById(id);
      
      if (!booking) {
        return next(new AppError('Booking not found', 404));
      }

      // Validate access permissions
      if (req.user?.role !== 'admin' && 
          req.user?.id !== booking.userId && 
          req.user?.id !== booking.providerId) {
        return next(new AppError('Insufficient permissions', 403));
      }

      const response: ApiResponse = {
        success: true,
        data: booking,
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch booking', 500));
      }
    }
  }

  async updateBookingStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const updatedBooking = await bookingService.updateBookingStatus({
        bookingId: id,
        newStatus: status,
        userId: req.user.id,
        userRole: req.user.role || 'customer',
        reason
      });

      const response: ApiResponse = {
        success: true,
        data: updatedBooking,
        message: `Booking ${status} successfully`,
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to update booking', 500));
      }
    }
  }

  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      await bookingService.cancelBooking(
        id,
        req.user.id,
        req.user.role || 'customer',
        reason
      );

      const response: ApiResponse = {
        success: true,
        message: 'Booking cancelled successfully',
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to cancel booking', 500));
      }
    }
  }

  async rescheduleBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { date, time, reason } = req.body;
      
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const rescheduledBooking = await bookingService.rescheduleBooking({
        bookingId: id,
        newDate: parseISO(date),
        newStartTime: time,
        userId: req.user.id,
        userRole: req.user.role || 'customer',
        reason
      });

      const response: ApiResponse = {
        success: true,
        data: rescheduledBooking,
        message: 'Booking rescheduled successfully',
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to reschedule booking', 500));
      }
    }
  }

  async getBookingHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      // Validate access to booking first
      const booking = await bookingService.getBookingById(id);
      if (!booking) {
        return next(new AppError('Booking not found', 404));
      }

      if (req.user?.role !== 'admin' && 
          req.user?.id !== booking.userId && 
          req.user?.id !== booking.providerId) {
        return next(new AppError('Insufficient permissions', 403));
      }
      
      // Get actual audit history from booking service
      const auditResult = await bookingService.getBookingHistory(id, {
        page: Number(page),
        limit: Number(limit)
      });
      
      const history = auditResult.entries;

      const response: ApiResponse = {
        success: true,
        data: history,
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch booking history', 500));
      }
    }
  }

  // ===========================================
  // ENHANCED METHODS
  // ===========================================

  /**
   * Advanced booking search with filters, sorting, and text search
   */
  async searchBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const {
        page = 1,
        limit = 20,
        search,
        status,
        dateFrom,
        dateTo,
        providerId,
        serviceId,
        minAmount,
        maxAmount,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      // Build comprehensive filters
      const filters: BookingFilters & {
        search?: string;
        minAmount?: number;
        maxAmount?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      } = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      // Apply role-based filtering
      if (req.user.role === 'customer') {
        filters.userId = req.user.id;
      } else if (req.user.role === 'provider') {
        filters.providerId = req.user.id;
      }
      // Admin can see all bookings

      // Apply additional filters
      if (search) filters.search = search as string;
      if (status) filters.status = status as any;
      if (dateFrom) filters.dateFrom = parseISO(dateFrom as string);
      if (dateTo) filters.dateTo = parseISO(dateTo as string);
      if (providerId && req.user.role === 'admin') filters.providerId = providerId as string;
      if (serviceId) filters.serviceId = serviceId as string;
      if (minAmount) filters.minAmount = Number(minAmount);
      if (maxAmount) filters.maxAmount = Number(maxAmount);

      const result = await bookingService.searchBookings(filters);

      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: result.bookings,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev,
        },
        message: `Found ${result.total} bookings`
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to search bookings', 500));
      }
    }
  }

  /**
   * Bulk operations on multiple bookings
   */
  async bulkOperation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const { bookingIds, operation, reason, newDate, newTime } = req.body;

      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return next(new AppError('Booking IDs are required', 400));
      }

      if (bookingIds.length > 50) {
        return next(new AppError('Cannot process more than 50 bookings at once', 400));
      }

      let results;
      const userRole = req.user.role || 'customer';

      switch (operation) {
        case 'cancel':
          results = await bookingService.bulkCancelBookings({
            bookingIds,
            userId: req.user.id,
            userRole,
            reason
          });
          break;

        case 'confirm':
          if (userRole !== 'provider' && userRole !== 'admin') {
            return next(new AppError('Only providers can confirm bookings', 403));
          }
          results = await bookingService.bulkConfirmBookings({
            bookingIds,
            userId: req.user.id,
            userRole,
            reason
          });
          break;

        case 'complete':
          if (userRole !== 'provider' && userRole !== 'admin') {
            return next(new AppError('Only providers can complete bookings', 403));
          }
          results = await bookingService.bulkCompleteBookings({
            bookingIds,
            userId: req.user.id,
            userRole,
            reason
          });
          break;

        case 'reschedule':
          if (!newDate || !newTime) {
            return next(new AppError('New date and time are required for reschedule', 400));
          }
          results = await bookingService.bulkRescheduleBookings({
            bookingIds,
            newDate: parseISO(newDate),
            newTime,
            userId: req.user.id,
            userRole,
            reason
          });
          break;

        default:
          return next(new AppError('Invalid operation', 400));
      }

      const response: ApiResponse = {
        success: results.successful.length > 0,
        data: results,
        message: `Bulk ${operation} completed: ${results.successful.length} successful, ${results.failed.length} failed`
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to perform bulk operation', 500));
      }
    }
  }

  /**
   * Get booking analytics and statistics
   */
  async getBookingAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const {
        period = 'month',
        startDate,
        endDate,
        providerId,
        groupBy = 'day'
      } = req.query;

      // Validate access rights
      let targetProviderId = providerId as string;
      if (req.user.role === 'provider') {
        targetProviderId = req.user.id; // Providers can only see their own analytics
      } else if (req.user.role !== 'admin') {
        return next(new AppError('Insufficient permissions for analytics', 403));
      }

      const analytics = await bookingService.getBookingAnalytics({
        period: period as string,
        startDate: startDate ? parseISO(startDate as string) : undefined,
        endDate: endDate ? parseISO(endDate as string) : undefined,
        providerId: targetProviderId,
        groupBy: groupBy as string
      });

      const response: ApiResponse = {
        success: true,
        data: analytics
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch booking analytics', 500));
      }
    }
  }

  /**
   * Get revenue analytics (admin only)
   */
  async getRevenueAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        period = 'month',
        startDate,
        endDate,
        providerId,
        includeProviderBreakdown = false
      } = req.query;

      const analytics = await bookingService.getRevenueAnalytics({
        period: period as string,
        startDate: startDate ? parseISO(startDate as string) : undefined,
        endDate: endDate ? parseISO(endDate as string) : undefined,
        providerId: providerId as string,
        includeProviderBreakdown: includeProviderBreakdown === 'true'
      });

      const response: ApiResponse = {
        success: true,
        data: analytics
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch revenue analytics', 500));
      }
    }
  }

  /**
   * Export bookings to CSV format
   */
  async exportBookingsCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const {
        dateFrom,
        dateTo,
        status,
        providerId
      } = req.query;

      // Build filters for export
      const filters: BookingFilters = {};

      // Apply role-based filtering
      if (req.user.role === 'customer') {
        filters.userId = req.user.id;
      } else if (req.user.role === 'provider') {
        filters.providerId = req.user.id;
      }

      // Apply additional filters
      if (status) filters.status = status as any;
      if (dateFrom) filters.dateFrom = parseISO(dateFrom as string);
      if (dateTo) filters.dateTo = parseISO(dateTo as string);
      if (providerId && req.user.role === 'admin') filters.providerId = providerId as string;

      const csvData = await bookingService.exportBookingsCSV(filters);

      // Set headers for CSV download
      const filename = `bookings_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      res.send(csvData);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to export bookings', 500));
      }
    }
  }

  /**
   * Check booking availability for a specific time slot
   */
  async checkAvailability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId, serviceId, date, time, duration, excludeBookingId } = req.body;

      const availability = await bookingService.checkAvailability({
        providerId,
        serviceId,
        date: parseISO(date),
        time,
        duration,
        excludeBookingId
      });

      const response: ApiResponse = {
        success: true,
        data: availability,
        message: availability.available ? 'Time slot is available' : 'Time slot is not available'
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to check availability', 500));
      }
    }
  }

  /**
   * Get upcoming booking reminders
   */
  async getBookingReminders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const {
        days = 1,
        hours = 24,
        includeConfirmed = true,
        includePending = true,
        limit = 50
      } = req.query;

      // Role-based filtering
      let targetUserId: string | undefined;
      let targetProviderId: string | undefined;

      if (req.user.role === 'customer') {
        targetUserId = req.user.id;
      } else if (req.user.role === 'provider') {
        targetProviderId = req.user.id;
      }
      // Admin can see all reminders

      const reminders = await bookingService.getBookingReminders({
        userId: targetUserId,
        providerId: targetProviderId,
        days: Number(days),
        hours: Number(hours),
        includeConfirmed: includeConfirmed === 'true',
        includePending: includePending === 'true',
        limit: Number(limit)
      });

      const response: ApiResponse = {
        success: true,
        data: reminders,
        message: `Found ${reminders.length} upcoming booking reminders`
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch booking reminders', 500));
      }
    }
  }

  /**
   * Get booking dashboard data with role-based information
   */
  async getBookingDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        return next(new AppError('User not authenticated', 401));
      }

      const { period = 'week' } = req.query;

      let dashboardData;
      
      if (req.user.role === 'customer') {
        dashboardData = await bookingService.getCustomerDashboard(req.user.id, period as string);
      } else if (req.user.role === 'provider') {
        dashboardData = await bookingService.getProviderDashboard(req.user.id, period as string);
      } else if (req.user.role === 'admin') {
        dashboardData = await bookingService.getAdminDashboard(period as string);
      } else {
        return next(new AppError('Invalid user role', 403));
      }

      const response: ApiResponse = {
        success: true,
        data: dashboardData
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(error);
      } else {
        next(new AppError('Failed to fetch dashboard data', 500));
      }
    }
  }
}

export const bookingController = new BookingController();