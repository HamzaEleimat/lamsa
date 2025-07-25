import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse, PaginatedResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { 
  bookingService, 
  CreateBookingData, 
  BookingFilters,
  AvailabilityCheckData,
  AvailabilityResult,
  ReminderFilters,
  BookingReminder,
  RescheduleBookingData
} from '../services/booking.service';
import { BookingError } from '../types/booking-errors';
import { parseISO, format } from 'date-fns';
import { assertAuthenticated, assertDefined, isDefined } from '../utils/null-safety';

// Interfaces remain the same
interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  serviceId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  providerId?: string;
  userId?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export class SafeBookingController {
  async createBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Use null safety helper instead of non-null assertion
      assertAuthenticated(req, 'Authentication required to create booking');
      
      const bookingData: CreateBookingData = req.body;
      bookingData.userId = req.user.id; // Now TypeScript knows user exists

      const booking = await bookingService.createBooking(bookingData);

      const response: ApiResponse = {
        success: true,
        data: booking,
        message: 'Booking created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(new AppError(error.message, (error as any).statusCode, (error as any).errorCode));
      } else {
        next(error);
      }
    }
  }

  async getUserBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Ensure user is authenticated
      assertAuthenticated(req);
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters: BookingFilters = {
        status: req.query.status as any,
        providerId: req.query.providerId as string,
        dateFrom: req.query.startDate ? parseISO(req.query.startDate as string) : undefined,
        dateTo: req.query.endDate ? parseISO(req.query.endDate as string) : undefined,
      };

      // Safe access to user properties
      if (req.user.type === 'customer') {
        filters.userId = req.user.id;
      } else if (req.user.type === 'provider') {
        filters.providerId = req.user.id;
      }

      const result = await bookingService.getBookings({ ...filters, page, limit });

      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: result.bookings,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        },
        message: 'Bookings retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProviderBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters: BookingFilters = {
        dateFrom: req.query.startDate ? parseISO(req.query.startDate as string) : undefined,
        dateTo: req.query.endDate ? parseISO(req.query.endDate as string) : undefined,
        providerId: providerId
      };

      const result = await bookingService.getBookings({ ...filters, page, limit });

      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: result.bookings,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        },
        message: 'Provider bookings retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const bookingId = req.params.id;
      const booking = await bookingService.getBookingById(bookingId);

      if (!booking) {
        return next(new AppError('Booking not found', 404));
      }

      // Safe property access for ownership check
      const bookingWithDetails = booking as any;
      if (req.user.type === 'customer' && bookingWithDetails.userId !== req.user.id) {
        return next(new AppError('Access denied', 403));
      }
      if (req.user.type === 'provider' && bookingWithDetails.providerId !== req.user.id) {
        return next(new AppError('Access denied', 403));
      }

      const response: ApiResponse = {
        success: true,
        data: booking,
        message: 'Booking retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateBookingStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const bookingId = req.params.id;
      const updateData = req.body;

      // Validate required fields
      assertDefined(updateData.status, 'Status is required', 400);

      const booking = await bookingService.updateBookingStatus({
        bookingId,
        newStatus: updateData.status,
        userId: req.user.id,
        userRole: req.user.type as 'customer' | 'provider' | 'admin',
        reason: updateData.reason
      });

      const response: ApiResponse = {
        success: true,
        data: booking,
        message: 'Booking updated successfully'
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(new AppError(error.message, (error as any).statusCode, (error as any).errorCode));
      } else {
        next(error);
      }
    }
  }

  async rescheduleBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const bookingId = req.params.id;
      const { newDate, newStartTime, newEndTime } = req.body;

      // Validate required fields
      assertDefined(newDate, 'New date is required', 400);
      assertDefined(newStartTime, 'New start time is required', 400);

      const rescheduleData: RescheduleBookingData = {
        bookingId,
        newDate: parseISO(newDate),
        newStartTime,
        userId: req.user.id,
        userRole: req.user.type as 'customer' | 'provider' | 'admin',
        reason: req.body.reason
      };

      const updatedBooking = await bookingService.rescheduleBooking(rescheduleData);

      const response: ApiResponse = {
        success: true,
        data: updatedBooking,
        message: 'Booking rescheduled successfully'
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(new AppError(error.message, (error as any).statusCode, (error as any).errorCode));
      } else {
        next(error);
      }
    }
  }

  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const bookingId = req.params.id;
      const { reason } = req.body;

      const booking = await bookingService.cancelBooking(bookingId, req.user.id, reason);

      const response: ApiResponse = {
        success: true,
        data: booking,
        message: 'Booking cancelled successfully'
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(new AppError(error.message, (error as any).statusCode, (error as any).errorCode));
      } else {
        next(error);
      }
    }
  }

  async getBookingHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const userId = req.user.id;
      const userType = req.user.type;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const filters: BookingFilters = {};

      if (userType === 'customer') {
        filters.userId = userId;
      } else if (userType === 'provider') {
        filters.providerId = userId;
      }

      const result = await bookingService.getBookings({ ...filters, page, limit });

      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: result.bookings,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        },
        message: 'Booking history retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async checkAvailability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate required fields
      const { providerId, serviceId, date, time, startTime, duration } = req.body;
      
      assertDefined(providerId, 'Provider ID is required', 400);
      assertDefined(serviceId, 'Service ID is required', 400);
      assertDefined(date, 'Date is required', 400);

      const availabilityData: AvailabilityCheckData = {
        providerId,
        serviceId,
        date: parseISO(date),
        time: time || startTime,
        duration
      };

      const availability = await bookingService.checkAvailability(availabilityData);

      const response: ApiResponse<AvailabilityResult> = {
        success: true,
        data: availability,
        message: 'Availability checked successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getBookingReminders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const filters: ReminderFilters = {
        hours: parseInt(req.query.hours as string) || 24,
        days: parseInt(req.query.days as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        userId: req.user.type === 'customer' ? req.user.id : undefined,
        providerId: req.user.type === 'provider' ? req.user.id : undefined,
        includeConfirmed: req.query.includeConfirmed !== 'false',
        includePending: req.query.includePending !== 'false'
      };

      const reminders = await bookingService.getBookingReminders(filters);

      const response: ApiResponse<BookingReminder[]> = {
        success: true,
        data: reminders,
        message: 'Booking reminders retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getBookingDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const userId = req.user.id;
      const userType = req.user.type;
      
      // TODO: Implement dashboard data aggregation
      const dashboardData = {
        totalBookings: 0,
        upcomingBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        revenue: userType === 'provider' ? 0 : undefined,
        averageRating: userType === 'provider' ? 0 : undefined
      };

      const response: ApiResponse = {
        success: true,
        data: dashboardData,
        message: 'Dashboard data retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Placeholder methods remain the same
  async searchBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }

  async bulkOperation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }

  async getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }

  async getBookingAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? parseISO(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? parseISO(req.query.dateTo as string) : undefined,
        providerId: req.query.providerId as string,
        userId: req.query.userId as string,
        groupBy: req.query.groupBy as 'day' | 'week' | 'month'
      };

      // TODO: Implement getBookingAnalytics in BookingService
      const analytics = { totalBookings: 0, data: [] };

      const response: ApiResponse = {
        success: true,
        data: analytics,
        message: 'Booking analytics retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getRevenueAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? parseISO(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? parseISO(req.query.dateTo as string) : undefined,
        providerId: req.user.type === 'provider' ? req.user.id : req.query.providerId as string,
        groupBy: req.query.groupBy as 'day' | 'week' | 'month'
      };

      // TODO: Implement getRevenueAnalytics in BookingService
      const revenue = { totalRevenue: 0, data: [] };

      const response: ApiResponse = {
        success: true,
        data: revenue,
        message: 'Revenue analytics retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async exportBookingsCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }
}

export const safeBookingController = new SafeBookingController();