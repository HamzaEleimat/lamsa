import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateProvider } from '../middleware/provider.middleware';
import { apiRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication to all dashboard routes
router.use(authenticate);

// Apply rate limiting for dashboard endpoints
router.use(apiRateLimiter);

// Today's overview - high frequency endpoint
router.get(['/overview/today/:providerId', '/overview/today'], 
  validateProvider, 
  dashboardController.getTodayOverview.bind(dashboardController)
);

// Statistics with period support (week/month)
router.get(['/statistics/:providerId', '/statistics'], 
  validateProvider, 
  dashboardController.getStatistics.bind(dashboardController)
);

// Upcoming appointments with pagination
router.get(['/appointments/upcoming/:providerId', '/appointments/upcoming'], 
  validateProvider, 
  dashboardController.getUpcomingAppointments.bind(dashboardController)
);

// Reviews and ratings with filtering
router.get(['/reviews/:providerId', '/reviews'], 
  validateProvider, 
  dashboardController.getReviews.bind(dashboardController)
);

// Revenue reports with detailed breakdown
router.get(['/revenue/:providerId', '/revenue'], 
  validateProvider, 
  dashboardController.getRevenueReport.bind(dashboardController)
);

// Customer analytics and retention
router.get(['/customers/analytics/:providerId', '/customers/analytics'], 
  validateProvider, 
  dashboardController.getCustomerAnalytics.bind(dashboardController)
);

// Popular services performance
router.get(['/services/popular/:providerId', '/services/popular'], 
  validateProvider, 
  dashboardController.getPopularServices.bind(dashboardController)
);

// Performance insights and recommendations
router.get(['/insights/:providerId', '/insights'], 
  validateProvider, 
  dashboardController.getPerformanceInsights.bind(dashboardController)
);

// Get specific performance insights
router.get(['/insights/specific/:providerId', '/insights/specific'], 
  validateProvider, 
  dashboardController.getSpecificInsights.bind(dashboardController)
);

// Get market intelligence
router.get(['/market-intelligence/:providerId', '/market-intelligence'], 
  validateProvider, 
  dashboardController.getMarketIntelligence.bind(dashboardController)
);

// Get predictive analytics
router.get(['/predictions/:providerId', '/predictions'], 
  validateProvider, 
  dashboardController.getPredictiveAnalytics.bind(dashboardController)
);

// Real-time notifications
router.get(['/notifications/:providerId', '/notifications'], 
  validateProvider, 
  dashboardController.getNotifications.bind(dashboardController)
);

// Export dashboard data
router.get(['/export/:providerId', '/export'], 
  validateProvider, 
  dashboardController.exportDashboardData.bind(dashboardController)
);

export default router;