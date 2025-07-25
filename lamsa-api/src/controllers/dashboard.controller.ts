import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
// import { supabase } from '../config/supabase-simple'; // Unused
import { DashboardService } from '../services/dashboard.service';
import { AnalyticsService } from '../services/analytics.service';
// import { performanceInsightsService } from '../services/performance-insights.service'; // Temporarily disabled
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';

export class DashboardController {
  private dashboardService: DashboardService;
  private analyticsService: AnalyticsService;

  constructor() {
    this.dashboardService = new DashboardService();
    this.analyticsService = new AnalyticsService();
  }

  // Today's overview with real-time metrics
  async getTodayOverview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      // Get today's date range
      const today = new Date();
      const startDate = startOfDay(today);
      const endDate = endOfDay(today);

      // Fetch multiple data points in parallel
      const [
        todayAppointments,
        todayStats,
        realtimeMetrics,
        nextAppointment,
        dailyGoals
      ] = await Promise.all([
        // Today's appointments with customer details
        this.dashboardService.getTodayAppointments(providerId, startDate, endDate),
        
        // Today's statistics
        this.dashboardService.getTodayStats(providerId, startDate, endDate),
        
        // Real-time metrics
        this.dashboardService.getRealtimeMetrics(providerId),
        
        // Next upcoming appointment
        this.dashboardService.getNextAppointment(providerId),
        
        // Today's goals and challenges
        this.dashboardService.getDailyGoals(providerId, today)
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          date: format(today, 'yyyy-MM-dd'),
          appointments: todayAppointments,
          stats: todayStats,
          realtime: realtimeMetrics,
          nextAppointment,
          dailyGoals,
          lastUpdated: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Weekly/Monthly statistics with comparisons
  async getStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { period = 'week', date } = req.query;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      const referenceDate = date ? new Date(date as string) : new Date();
      let startDate: Date;
      let endDate: Date;
      let previousStartDate: Date;
      let previousEndDate: Date;

      // Calculate date ranges based on period
      if (period === 'week') {
        startDate = startOfWeek(referenceDate, { weekStartsOn: 0 }); // Sunday
        endDate = endOfWeek(referenceDate, { weekStartsOn: 0 });
        previousStartDate = subDays(startDate, 7);
        previousEndDate = subDays(endDate, 7);
      } else if (period === 'month') {
        startDate = startOfMonth(referenceDate);
        endDate = endOfMonth(referenceDate);
        previousStartDate = startOfMonth(subMonths(referenceDate, 1));
        previousEndDate = endOfMonth(subMonths(referenceDate, 1));
      } else {
        throw new AppError('Invalid period. Use "week" or "month"', 400);
      }

      // Fetch current and previous period data
      const [currentStats, previousStats, trends, achievements] = await Promise.all([
        this.analyticsService.getPeriodStatistics(providerId, startDate, endDate, period as string),
        this.analyticsService.getPeriodStatistics(providerId, previousStartDate, previousEndDate, period as string),
        this.analyticsService.getStatisticsTrends(providerId, startDate, endDate),
        this.analyticsService.checkAndAwardAchievements(providerId)
      ]);

      // Calculate growth percentages
      const growth = this.analyticsService.calculateGrowth(currentStats, previousStats);

      const response: ApiResponse = {
        success: true,
        data: {
          period,
          dateRange: {
            start: format(startDate, 'yyyy-MM-dd'),
            end: format(endDate, 'yyyy-MM-dd')
          },
          current: currentStats,
          previous: previousStats,
          growth,
          trends,
          newAchievements: achievements
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Upcoming appointments with pagination
  async getUpcomingAppointments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { page = 1, limit = 20, days = 7 } = req.query;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + Number(days));

      const appointments = await this.dashboardService.getUpcomingAppointments(
        providerId,
        startDate,
        endDate,
        Number(page),
        Number(limit)
      );

      const response: ApiResponse = {
        success: true,
        data: appointments
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Recent reviews and ratings with sentiment analysis
  async getReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { page = 1, limit = 10, sentiment, rating, needsResponse } = req.query;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      const filters = {
        sentiment: sentiment as string,
        rating: rating ? Number(rating) : undefined,
        needsResponse: needsResponse === 'true'
      };

      const reviews = await this.dashboardService.getReviews(
        providerId,
        Number(page),
        Number(limit),
        filters
      );

      // Get review insights
      const insights = await this.analyticsService.getReviewInsights(providerId);

      const response: ApiResponse = {
        success: true,
        data: {
          reviews: reviews.data,
          pagination: {
            total: reviews.total,
            page: reviews.page,
            totalPages: reviews.totalPages,
            hasNext: reviews.hasNext,
            hasPrev: reviews.hasPrev
          },
          insights
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Revenue reports with breakdown
  async getRevenueReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { period = 'month', date, groupBy = 'day' } = req.query;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      const referenceDate = date ? new Date(date as string) : new Date();
      let startDate: Date;
      let endDate: Date;

      // Calculate date range
      if (period === 'week') {
        startDate = startOfWeek(referenceDate, { weekStartsOn: 0 });
        endDate = endOfWeek(referenceDate, { weekStartsOn: 0 });
      } else if (period === 'month') {
        startDate = startOfMonth(referenceDate);
        endDate = endOfMonth(referenceDate);
      } else if (period === 'custom' && req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
      } else {
        throw new AppError('Invalid period or missing date range', 400);
      }

      // Fetch revenue data
      const [
        revenueReport,
        serviceBreakdown,
        paymentMethodBreakdown,
        taxReport,
        pendingPayouts
      ] = await Promise.all([
        this.analyticsService.getRevenueReport(providerId, startDate, endDate, groupBy as string),
        this.analyticsService.getServiceRevenueBreakdown(providerId, startDate, endDate),
        this.analyticsService.getPaymentMethodBreakdown(providerId, startDate, endDate),
        this.analyticsService.getTaxReport(providerId, startDate, endDate),
        this.analyticsService.getPendingPayouts(providerId)
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          period,
          dateRange: {
            start: format(startDate, 'yyyy-MM-dd'),
            end: format(endDate, 'yyyy-MM-dd')
          },
          summary: revenueReport.summary,
          timeline: revenueReport.timeline,
          serviceBreakdown,
          paymentMethods: paymentMethodBreakdown,
          tax: taxReport,
          pendingPayouts
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Customer analytics with retention metrics
  async getCustomerAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { period = 'month', includeChurned = false } = req.query;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      const referenceDate = new Date();
      let startDate: Date;
      let endDate: Date;

      if (period === 'month') {
        startDate = startOfMonth(referenceDate);
        endDate = endOfMonth(referenceDate);
      } else if (period === 'quarter') {
        startDate = new Date(referenceDate.getFullYear(), Math.floor(referenceDate.getMonth() / 3) * 3, 1);
        endDate = new Date(referenceDate.getFullYear(), Math.floor(referenceDate.getMonth() / 3) * 3 + 3, 0);
      } else {
        throw new AppError('Invalid period. Use "month" or "quarter"', 400);
      }

      // Fetch customer data
      const [
        customerSegments,
        retentionMetrics,
        lifetimeValues,
        churnRisk,
        topCustomers,
        acquisitionChannels
      ] = await Promise.all([
        this.analyticsService.getCustomerSegments(providerId),
        this.analyticsService.getRetentionMetrics(providerId, startDate, endDate),
        this.analyticsService.getCustomerLifetimeValues(providerId),
        this.analyticsService.getChurnRiskCustomers(providerId, includeChurned === 'true'),
        this.analyticsService.getTopCustomers(providerId, 10),
        this.analyticsService.getCustomerAcquisitionChannels(providerId, startDate, endDate)
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          period,
          dateRange: {
            start: format(startDate, 'yyyy-MM-dd'),
            end: format(endDate, 'yyyy-MM-dd')
          },
          segments: customerSegments,
          retention: retentionMetrics,
          lifetimeValue: lifetimeValues,
          churnRisk,
          topCustomers,
          acquisitionChannels
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Popular services report with performance metrics
  async getPopularServices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { period = 'month', limit = 10, sortBy = 'bookings' } = req.query;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      const referenceDate = new Date();
      let startDate: Date;
      let endDate: Date;

      if (period === 'week') {
        startDate = startOfWeek(referenceDate);
        endDate = endOfWeek(referenceDate);
      } else if (period === 'month') {
        startDate = startOfMonth(referenceDate);
        endDate = endOfMonth(referenceDate);
      } else {
        throw new AppError('Invalid period', 400);
      }

      // Fetch service performance data
      const [
        servicePerformance,
        serviceComparisons,
        underperformingServices,
        serviceRecommendations
      ] = await Promise.all([
        this.analyticsService.getServicePerformance(providerId, startDate, endDate, Number(limit), sortBy as string),
        this.analyticsService.getServiceComparisons(providerId, startDate, endDate),
        this.analyticsService.getUnderperformingServices(providerId, startDate, endDate),
        this.analyticsService.getServiceRecommendations(providerId)
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          period,
          dateRange: {
            start: format(startDate, 'yyyy-MM-dd'),
            end: format(endDate, 'yyyy-MM-dd')
          },
          topServices: servicePerformance,
          comparisons: serviceComparisons,
          underperforming: underperformingServices,
          recommendations: serviceRecommendations
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Performance insights and recommendations
  async getPerformanceInsights(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      // Generate comprehensive business intelligence report
      // const businessIntelligence = await performanceInsightsService.generateBusinessIntelligenceReport(providerId);
      const businessIntelligence = { insights: [], kpis: {} }; // Temporary placeholder

      const response: ApiResponse = {
        success: true,
        data: businessIntelligence
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get specific performance insights
  async getSpecificInsights(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      // const insights = await performanceInsightsService.generatePerformanceInsights(providerId);
      const insights: any[] = []; // Temporary placeholder

      const response: ApiResponse = {
        success: true,
        data: {
          insights,
          summary: {
            total: insights.length,
            highPriority: insights.filter(i => i.impact === 'high').length,
            actionable: insights.filter(i => i.actionable).length
          }
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get market intelligence
  async getMarketIntelligence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      // const marketIntelligence = await performanceInsightsService.getMarketIntelligence(providerId);
      const marketIntelligence = { trends: [], opportunities: [] }; // Temporary placeholder

      const response: ApiResponse = {
        success: true,
        data: marketIntelligence
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get predictive analytics
  async getPredictiveAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      // const predictions = await performanceInsightsService.getPredictiveAnalytics(providerId);
      const predictions = { revenue: {}, customers: {} }; // Temporary placeholder

      const response: ApiResponse = {
        success: true,
        data: predictions
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Real-time notifications and alerts
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { unreadOnly = false, type } = req.query;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      const notifications = await this.dashboardService.getNotifications(
        providerId,
        unreadOnly === 'true',
        type as string
      );

      const response: ApiResponse = {
        success: true,
        data: notifications
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Export dashboard data
  async exportDashboardData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { format = 'csv', dataType, startDate, endDate } = req.query;
      
      if (!providerId) {
        throw new AppError('Provider ID is required', 400);
      }

      if (!dataType || !startDate || !endDate) {
        throw new AppError('Data type and date range are required', 400);
      }

      const exportData = await this.analyticsService.exportData(
        providerId,
        dataType as string,
        new Date(startDate as string),
        new Date(endDate as string),
        format as string
      );

      // Set appropriate headers based on format
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${dataType}-export-${Date.now()}.csv"`);
      } else if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${dataType}-export-${Date.now()}.xlsx"`);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${dataType}-export-${Date.now()}.pdf"`);
      }

      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();