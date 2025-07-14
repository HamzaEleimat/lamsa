import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateProvider } from '../middleware/provider.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

// Apply rate limiting for dashboard endpoints
router.use(rateLimitMiddleware);

// Today's overview - high frequency endpoint
router.get('/overview/today/:providerId?', 
  validateProvider, 
  dashboardController.getTodayOverview.bind(dashboardController)
);

// Statistics with period support (week/month)
router.get('/statistics/:providerId?', 
  validateProvider, 
  dashboardController.getStatistics.bind(dashboardController)
);

// Upcoming appointments with pagination
router.get('/appointments/upcoming/:providerId?', 
  validateProvider, 
  dashboardController.getUpcomingAppointments.bind(dashboardController)
);

// Reviews and ratings with filtering
router.get('/reviews/:providerId?', 
  validateProvider, 
  dashboardController.getReviews.bind(dashboardController)
);

// Revenue reports with detailed breakdown
router.get('/revenue/:providerId?', 
  validateProvider, 
  dashboardController.getRevenueReport.bind(dashboardController)
);

// Customer analytics and retention
router.get('/customers/analytics/:providerId?', 
  validateProvider, 
  dashboardController.getCustomerAnalytics.bind(dashboardController)
);

// Popular services performance
router.get('/services/popular/:providerId?', 
  validateProvider, 
  dashboardController.getPopularServices.bind(dashboardController)
);

// Performance insights and recommendations
router.get('/insights/:providerId?', 
  validateProvider, 
  dashboardController.getPerformanceInsights.bind(dashboardController)
);

// Get specific performance insights
router.get('/insights/specific/:providerId?', 
  validateProvider, 
  dashboardController.getSpecificInsights.bind(dashboardController)
);

// Get market intelligence
router.get('/market-intelligence/:providerId?', 
  validateProvider, 
  dashboardController.getMarketIntelligence.bind(dashboardController)
);

// Get predictive analytics
router.get('/predictions/:providerId?', 
  validateProvider, 
  dashboardController.getPredictiveAnalytics.bind(dashboardController)
);

// Real-time notifications
router.get('/notifications/:providerId?', 
  validateProvider, 
  dashboardController.getNotifications.bind(dashboardController)
);

// Export dashboard data
router.get('/export/:providerId?', 
  validateProvider, 
  dashboardController.exportDashboardData.bind(dashboardController)
);

export default router;