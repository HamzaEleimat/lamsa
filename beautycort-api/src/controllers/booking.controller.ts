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
      bookingData.customerId = req.user!.id;

      const booking = await bookingService.createBooking(bookingData);

      const response: ApiResponse = {
        success: true,
        data: booking,
        message: 'Booking created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(new AppError(error.message, error.statusCode, error.errorCode));
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
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      if (req.user!.type === 'customer') {
        filters.customerId = req.user!.id;
      } else if (req.user!.type === 'provider') {
        filters.providerId = req.user!.id;
      }

      const result = await bookingService.getBookings(filters, page, limit);

      const response: ApiResponse<PaginatedResponse<any>> = {
        success: true,
        data: result,
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
      if (req.user!.type === 'customer' && booking.customer_id !== req.user!.id) {
        return next(new AppError('Access denied', 403));
      }
      if (req.user!.type === 'provider' && booking.provider_id !== req.user!.id) {
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

      const booking = await bookingService.updateBooking(bookingId, updateData, req.user!);

      const response: ApiResponse = {
        success: true,
        data: booking,
        message: 'Booking updated successfully'
      };

      res.json(response);
    } catch (error) {
      if (error instanceof BookingError) {
        next(new AppError(error.message, error.statusCode, error.errorCode));
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
        next(new AppError(error.message, error.statusCode, error.errorCode));
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
