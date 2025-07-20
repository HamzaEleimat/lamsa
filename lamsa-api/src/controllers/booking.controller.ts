import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse, PaginatedResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { bookingService, CreateBookingData, BookingFilters } from '../services/booking.service';
import { BookingError } from '../types/booking-errors';
import { parseISO, format } from 'date-fns';

export class BookingController {
  async createBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingData: CreateBookingData = req.body;
      bookingData.userId = req.user!.id;

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

  async getBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters: BookingFilters = {
        status: req.query.status as any,
        providerId: req.query.providerId as string,
        dateFrom: req.query.startDate ? parseISO(req.query.startDate as string) : undefined,
        dateTo: req.query.endDate ? parseISO(req.query.endDate as string) : undefined,
      };

      if (req.user!.type === 'customer') {
        filters.userId = req.user!.id;
      } else if (req.user!.type === 'provider') {
        filters.providerId = req.user!.id;
      }

      const result = await bookingService.getBookings({ ...filters, page, limit });

      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: {
          data: result,
        } as PaginatedResponse<any>,
        message: 'Bookings retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const booking = await bookingService.getBookingById(bookingId);

      if (!booking) {
        return next(new AppError('Booking not found', 404));
      }

      // Check ownership
      if (req.user!.type === 'customer' && (booking as any).userId !== req.user!.id) {
        return next(new AppError('Access denied', 403));
      }
      if (req.user!.type === 'provider' && (booking as any).providerId !== req.user!.id) {
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

  async updateBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const updateData = req.body;

      const booking = await bookingService.updateBookingStatus({
        bookingId,
        newStatus: updateData.status,
        userId: req.user!.id,
        userRole: req.user!.type as 'customer' | 'provider' | 'admin',
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

  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = req.params.id;
      const { reason } = req.body;

      const booking = await bookingService.cancelBooking(bookingId, req.user!.id, reason);

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

  // Placeholder for future advanced features
  async searchBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }

  async bulkOperations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }

  async getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }

  async exportBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
  }
}

export const bookingController = new BookingController();
