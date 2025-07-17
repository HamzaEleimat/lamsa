import { supabase } from '../config/supabase-simple';
import { subDays, subMonths } from 'date-fns';

export interface ReviewAnalytics {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responseRate: number;
  averageResponseTime: number; // in hours
  trendsOverTime: ReviewTrend[];
  topAspects: AspectAnalysis[];
  competitorComparison?: CompetitorRatingData;
}

export interface ReviewTrend {
  period: string;
  averageRating: number;
  reviewCount: number;
  sentimentScore: number;
}

export interface AspectAnalysis {
  aspect: string;
  mentionCount: number;
  averageRating: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  improvementSuggestions: string[];
}

export interface DetailedReview {
  id: string;
  customerName: string;
  customerAvatar?: string;
  serviceName: string;
  rating: number;
  comment?: string;
  sentiment: string;
  aspects: string[];
  hasResponse: boolean;
  response?: string;
  responseTime?: number; // hours
  createdAt: string;
  isVerified: boolean;
  helpfulCount: number;
  isRecent: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface ReviewInsights {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  actionableRecommendations: string[];
  competitiveAdvantages: string[];
}

export interface ResponseTemplates {
  positiveTemplate: string;
  neutralTemplate: string;
  negativeTemplate: string;
  customTemplates: Array<{
    title: string;
    template: string;
    usageCount: number;
  }>;
}

export interface CompetitorRatingData {
  providerRating: number;
  categoryAverage: number;
  cityAverage: number;
  rankInCategory: number;
  rankInCity: number;
  improvement: number;
}

export class ReviewAnalyticsService {

  // Get comprehensive review analytics for a provider
  async getReviewAnalytics(
    providerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ReviewAnalytics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    // Get all reviews with basic analytics
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        sentiment,
        aspects,
        response,
        response_at,
        created_at,
        is_verified,
        helpful_count
      `)
      .eq('provider_id', providerId)
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end);

    if (!reviews || reviews.length === 0) {
      return this.getEmptyAnalytics();
    }

    // Calculate basic metrics
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    
    // Rating distribution
    const ratingDistribution = reviews.reduce((acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Sentiment breakdown
    const sentimentBreakdown = reviews.reduce((acc, review) => {
      const sentiment = review.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });

    // Response metrics
    const reviewsWithResponses = reviews.filter(r => r.response);
    const responseRate = (reviewsWithResponses.length / totalReviews) * 100;

    const averageResponseTime = this.calculateAverageResponseTime(reviewsWithResponses);

    // Trends over time
    const trendsOverTime = await this.calculateReviewTrends(providerId, dateFilter.start, dateFilter.end);

    // Aspect analysis
    const topAspects = this.analyzeAspects(reviews);

    // Competitor comparison (optional)
    const competitorComparison = await this.getCompetitorComparison(providerId);

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
      sentimentBreakdown,
      responseRate,
      averageResponseTime,
      trendsOverTime,
      topAspects,
      competitorComparison
    };
  }

  private buildDateFilter(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || subDays(end, 30); // Default to last 30 days
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  private getEmptyAnalytics(): ReviewAnalytics {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: {},
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      responseRate: 0,
      averageResponseTime: 0,
      trendsOverTime: [],
      topAspects: []
    };
  }

  private calculateAverageResponseTime(reviewsWithResponses: any[]): number {
    if (reviewsWithResponses.length === 0) return 0;

    const totalHours = reviewsWithResponses.reduce((sum, review) => {
      if (review.response_at && review.created_at) {
        const responseTime = new Date(review.response_at);
        const reviewTime = new Date(review.created_at);
        const hours = (responseTime.getTime() - reviewTime.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    return totalHours / reviewsWithResponses.length;
  }

  private async calculateReviewTrends(
    providerId: string,
    startDate: string,
    endDate: string
  ): Promise<ReviewTrend[]> {
    // Get reviews grouped by month for trend analysis
    const { data: monthlyReviews } = await supabase
      .rpc('get_monthly_review_trends', {
        p_provider_id: providerId,
        p_start_date: startDate,
        p_end_date: endDate
      });

    return monthlyReviews?.map((month: any) => ({
      period: month.month,
      averageRating: Number(month.avg_rating || 0),
      reviewCount: month.review_count || 0,
      sentimentScore: this.calculateSentimentScore(month.sentiment_breakdown)
    })) || [];
  }

  private calculateSentimentScore(sentimentBreakdown: any): number {
    if (!sentimentBreakdown) return 0;
    
    const { positive = 0, neutral = 0, negative = 0 } = sentimentBreakdown;
    const total = positive + neutral + negative;
    
    if (total === 0) return 0;
    
    // Calculate sentiment score: positive = +1, neutral = 0, negative = -1
    return ((positive * 1) + (neutral * 0) + (negative * -1)) / total;
  }

  private analyzeAspects(reviews: any[]): AspectAnalysis[] {
    const aspectCounts = new Map<string, {
      count: number;
      ratings: number[];
      sentiments: string[];
    }>();

    reviews.forEach(review => {
      if (review.aspects && Array.isArray(review.aspects)) {
        review.aspects.forEach((aspect: string) => {
          if (!aspectCounts.has(aspect)) {
            aspectCounts.set(aspect, { count: 0, ratings: [], sentiments: [] });
          }
          const aspectData = aspectCounts.get(aspect)!;
          aspectData.count++;
          aspectData.ratings.push(review.rating);
          aspectData.sentiments.push(review.sentiment || 'neutral');
        });
      }
    });

    // Convert to analysis format and sort by mention count
    return Array.from(aspectCounts.entries())
      .map(([aspect, data]) => {
        const averageRating = data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length;
        const sentimentCounts = data.sentiments.reduce((acc, s) => {
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const dominantSentiment = Object.entries(sentimentCounts)
          .sort(([,a], [,b]) => b - a)[0][0] as 'positive' | 'neutral' | 'negative';

        return {
          aspect,
          mentionCount: data.count,
          averageRating,
          sentiment: dominantSentiment,
          keywords: this.getAspectKeywords(aspect),
          improvementSuggestions: this.getImprovementSuggestions(aspect, averageRating, dominantSentiment)
        };
      })
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 10);
  }

  private getAspectKeywords(aspect: string): string[] {
    const keywordMap: Record<string, string[]> = {
      cleanliness: ['clean', 'tidy', 'hygiene', 'sanitized', 'neat'],
      punctuality: ['time', 'late', 'early', 'punctual', 'schedule'],
      skill: ['professional', 'expert', 'skilled', 'technique', 'quality'],
      value: ['price', 'worth', 'expensive', 'affordable', 'value'],
      service: ['friendly', 'polite', 'helpful', 'rude', 'attitude'],
      ambiance: ['atmosphere', 'environment', 'comfortable', 'relaxing']
    };

    return keywordMap[aspect] || [];
  }

  private getImprovementSuggestions(
    aspect: string,
    averageRating: number,
    sentiment: string
  ): string[] {
    if (averageRating >= 4.5 && sentiment === 'positive') {
      return [`Maintain excellent ${aspect} standards`];
    }

    const suggestions: Record<string, string[]> = {
      cleanliness: [
        'Implement stricter cleaning protocols',
        'Regular deep cleaning schedule',
        'Visible hygiene practices for customers'
      ],
      punctuality: [
        'Improve appointment scheduling system',
        'Add buffer time between appointments',
        'Send reminder notifications to customers'
      ],
      skill: [
        'Provide additional training for staff',
        'Invest in advanced equipment',
        'Seek customer feedback on techniques'
      ],
      value: [
        'Review pricing strategy',
        'Offer package deals',
        'Communicate value proposition better'
      ],
      service: [
        'Customer service training for staff',
        'Implement feedback collection system',
        'Improve communication protocols'
      ]
    };

    return suggestions[aspect] || [`Improve ${aspect} based on customer feedback`];
  }

  private async getCompetitorComparison(providerId: string): Promise<CompetitorRatingData | undefined> {
    // Get provider's current rating
    const { data: providerData } = await supabase
      .from('providers')
      .select('rating, city')
      .eq('id', providerId)
      .single();

    if (!providerData) return undefined;

    // Get category and city averages (simplified implementation)
    const { data: categoryStats } = await supabase
      .from('providers')
      .select('rating')
      .eq('city', providerData.city)
      .neq('id', providerId);

    if (!categoryStats || categoryStats.length === 0) return undefined;

    const ratings = categoryStats.map(p => p.rating).filter(r => r > 0);
    const categoryAverage = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const cityAverage = categoryAverage; // Simplified - same as category for now

    // Calculate rankings
    const betterProviders = ratings.filter(r => r > providerData.rating).length;
    const rankInCategory = betterProviders + 1;
    const rankInCity = rankInCategory; // Simplified

    const improvement = providerData.rating - categoryAverage;

    return {
      providerRating: providerData.rating,
      categoryAverage,
      cityAverage,
      rankInCategory,
      rankInCity,
      improvement
    };
  }

  // Get detailed reviews with enhanced filtering
  async getDetailedReviews(
    providerId: string,
    filters: {
      rating?: number;
      sentiment?: string;
      hasResponse?: boolean;
      needsResponse?: boolean;
      aspect?: string;
      timeframe?: 'week' | 'month' | 'quarter';
    } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ reviews: DetailedReview[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;
    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        sentiment,
        aspects,
        response,
        response_at,
        created_at,
        is_verified,
        helpful_count,
        users!inner(name, avatar_url),
        services!inner(name_en)
      `, { count: 'exact' })
      .eq('provider_id', providerId);

    // Apply filters
    if (filters.rating) {
      query = query.eq('rating', filters.rating);
    }

    if (filters.sentiment) {
      query = query.eq('sentiment', filters.sentiment);
    }

    if (filters.hasResponse !== undefined) {
      if (filters.hasResponse) {
        query = query.not('response', 'is', null);
      } else {
        query = query.is('response', null);
      }
    }

    if (filters.needsResponse) {
      query = query.is('response', null);
    }

    if (filters.aspect) {
      query = query.contains('aspects', [filters.aspect]);
    }

    if (filters.timeframe) {
      const startDate = this.getTimeframeStartDate(filters.timeframe);
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: reviews, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!reviews) {
      return { reviews: [], total: 0, hasMore: false };
    }

    const detailedReviews: DetailedReview[] = reviews.map(review => {
      const responseTime = review.response_at && review.created_at
        ? (new Date(review.response_at).getTime() - new Date(review.created_at).getTime()) / (1000 * 60 * 60)
        : undefined;

      const isRecent = new Date(review.created_at) > subDays(new Date(), 7);
      const riskLevel = this.assessReviewRisk(review.rating, review.sentiment, review.response);

      return {
        id: review.id,
        customerName: review.users.name || 'Anonymous',
        customerAvatar: review.users.avatar_url,
        serviceName: review.services.name_en,
        rating: review.rating,
        comment: review.comment,
        sentiment: review.sentiment || 'neutral',
        aspects: review.aspects || [],
        hasResponse: !!review.response,
        response: review.response,
        responseTime,
        createdAt: review.created_at,
        isVerified: review.is_verified,
        helpfulCount: review.helpful_count || 0,
        isRecent,
        riskLevel
      };
    });

    return {
      reviews: detailedReviews,
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    };
  }

  private getTimeframeStartDate(timeframe: 'week' | 'month' | 'quarter'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'week':
        return subDays(now, 7);
      case 'month':
        return subMonths(now, 1);
      case 'quarter':
        return subMonths(now, 3);
      default:
        return subDays(now, 7);
    }
  }

  private assessReviewRisk(
    rating: number,
    sentiment: string,
    response: string | null
  ): 'low' | 'medium' | 'high' {
    if (rating <= 2 && !response) return 'high';
    if (rating <= 3 && sentiment === 'negative') return 'medium';
    if (rating >= 4) return 'low';
    return 'medium';
  }

  // Generate actionable insights from review data
  async generateReviewInsights(providerId: string): Promise<ReviewInsights> {
    const analytics = await this.getReviewAnalytics(providerId);
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];
    const actionableRecommendations: string[] = [];
    const competitiveAdvantages: string[] = [];

    // Analyze strengths
    if (analytics.averageRating >= 4.5) {
      strengths.push('Excellent overall customer satisfaction');
    }
    
    analytics.topAspects.forEach(aspect => {
      if (aspect.averageRating >= 4.5 && aspect.sentiment === 'positive') {
        strengths.push(`Strong performance in ${aspect.aspect}`);
      }
    });

    if (analytics.responseRate >= 80) {
      strengths.push('High review response rate');
    }

    // Analyze weaknesses
    analytics.topAspects.forEach(aspect => {
      if (aspect.averageRating < 3.5 || aspect.sentiment === 'negative') {
        weaknesses.push(`Improvement needed in ${aspect.aspect}`);
        actionableRecommendations.push(...aspect.improvementSuggestions);
      }
    });

    if (analytics.responseRate < 50) {
      weaknesses.push('Low review response rate');
      actionableRecommendations.push('Implement systematic review response process');
    }

    // Analyze opportunities
    if (analytics.sentimentBreakdown.neutral > analytics.sentimentBreakdown.positive) {
      opportunities.push('Convert neutral experiences to positive ones');
      actionableRecommendations.push('Follow up with neutral reviewers for feedback');
    }

    if (analytics.averageResponseTime > 24) {
      opportunities.push('Faster review response times');
      actionableRecommendations.push('Set up review notification system for quicker responses');
    }

    // Analyze threats
    if (analytics.sentimentBreakdown.negative > 20) {
      threats.push('High percentage of negative sentiment');
    }

    if (analytics.trendsOverTime.length > 1) {
      const recentTrend = analytics.trendsOverTime[analytics.trendsOverTime.length - 1];
      const previousTrend = analytics.trendsOverTime[analytics.trendsOverTime.length - 2];
      
      if (recentTrend.averageRating < previousTrend.averageRating) {
        threats.push('Declining rating trend');
        actionableRecommendations.push('Investigate recent service quality issues');
      }
    }

    // Competitive advantages
    if (analytics.competitorComparison?.improvement > 0.5) {
      competitiveAdvantages.push('Above-average rating in market');
    }

    if (analytics.responseRate > 70) {
      competitiveAdvantages.push('Strong customer engagement through review responses');
    }

    return {
      strengths,
      weaknesses,
      opportunities,
      threats,
      actionableRecommendations,
      competitiveAdvantages
    };
  }

  // Get response templates for different scenarios
  async getResponseTemplates(providerId: string): Promise<ResponseTemplates> {
    // Get provider's custom templates
    const { data: customTemplates } = await supabase
      .from('review_response_templates')
      .select('title, template, usage_count')
      .eq('provider_id', providerId)
      .order('usage_count', { ascending: false });

    return {
      positiveTemplate: "Thank you so much for your wonderful review! We're thrilled that you had such a great experience with our service. Your feedback means the world to us and motivates our team to continue providing excellent service. We look forward to serving you again soon!",
      
      neutralTemplate: "Thank you for taking the time to share your feedback. We appreciate your review and would love to hear how we can improve your experience next time. Please feel free to reach out to us directly so we can make things right. We value your business and hope to serve you better in the future.",
      
      negativeTemplate: "Thank you for sharing your feedback, and I sincerely apologize that your experience didn't meet your expectations. Your concerns are important to us, and we would like the opportunity to make this right. Please contact us directly so we can discuss how to improve and ensure a better experience for you in the future.",
      
      customTemplates: customTemplates || []
    };
  }

  // Track review response performance
  async trackResponsePerformance(
    providerId: string,
    reviewId: string,
    responseText: string
  ): Promise<void> {
    // Update the review with response
    await supabase
      .from('reviews')
      .update({
        response: responseText,
        response_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    // Update provider response metrics
    await supabase
      .from('provider_realtime_metrics')
      .upsert({
        provider_id: providerId,
        last_updated: new Date().toISOString()
      });

    // Optionally track template usage if it matches a template
    // This would require more sophisticated text matching
  }

  // Get review response suggestions based on AI analysis
  async getResponseSuggestions(
    _reviewId: string,
    _reviewText: string,
    _rating: number,
    _sentiment: string
  ): Promise<{ suggestions: string[]; tone: string; keyPoints: string[] }> {
    // This would integrate with an AI service for advanced suggestions
    // For now, providing rule-based suggestions

    const suggestions: string[] = [];
    let tone: string;
    const keyPoints: string[] = [];

    if (rating >= 4) {
      tone = 'grateful';
      suggestions.push('Thank the customer for their positive feedback');
      suggestions.push('Highlight specific aspects they mentioned');
      suggestions.push('Invite them to return');
      keyPoints.push('Express genuine gratitude');
      keyPoints.push('Reinforce positive experience');
    } else if (rating >= 3) {
      tone = 'understanding';
      suggestions.push('Thank them for honest feedback');
      suggestions.push('Ask for specific improvement areas');
      suggestions.push('Offer to discuss privately');
      keyPoints.push('Show willingness to improve');
      keyPoints.push('Demonstrate customer care');
    } else {
      tone = 'apologetic';
      suggestions.push('Apologize sincerely for the poor experience');
      suggestions.push('Take responsibility for the issues');
      suggestions.push('Offer to make it right');
      suggestions.push('Provide direct contact for resolution');
      keyPoints.push('Sincere apology');
      keyPoints.push('Commitment to resolution');
      keyPoints.push('Prevent future issues');
    }

    return { suggestions, tone, keyPoints };
  }
}