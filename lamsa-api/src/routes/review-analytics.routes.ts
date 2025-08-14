import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { validateProvider } from '../middleware/provider.middleware';
import { apiRateLimiter } from '../middleware/rate-limit.middleware';
import { ReviewAnalyticsService } from '../services/review-analytics.service';

const router = Router();
const reviewAnalyticsService = new ReviewAnalyticsService();

// Apply authentication and validation to all routes
router.use(authenticate);
router.use(apiRateLimiter);

// Get comprehensive review analytics
router.get(['/analytics/:providerId', '/analytics'], validateProvider, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.providerId || req.user?.id;
    const { startDate, endDate } = req.query;
    
    if (!providerId) {
      throw new BilingualAppError('Provider ID is required', 400);
    }

    const analytics = await reviewAnalyticsService.getReviewAnalytics(
      providerId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const response: ApiResponse = {
      success: true,
      data: analytics
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get detailed reviews with advanced filtering
router.get(['/detailed/:providerId', '/detailed'], validateProvider, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.providerId || req.user?.id;
    const { 
      rating, 
      sentiment, 
      hasResponse, 
      needsResponse, 
      aspect, 
      timeframe,
      page = 1, 
      limit = 20 
    } = req.query;
    
    if (!providerId) {
      throw new BilingualAppError('Provider ID is required', 400);
    }

    const filters = {
      rating: rating ? Number(rating) : undefined,
      sentiment: sentiment as string,
      hasResponse: hasResponse === 'true' ? true : hasResponse === 'false' ? false : undefined,
      needsResponse: needsResponse === 'true',
      aspect: aspect as string,
      timeframe: timeframe as 'week' | 'month' | 'quarter'
    };

    const result = await reviewAnalyticsService.getDetailedReviews(
      providerId,
      filters,
      Number(page),
      Number(limit)
    );

    const response: ApiResponse = {
      success: true,
      data: {
        reviews: result.reviews,
        pagination: {
          total: result.total,
          page: Number(page),
          limit: Number(limit),
          hasMore: result.hasMore
        }
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Generate actionable insights from reviews
router.get(['/insights/:providerId', '/insights'], validateProvider, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.providerId || req.user?.id;
    
    if (!providerId) {
      throw new BilingualAppError('Provider ID is required', 400);
    }

    const insights = await reviewAnalyticsService.generateReviewInsights(providerId);

    const response: ApiResponse = {
      success: true,
      data: insights
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get response templates
router.get(['/response-templates/:providerId', '/response-templates'], validateProvider, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.providerId || req.user?.id;
    
    if (!providerId) {
      throw new BilingualAppError('Provider ID is required', 400);
    }

    const templates = await reviewAnalyticsService.getResponseTemplates(providerId);

    const response: ApiResponse = {
      success: true,
      data: templates
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get AI-powered response suggestions
router.post('/response-suggestions', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewId, reviewText, rating, sentiment } = req.body;
    
    if (!reviewId || !reviewText || rating === undefined) {
      throw new BilingualAppError('Review ID, text, and rating are required', 400);
    }

    const suggestions = await reviewAnalyticsService.getResponseSuggestions(
      reviewId,
      reviewText,
      Number(rating),
      sentiment || 'neutral'
    );

    const response: ApiResponse = {
      success: true,
      data: suggestions
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Submit review response and track performance
router.post('/respond/:reviewId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    const { responseText } = req.body;
    const providerId = req.user?.id;
    
    if (!reviewId || !responseText || !providerId) {
      throw new BilingualAppError('Review ID, response text, and provider ID are required', 400);
    }

    await reviewAnalyticsService.trackResponsePerformance(
      providerId,
      reviewId,
      responseText
    );

    const response: ApiResponse = {
      success: true,
      message: 'Review response submitted successfully'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get review sentiment trends
router.get(['/sentiment-trends/:providerId', '/sentiment-trends'], validateProvider, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.providerId || req.user?.id;
    const { period: _period = 'month', months = 6 } = req.query;
    
    if (!providerId) {
      throw new BilingualAppError('Provider ID is required', 400);
    }

    // Get analytics for trend analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));

    const analytics = await reviewAnalyticsService.getReviewAnalytics(
      providerId,
      startDate,
      endDate
    );

    const response: ApiResponse = {
      success: true,
      data: {
        trends: analytics.trendsOverTime,
        currentSentiment: analytics.sentimentBreakdown,
        averageRating: analytics.averageRating,
        responseRate: analytics.responseRate
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get aspect analysis for specific timeframe
router.get(['/aspects/:providerId', '/aspects'], validateProvider, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.providerId || req.user?.id;
    const { timeframe = 'month' } = req.query;
    
    if (!providerId) {
      throw new BilingualAppError('Provider ID is required', 400);
    }

    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const analytics = await reviewAnalyticsService.getReviewAnalytics(
      providerId,
      startDate,
      endDate
    );

    const response: ApiResponse = {
      success: true,
      data: {
        aspects: analytics.topAspects,
        timeframe,
        totalReviews: analytics.totalReviews
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get competitor comparison data
router.get(['/competitor-comparison/:providerId', '/competitor-comparison'], validateProvider, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.providerId || req.user?.id;
    
    if (!providerId) {
      throw new BilingualAppError('Provider ID is required', 400);
    }

    const analytics = await reviewAnalyticsService.getReviewAnalytics(providerId);

    const response: ApiResponse = {
      success: true,
      data: {
        comparison: analytics.competitorComparison,
        providerRating: analytics.averageRating,
        totalReviews: analytics.totalReviews,
        responseRate: analytics.responseRate
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;