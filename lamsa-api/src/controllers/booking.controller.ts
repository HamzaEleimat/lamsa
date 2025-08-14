import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse, PaginatedResponse } from '../types';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';
import { 
  bookingService, 
  CreateBookingData, 
  BookingFilters,
  BookingWithDetails,
  AvailabilityCheckData,
  AvailabilityResult,
  ReminderFilters,
  BookingReminder,
  RescheduleBookingData
} from '../services/booking.service';
import { BookingError } from '../types/booking-errors';
import { parseISO, format, isValid } from 'date-fns';
import { assertAuthenticated, assertDefined, isDefined } from '../utils/null-safety';
import { parseAndValidateDate, parseAndValidateDateRequired } from '../utils/date-validation';

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

export class BookingController {
  /**
   * Helper method to handle BookingError consistently across all controller methods
   * Converts BookingError instances to AppError with proper status code and error code
   */
  private handleBookingError(error: any, next: NextFunction): void {
    console.error('🔍 BookingController Error Details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      isBookingError: error instanceof BookingError,
      fullError: error
    });
    
    if (error instanceof BookingError) {
      next(new BilingualAppError(error.message, (error as any).statusCode || 400, (error as any).code));
    } else {
      next(error);
    }
  }

  createBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use null safety helper instead of non-null assertion
      assertAuthenticated(req, 'Authentication required to create booking');
      
      // Map from validation format (date, time) to service format (bookingDate, startTime)
      const bookingData: CreateBookingData = {
        userId: req.user.id,
        providerId: req.body.providerId,
        serviceId: req.body.serviceId,
        bookingDate: new Date(req.body.date),
        startTime: req.body.time,
        endTime: req.body.endTime,
        paymentMethod: req.body.paymentMethod
      };

      const booking = await bookingService.createBooking(bookingData);

      const response: ApiResponse = {
        success: true,
        data: booking,
        message: 'Booking created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleBookingError(error, next);
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
        dateFrom: parseAndValidateDate(req.query.startDate as string, 'start date'),
        dateTo: parseAndValidateDate(req.query.endDate as string, 'end date'),
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
      this.handleBookingError(error, next);
    }
  }

  async getProviderBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters: BookingFilters = {
        dateFrom: parseAndValidateDate(req.query.startDate as string, 'start date'),
        dateTo: parseAndValidateDate(req.query.endDate as string, 'end date'),
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
      this.handleBookingError(error, next);
    }
  }

  async getBookingById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const bookingId = req.params.id;
      const booking = await bookingService.getBookingById(bookingId);

      if (!booking) {
        return next(new BilingualAppError('Booking not found', 404));
      }

      // Check ownership based on user type
      if (req.user.type === 'customer' && booking.userId !== req.user.id) {
        return next(new BilingualAppError('Access denied', 403));
      }
      if (req.user.type === 'provider' && booking.providerId !== req.user.id) {
        return next(new BilingualAppError('Access denied', 403));
      }

      const response: ApiResponse = {
        success: true,
        data: booking,
        message: 'Booking retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      this.handleBookingError(error, next);
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
      this.handleBookingError(error, next);
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
        newDate: parseAndValidateDateRequired(newDate, 'new date'),
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
      this.handleBookingError(error, next);
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
      this.handleBookingError(error, next);
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
      this.handleBookingError(error, next);
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
        date: parseAndValidateDateRequired(date, 'booking date'),
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
      this.handleBookingError(error, next);
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
      this.handleBookingError(error, next);
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
      this.handleBookingError(error, next);
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
        dateFrom: parseAndValidateDate(req.query.dateFrom as string, 'date from'),
        dateTo: parseAndValidateDate(req.query.dateTo as string, 'date to'),
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
      this.handleBookingError(error, next);
    }
  }

  async getRevenueAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertAuthenticated(req);
      
      const filters: AnalyticsFilters = {
        dateFrom: parseAndValidateDate(req.query.dateFrom as string, 'date from'),
        dateTo: parseAndValidateDate(req.query.dateTo as string, 'date to'),
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
      this.handleBookingError(error, next);
    }
  }

  async exportBookingsCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }
}

export const bookingController = new BookingController();