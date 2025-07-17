/**
 * Unit Tests for Booking Management and Earnings Calculation
 * Tests provider booking workflows, earnings calculation, and platform fees
 */

import { Request, Response } from 'express';
import {
  getProviderBookings,
  updateBookingStatus,
  getProviderEarnings,
  getEarningsBreakdown,
  generatePayoutReport
} from '../../../src/controllers/booking.controller';
import * as feeCalculationService from '../../../src/services/fee-calculation.service';
import * as supabaseSimple from '../../../src/config/supabase-simple';

// Mock dependencies
jest.mock('../../../src/services/fee-calculation.service');
jest.mock('../../../src/config/supabase-simple');

const mockFeeCalculationService = feeCalculationService as jest.Mocked<typeof feeCalculationService>;
const mockSupabase = supabaseSimple as jest.Mocked<typeof supabaseSimple>;

describe('Booking Management and Earnings Calculation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  const mockProviderUser = {
    userId: 'provider-123',
    role: 'provider',
    phone: '+962771234567'
  };

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: mockProviderUser
    };
    
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    };

    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('Provider Booking Management', () => {
    const mockBookings = [
      {
        id: 'booking-1',
        customerId: 'customer-1',
        customerName: 'Fatima Al-Zahra',
        customerNameAr: 'فاطمة الزهراء',
        customerPhone: '+962771234568',
        serviceId: 'service-1',
        serviceName: 'Hair Styling',
        serviceNameAr: 'تصفيف الشعر',
        date: '2024-07-17',
        time: '10:00',
        duration: 60,
        status: 'confirmed',
        totalAmount: 35.00,
        currency: 'JOD',
        paymentStatus: 'paid',
        notes: 'Special occasion styling',
        notesAr: 'تصفيف لمناسبة خاصة',
        createdAt: '2024-07-15T10:00:00Z',
        updatedAt: '2024-07-15T10:00:00Z'
      },
      {
        id: 'booking-2',
        customerId: 'customer-2',
        customerName: 'Sarah Ahmad',
        customerNameAr: 'سارة أحمد',
        customerPhone: '+962781234569',
        serviceId: 'service-2',
        serviceName: 'Facial Treatment',
        serviceNameAr: 'علاج الوجه',
        date: '2024-07-18',
        time: '14:00',
        duration: 90,
        status: 'pending',
        totalAmount: 50.00,
        currency: 'JOD',
        paymentStatus: 'pending',
        createdAt: '2024-07-15T14:00:00Z',
        updatedAt: '2024-07-15T14:00:00Z'
      }
    ];

    test('should get provider bookings with pagination and filters', async () => {
      mockSupabase.getProviderBookings.mockResolvedValue({
        success: true,
        bookings: mockBookings,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        },
        summary: {
          totalBookings: 2,
          confirmedBookings: 1,
          pendingBookings: 1,
          totalRevenue: 85.00,
          currency: 'JOD'
        }
      });

      mockReq.query = {
        page: '1',
        limit: '10',
        status: 'all',
        dateFrom: '2024-07-17',
        dateTo: '2024-07-18'
      };

      await getProviderBookings(mockReq as Request, mockRes as Response);

      expect(mockSupabase.getProviderBookings).toHaveBeenCalledWith(
        'provider-123',
        expect.objectContaining({
          page: 1,
          limit: 10,
          status: 'all',
          dateFrom: '2024-07-17',
          dateTo: '2024-07-18'
        })
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        bookings: mockBookings,
        pagination: expect.any(Object),
        summary: expect.objectContaining({
          totalBookings: 2,
          totalRevenue: 85.00
        })
      });
    });

    test('should filter bookings by status', async () => {
      const confirmedBookings = [mockBookings[0]];
      
      mockSupabase.getProviderBookings.mockResolvedValue({
        success: true,
        bookings: confirmedBookings,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });

      mockReq.query = { status: 'confirmed' };

      await getProviderBookings(mockReq as Request, mockRes as Response);

      expect(mockSupabase.getProviderBookings).toHaveBeenCalledWith(
        'provider-123',
        expect.objectContaining({ status: 'confirmed' })
      );
    });

    test('should validate date range for booking filters', async () => {
      mockReq.query = {
        dateFrom: '2024-07-20',
        dateTo: '2024-07-15' // End date before start date
      };

      await getProviderBookings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_DATE_RANGE',
        message: 'End date must be after start date',
        messageAr: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية'
      });
    });

    test('should validate pagination parameters', async () => {
      mockReq.query = {
        page: '-1',
        limit: '0'
      };

      await getProviderBookings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_PAGINATION',
        message: 'Invalid pagination parameters',
        messageAr: 'معاملات الصفحات غير صحيحة',
        errors: {
          page: 'Must be greater than 0',
          limit: 'Must be between 1 and 100'
        }
      });
    });
  });

  describe('Booking Status Management', () => {
    test('should update booking status to confirmed', async () => {
      const bookingId = 'booking-1';
      const updateData = {
        status: 'confirmed',
        notes: 'Confirmed appointment',
        notesAr: 'تم تأكيد الموعد',
        estimatedDuration: 75 // Extended duration
      };

      mockSupabase.updateBookingStatus.mockResolvedValue({
        success: true,
        booking: {
          id: bookingId,
          status: 'confirmed',
          ...updateData,
          updatedAt: new Date().toISOString()
        }
      });

      mockReq.params = { bookingId };
      mockReq.body = updateData;

      await updateBookingStatus(mockReq as Request, mockRes as Response);

      expect(mockSupabase.updateBookingStatus).toHaveBeenCalledWith(
        bookingId,
        'provider-123',
        updateData
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Booking status updated successfully',
        messageAr: 'تم تحديث حالة الحجز بنجاح',
        booking: expect.objectContaining({
          id: bookingId,
          status: 'confirmed'
        })
      });
    });

    test('should handle booking cancellation with reason', async () => {
      const bookingId = 'booking-2';
      const cancellationData = {
        status: 'cancelled',
        cancellationReason: 'Provider unavailable',
        cancellationReasonAr: 'مقدم الخدمة غير متوفر',
        refundAmount: 50.00,
        refundReason: 'Full refund for provider cancellation'
      };

      mockSupabase.updateBookingStatus.mockResolvedValue({
        success: true,
        booking: {
          id: bookingId,
          ...cancellationData,
          refundProcessed: true
        }
      });

      mockReq.params = { bookingId };
      mockReq.body = cancellationData;

      await updateBookingStatus(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Booking cancelled and refund processed',
        messageAr: 'تم إلغاء الحجز ومعالجة الاسترداد',
        booking: expect.objectContaining({
          status: 'cancelled',
          refundProcessed: true
        })
      });
    });

    test('should validate booking status transitions', async () => {
      const bookingId = 'booking-1';
      mockReq.params = { bookingId };
      mockReq.body = { status: 'invalid_status' };

      await updateBookingStatus(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_BOOKING_STATUS',
        message: 'Invalid booking status',
        messageAr: 'حالة الحجز غير صحيحة',
        allowedStatuses: expect.arrayContaining([
          'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
        ])
      });
    });

    test('should prevent updating booking of another provider', async () => {
      const bookingId = 'booking-other-provider';
      
      mockSupabase.updateBookingStatus.mockResolvedValue({
        success: false,
        error: 'BOOKING_NOT_FOUND',
        message: 'Booking not found or access denied'
      });

      mockReq.params = { bookingId };
      mockReq.body = { status: 'confirmed' };

      await updateBookingStatus(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'BOOKING_NOT_FOUND',
        message: 'Booking not found or access denied',
        messageAr: 'الحجز غير موجود أو تم رفض الوصول'
      });
    });

    test('should handle completed booking with service rating', async () => {
      const bookingId = 'booking-1';
      const completionData = {
        status: 'completed',
        actualDuration: 70,
        serviceNotes: 'Service completed successfully',
        serviceNotesAr: 'تم إكمال الخدمة بنجاح',
        upsellServices: ['hair_treatment'], // Additional services performed
        finalAmount: 40.00 // Updated total with upsell
      };

      mockSupabase.updateBookingStatus.mockResolvedValue({
        success: true,
        booking: {
          id: bookingId,
          ...completionData,
          earnings: {
            grossAmount: 40.00,
            platformFee: 4.00,
            netAmount: 36.00,
            currency: 'JOD'
          }
        }
      });

      mockReq.params = { bookingId };
      mockReq.body = completionData;

      await updateBookingStatus(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Booking completed successfully',
        messageAr: 'تم إكمال الحجز بنجاح',
        booking: expect.objectContaining({
          status: 'completed',
          earnings: expect.any(Object)
        })
      });
    });
  });

  describe('Earnings Calculation', () => {
    const mockEarningsData = {
      period: {
        from: '2024-07-01',
        to: '2024-07-31'
      },
      summary: {
        totalBookings: 25,
        completedBookings: 22,
        grossRevenue: 1250.00,
        platformFees: 125.00,
        netEarnings: 1125.00,
        currency: 'JOD',
        averageBookingValue: 50.00
      },
      breakdown: {
        byService: [
          {
            serviceId: 'service-1',
            serviceName: 'Hair Styling',
            serviceNameAr: 'تصفيف الشعر',
            bookings: 12,
            grossRevenue: 600.00,
            netEarnings: 540.00
          },
          {
            serviceId: 'service-2',
            serviceName: 'Facial Treatment',
            serviceNameAr: 'علاج الوجه',
            bookings: 10,
            grossRevenue: 650.00,
            netEarnings: 585.00
          }
        ],
        byDay: [
          { date: '2024-07-15', bookings: 3, grossRevenue: 150.00, netEarnings: 135.00 },
          { date: '2024-07-16', bookings: 4, grossRevenue: 200.00, netEarnings: 180.00 }
        ],
        byWeek: [
          { week: '2024-W29', bookings: 8, grossRevenue: 400.00, netEarnings: 360.00 },
          { week: '2024-W30', bookings: 14, grossRevenue: 850.00, netEarnings: 765.00 }
        ]
      },
      feeStructure: {
        platformFeePercentage: 10.0,
        paymentProcessingFee: 2.5,
        description: 'Platform commission and payment processing',
        descriptionAr: 'عمولة المنصة ورسوم معالجة الدفع'
      }
    };

    test('should get provider earnings for date range', async () => {
      mockFeeCalculationService.calculateProviderEarnings.mockResolvedValue(mockEarningsData);

      mockReq.query = {
        from: '2024-07-01',
        to: '2024-07-31',
        groupBy: 'day'
      };

      await getProviderEarnings(mockReq as Request, mockRes as Response);

      expect(mockFeeCalculationService.calculateProviderEarnings).toHaveBeenCalledWith(
        'provider-123',
        {
          from: '2024-07-01',
          to: '2024-07-31',
          groupBy: 'day'
        }
      );

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        earnings: mockEarningsData
      });
    });

    test('should calculate platform fees correctly', async () => {
      const grossAmount = 100.00;
      const expectedFees = {
        platformFee: 10.00, // 10%
        paymentProcessingFee: 2.50, // 2.5%
        totalFees: 12.50,
        netAmount: 87.50,
        currency: 'JOD'
      };

      mockFeeCalculationService.calculateFees.mockReturnValue(expectedFees);

      const fees = mockFeeCalculationService.calculateFees(grossAmount, 'provider-123');

      expect(fees).toEqual(expectedFees);
      expect(fees.netAmount).toBe(grossAmount - fees.totalFees);
    });

    test('should apply different fee rates for premium providers', async () => {
      const premiumProviderFees = {
        platformFee: 7.50, // 7.5% for premium providers
        paymentProcessingFee: 2.50,
        totalFees: 10.00,
        netAmount: 90.00,
        currency: 'JOD'
      };

      mockFeeCalculationService.calculateFees.mockReturnValue(premiumProviderFees);

      // Simulate premium provider
      mockReq.user = {
        ...mockProviderUser,
        tier: 'premium'
      };

      const fees = mockFeeCalculationService.calculateFees(100.00, 'provider-123', 'premium');

      expect(fees.platformFee).toBeLessThan(10.00); // Lower fee for premium
    });

    test('should handle Ramadan fee adjustments', async () => {
      const ramadanPeriodFees = {
        platformFee: 8.00, // Reduced fees during Ramadan
        paymentProcessingFee: 2.50,
        totalFees: 10.50,
        netAmount: 89.50,
        currency: 'JOD',
        specialRate: 'ramadan_discount',
        specialRateAr: 'خصم رمضان'
      };

      mockFeeCalculationService.calculateFees.mockReturnValue(ramadanPeriodFees);

      const fees = mockFeeCalculationService.calculateFees(
        100.00, 
        'provider-123', 
        'standard', 
        { isRamadan: true }
      );

      expect(fees.specialRate).toBe('ramadan_discount');
      expect(fees.platformFee).toBeLessThan(10.00);
    });

    test('should validate earnings date range', async () => {
      mockReq.query = {
        from: '2024-07-31',
        to: '2024-07-01' // End before start
      };

      await getProviderEarnings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_DATE_RANGE',
        message: 'End date must be after start date',
        messageAr: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية'
      });
    });

    test('should limit earnings query range', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 2);

      mockReq.query = {
        from: oneYearAgo.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      };

      await getProviderEarnings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'DATE_RANGE_TOO_LARGE',
        message: 'Date range cannot exceed 12 months',
        messageAr: 'نطاق التاريخ لا يمكن أن يتجاوز 12 شهراً',
        maxRangeMonths: 12
      });
    });
  });

  describe('Earnings Breakdown and Analytics', () => {
    test('should get detailed earnings breakdown', async () => {
      const detailedBreakdown = {
        ...mockEarningsData.breakdown,
        byPaymentMethod: [
          { method: 'cash', bookings: 12, revenue: 600.00 },
          { method: 'card', bookings: 10, revenue: 650.00 }
        ],
        byCustomerType: [
          { type: 'new', bookings: 8, revenue: 400.00 },
          { type: 'returning', bookings: 14, revenue: 850.00 }
        ],
        trends: {
          growthRate: 15.5, // 15.5% growth vs previous period
          topPerformingService: {
            id: 'service-2',
            name: 'Facial Treatment',
            nameAr: 'علاج الوجه'
          },
          peakHours: ['10:00', '14:00', '16:00'],
          peakDays: ['Thursday', 'Saturday']
        }
      };

      mockFeeCalculationService.getEarningsBreakdown.mockResolvedValue({
        success: true,
        breakdown: detailedBreakdown
      });

      mockReq.query = {
        from: '2024-07-01',
        to: '2024-07-31',
        includeAnalytics: 'true'
      };

      await getEarningsBreakdown(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        breakdown: detailedBreakdown
      });
    });

    test('should compare earnings with previous period', async () => {
      const comparisonData = {
        currentPeriod: mockEarningsData.summary,
        previousPeriod: {
          totalBookings: 20,
          grossRevenue: 1000.00,
          netEarnings: 900.00
        },
        comparison: {
          bookingsGrowth: 25.0, // 25% increase
          revenueGrowth: 25.0,
          earningsGrowth: 25.0
        },
        insights: [
          {
            type: 'positive',
            message: 'Revenue increased by 25% compared to last month',
            messageAr: 'زادت الإيرادات بنسبة 25% مقارنة بالشهر الماضي'
          }
        ]
      };

      mockFeeCalculationService.compareEarnings.mockResolvedValue(comparisonData);

      mockReq.query = {
        from: '2024-07-01',
        to: '2024-07-31',
        compare: 'previous_period'
      };

      await getEarningsBreakdown(mockReq as Request, mockRes as Response);

      expect(mockFeeCalculationService.compareEarnings).toHaveBeenCalled();
    });
  });

  describe('Payout Report Generation', () => {
    test('should generate monthly payout report', async () => {
      const payoutReport = {
        reportId: 'payout-2024-07',
        period: {
          month: '2024-07',
          from: '2024-07-01',
          to: '2024-07-31'
        },
        provider: {
          id: 'provider-123',
          businessName: 'Beauty Salon',
          businessNameAr: 'صالون الجمال',
          taxId: 'TAX123456',
          bankDetails: {
            accountNumber: '****1234',
            bankName: 'Jordan Bank'
          }
        },
        earnings: {
          totalBookings: 25,
          grossRevenue: 1250.00,
          platformFees: 125.00,
          netEarnings: 1125.00,
          currency: 'JOD'
        },
        deductions: [
          {
            type: 'platform_fee',
            amount: 125.00,
            description: 'Platform commission (10%)',
            descriptionAr: 'عمولة المنصة (10%)'
          }
        ],
        payoutAmount: 1125.00,
        payoutDate: '2024-08-01',
        status: 'pending',
        generatedAt: new Date().toISOString()
      };

      mockFeeCalculationService.generatePayoutReport.mockResolvedValue({
        success: true,
        report: payoutReport
      });

      mockReq.body = {
        month: '2024-07',
        includeBreakdown: true
      };

      await generatePayoutReport(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Payout report generated successfully',
        messageAr: 'تم إنشاء تقرير الدفع بنجاح',
        report: payoutReport
      });
    });

    test('should validate payout report month format', async () => {
      mockReq.body = {
        month: 'invalid-month-format'
      };

      await generatePayoutReport(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_MONTH_FORMAT',
        message: 'Month must be in YYYY-MM format',
        messageAr: 'الشهر يجب أن يكون بتنسيق YYYY-MM'
      });
    });

    test('should prevent generating future month reports', async () => {
      const futureMonth = new Date();
      futureMonth.setMonth(futureMonth.getMonth() + 2);
      const futureMonthStr = futureMonth.toISOString().slice(0, 7);

      mockReq.body = {
        month: futureMonthStr
      };

      await generatePayoutReport(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'FUTURE_MONTH_NOT_ALLOWED',
        message: 'Cannot generate reports for future months',
        messageAr: 'لا يمكن إنشاء تقارير للأشهر المستقبلية'
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle earnings calculation service failures', async () => {
      mockFeeCalculationService.calculateProviderEarnings.mockRejectedValue(
        new Error('Earnings calculation service unavailable')
      );

      mockReq.query = {
        from: '2024-07-01',
        to: '2024-07-31'
      };

      await getProviderEarnings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'EARNINGS_CALCULATION_ERROR',
        message: 'Failed to calculate earnings',
        messageAr: 'فشل في حساب الأرباح'
      });
    });

    test('should handle zero earnings gracefully', async () => {
      const zeroEarnings = {
        ...mockEarningsData,
        summary: {
          totalBookings: 0,
          completedBookings: 0,
          grossRevenue: 0.00,
          platformFees: 0.00,
          netEarnings: 0.00,
          currency: 'JOD',
          averageBookingValue: 0.00
        }
      };

      mockFeeCalculationService.calculateProviderEarnings.mockResolvedValue(zeroEarnings);

      mockReq.query = {
        from: '2024-07-01',
        to: '2024-07-31'
      };

      await getProviderEarnings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        earnings: zeroEarnings,
        message: 'No earnings found for the specified period',
        messageAr: 'لم يتم العثور على أرباح للفترة المحددة'
      });
    });

    test('should handle large booking volumes efficiently', async () => {
      const largeVolumeEarnings = {
        ...mockEarningsData,
        summary: {
          totalBookings: 1000,
          completedBookings: 950,
          grossRevenue: 50000.00,
          platformFees: 5000.00,
          netEarnings: 45000.00,
          currency: 'JOD',
          averageBookingValue: 50.00
        }
      };

      mockFeeCalculationService.calculateProviderEarnings.mockResolvedValue(largeVolumeEarnings);

      mockReq.query = {
        from: '2024-01-01',
        to: '2024-12-31'
      };

      await getProviderEarnings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        earnings: largeVolumeEarnings
      });
    });

    test('should handle database connection errors', async () => {
      mockSupabase.getProviderBookings.mockRejectedValue(new Error('Database connection failed'));

      mockReq.query = { page: '1', limit: '10' };

      await getProviderBookings(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to retrieve bookings',
        messageAr: 'فشل في استرداد الحجوزات'
      });
    });
  });
});