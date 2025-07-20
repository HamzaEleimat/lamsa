import { supabase } from '../config/supabase-simple';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export interface Achievement {
  id: string;
  providerId: string;
  type: string;
  name: string;
  level: number;
  description: string;
  descriptionAr: string;
  iconUrl: string;
  pointsEarned: number;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  isEarned: boolean;
  earnedAt?: string;
  expiresAt?: string;
}

export interface DailyGoal {
  type: string;
  target: number;
  current: number;
  rewardPoints: number;
  completed: boolean;
  description: string;
  descriptionAr: string;
  icon: string;
  progressPercentage: number;
}

export interface ProviderLevel {
  currentLevel: number;
  currentPoints: number;
  pointsToNextLevel: number;
  levelName: string;
  levelNameAr: string;
  levelPerks: string[];
  totalPointsEarned: number;
  levelProgress: number;
}

export interface Leaderboard {
  providerId: string;
  providerName: string;
  businessName: string;
  avatar: string;
  points: number;
  level: number;
  rank: number;
  badges: string[];
  streak: number;
  city: string;
}

export interface ChallengeEvent {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  type: 'individual' | 'city' | 'category';
  startDate: string;
  endDate: string;
  rewards: {
    first: { points: number; badge?: string; prize?: string };
    second: { points: number; badge?: string; prize?: string };
    third: { points: number; badge?: string; prize?: string };
    participation: { points: number };
  };
  criteria: {
    metric: string;
    target: number;
    operator: 'greater_than' | 'less_than' | 'equals';
  };
  participants: number;
  isActive: boolean;
  userParticipating?: boolean;
  userRank?: number;
  userProgress?: number;
}

export interface StreakInfo {
  bookingStreak: number;
  perfectRatingStreak: number;
  responseStreak: number;
  revenueStreak: number;
  longestStreaks: {
    bookings: number;
    rating: number;
    response: number;
    revenue: number;
  };
}

export interface Badge {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  earnedAt?: string;
  isEarned: boolean;
}

export class GamificationService {

  // Get provider's current level and progress
  async getProviderLevel(providerId: string): Promise<ProviderLevel> {
    const { data: dailyGoals } = await supabase
      .from('provider_daily_goals')
      .select('total_points, level')
      .eq('provider_id', providerId)
      .order('goal_date', { ascending: false })
      .limit(1)
      .single();

    const currentPoints = dailyGoals?.total_points || 0;
    const currentLevel = dailyGoals?.level || 1;

    // Calculate points needed for next level (exponential growth)
    const pointsForNextLevel = this.calculatePointsForLevel(currentLevel + 1);
    const pointsForCurrentLevel = this.calculatePointsForLevel(currentLevel);
    const pointsToNextLevel = pointsForNextLevel - currentPoints;
    const levelProgress = currentPoints > pointsForCurrentLevel 
      ? ((currentPoints - pointsForCurrentLevel) / (pointsForNextLevel - pointsForCurrentLevel)) * 100
      : 0;

    const levelInfo = this.getLevelInfo(currentLevel);

    return {
      currentLevel,
      currentPoints,
      pointsToNextLevel: Math.max(0, pointsToNextLevel),
      levelName: levelInfo.name,
      levelNameAr: levelInfo.nameAr,
      levelPerks: levelInfo.perks,
      totalPointsEarned: currentPoints,
      levelProgress: Math.min(100, levelProgress)
    };
  }

  private calculatePointsForLevel(level: number): number {
    // Exponential point requirement: level^2 * 100
    return Math.pow(level, 2) * 100;
  }

  private getLevelInfo(level: number): { name: string; nameAr: string; perks: string[] } {
    const levels: Record<number, { name: string; nameAr: string; perks: string[] }> = {
      1: { 
        name: 'Beginner', 
        nameAr: 'مبتدئ',
        perks: ['Welcome bonus', 'Basic analytics']
      },
      2: { 
        name: 'Rising Star', 
        nameAr: 'نجم صاعد',
        perks: ['Enhanced analytics', 'Priority support']
      },
      3: { 
        name: 'Professional', 
        nameAr: 'محترف',
        perks: ['Advanced features', 'Marketing tools']
      },
      4: { 
        name: 'Expert', 
        nameAr: 'خبير',
        perks: ['Premium features', 'Revenue insights']
      },
      5: { 
        name: 'Master', 
        nameAr: 'أستاذ',
        perks: ['All features', 'Dedicated support', 'Special recognition']
      }
    };

    return levels[Math.min(level, 5)] || levels[5];
  }

  // Get today's goals and progress
  async getDailyGoals(providerId: string, date: Date = new Date()): Promise<DailyGoal[]> {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const { data: goalsData } = await supabase
      .from('provider_daily_goals')
      .select('goals')
      .eq('provider_id', providerId)
      .eq('goal_date', dateStr)
      .single();

    if (!goalsData?.goals) {
      // Create default goals for the day
      return await this.createDailyGoals(providerId, date);
    }

    // Update current progress for each goal
    const goals = await Promise.all(
      goalsData.goals.map(async (goal: any) => {
        const currentValue = await this.calculateCurrentGoalValue(providerId, goal.type, date);
        const progressPercentage = goal.target > 0 ? Math.min(100, (currentValue / goal.target) * 100) : 0;
        const completed = currentValue >= goal.target;

        return {
          type: goal.type,
          target: goal.target,
          current: currentValue,
          rewardPoints: goal.rewardPoints || goal.reward_points || 0,
          completed,
          description: goal.description || this.getGoalDescription(goal.type, goal.target),
          descriptionAr: goal.descriptionAr || this.getGoalDescriptionAr(goal.type, goal.target),
          icon: this.getGoalIcon(goal.type),
          progressPercentage
        };
      })
    );

    return goals;
  }

  private async createDailyGoals(providerId: string, date: Date): Promise<DailyGoal[]> {
    // Get provider's average performance to set realistic goals
    const avgPerformance = await this.getProviderAveragePerformance(providerId);
    
    const goals = [
      {
        type: 'bookings',
        target: Math.max(3, Math.ceil(avgPerformance.avgDailyBookings * 1.2)),
        rewardPoints: 50,
        description: 'Complete bookings today',
        descriptionAr: 'أكمل الحجوزات اليوم'
      },
      {
        type: 'revenue',
        target: Math.max(200, Math.ceil(avgPerformance.avgDailyRevenue * 1.1)),
        rewardPoints: 100,
        description: 'Earn revenue today',
        descriptionAr: 'اكسب الإيرادات اليوم'
      },
      {
        type: 'rating',
        target: 4.5,
        rewardPoints: 75,
        description: 'Maintain high rating',
        descriptionAr: 'حافظ على تقييم عالي'
      },
      {
        type: 'response_rate',
        target: 100,
        rewardPoints: 30,
        description: 'Respond to all reviews',
        descriptionAr: 'رد على جميع التقييمات'
      }
    ];

    // Save goals to database
    await supabase
      .from('provider_daily_goals')
      .upsert({
        provider_id: providerId,
        goal_date: format(date, 'yyyy-MM-dd'),
        goals: goals,
        booking_streak: 0,
        perfect_rating_streak: 0,
        response_streak: 0,
        points_earned_today: 0,
        total_points: 0,
        level: 1
      });

    // Convert to DailyGoal format
    return await Promise.all(
      goals.map(async (goal) => {
        const currentValue = await this.calculateCurrentGoalValue(providerId, goal.type, date);
        const progressPercentage = goal.target > 0 ? Math.min(100, (currentValue / goal.target) * 100) : 0;

        return {
          type: goal.type,
          target: goal.target,
          current: currentValue,
          rewardPoints: goal.rewardPoints,
          completed: currentValue >= goal.target,
          description: goal.description,
          descriptionAr: goal.descriptionAr,
          icon: this.getGoalIcon(goal.type),
          progressPercentage
        };
      })
    );
  }

  private async getProviderAveragePerformance(providerId: string) {
    // Get last 30 days performance
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('booking_date, total_price, status')
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

    const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
    const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
    const days = differenceInDays(endDate, startDate) || 1;

    return {
      avgDailyBookings: completedBookings.length / days,
      avgDailyRevenue: totalRevenue / days
    };
  }

  private async calculateCurrentGoalValue(providerId: string, goalType: string, date: Date): Promise<number> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    switch (goalType) {
      case 'bookings':
        const { count: bookingCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('booking_date', dateStr)
          .eq('status', 'completed');
        return bookingCount || 0;

      case 'revenue':
        const { data: bookings } = await supabase
          .from('bookings')
          .select('total_price')
          .eq('provider_id', providerId)
          .eq('booking_date', dateStr)
          .eq('status', 'completed');
        return bookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0;

      case 'rating':
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('provider_id', providerId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        if (!reviews || reviews.length === 0) return 0;
        return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      case 'response_rate':
        const { data: allReviews } = await supabase
          .from('reviews')
          .select('response')
          .eq('provider_id', providerId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        if (!allReviews || allReviews.length === 0) return 100;
        const responsesCount = allReviews.filter(r => r.response).length;
        return (responsesCount / allReviews.length) * 100;

      default:
        return 0;
    }
  }

  private getGoalDescription(type: string, target: number): string {
    const descriptions: Record<string, string> = {
      bookings: `Complete ${target} appointments`,
      revenue: `Earn ${target} JOD in revenue`,
      rating: `Maintain ${target}+ star rating`,
      response_rate: `${target}% review response rate`
    };
    return descriptions[type] || `Achieve ${target} in ${type}`;
  }

  private getGoalDescriptionAr(type: string, target: number): string {
    const descriptions: Record<string, string> = {
      bookings: `أكمل ${target} مواعيد`,
      revenue: `اكسب ${target} دينار أردني`,
      rating: `حافظ على تقييم ${target}+ نجوم`,
      response_rate: `${target}% معدل الرد على التقييمات`
    };
    return descriptions[type] || `حقق ${target} في ${type}`;
  }

  private getGoalIcon(type: string): string {
    const icons: Record<string, string> = {
      bookings: 'calendar-check',
      revenue: 'trending-up',
      rating: 'star',
      response_rate: 'message-circle'
    };
    return icons[type] || 'target';
  }

  // Get provider achievements
  async getProviderAchievements(providerId: string): Promise<Achievement[]> {
    const { data: achievements } = await supabase
      .from('provider_achievements')
      .select('*')
      .eq('provider_id', providerId)
      .order('earned_at', { ascending: false });

    return achievements?.map(achievement => ({
      id: achievement.id,
      providerId: achievement.provider_id,
      type: achievement.achievement_type,
      name: achievement.achievement_name,
      level: achievement.achievement_level,
      description: achievement.description_en || '',
      descriptionAr: achievement.description_ar || '',
      iconUrl: achievement.icon_url || '',
      pointsEarned: achievement.points_earned,
      currentValue: Number(achievement.current_value || 0),
      targetValue: Number(achievement.target_value || 0),
      progressPercentage: Number(achievement.progress_percentage || 0),
      isEarned: !!achievement.earned_at,
      earnedAt: achievement.earned_at,
      expiresAt: achievement.expires_at
    })) || [];
  }

  // Get leaderboard for provider's city/category
  async getLeaderboard(
    providerId: string,
    scope: 'city' | 'category' | 'global' = 'city',
    limit: number = 20
  ): Promise<Leaderboard[]> {
    // Get provider info to determine city/category
    const { data: provider } = await supabase
      .from('providers')
      .select('city, business_name')
      .eq('id', providerId)
      .single();

    if (!provider) return [];

    let query = supabase
      .from('provider_performance_scores')
      .select(`
        provider_id,
        overall_score,
        providers!inner(business_name, city, avatar_url)
      `)
      .order('overall_score', { ascending: false })
      .limit(limit);

    // Apply scope filter
    if (scope === 'city') {
      query = query.eq('providers.city', provider.city);
    }

    const { data: leaderboardData } = await query;

    if (!leaderboardData) return [];

    // Get additional data for each provider
    const leaderboard = await Promise.all(
      leaderboardData.map(async (entry, index) => {
        // Get recent achievements/badges
        const { data: badges } = await supabase
          .from('provider_achievements')
          .select('achievement_name')
          .eq('provider_id', entry.provider_id)
          .not('earned_at', 'is', null)
          .order('earned_at', { ascending: false })
          .limit(3);

        // Get current streak
        const { data: goals } = await supabase
          .from('provider_daily_goals')
          .select('booking_streak')
          .eq('provider_id', entry.provider_id)
          .order('goal_date', { ascending: false })
          .limit(1)
          .single();

        // Get total points
        const { data: pointsData } = await supabase
          .from('provider_daily_goals')
          .select('total_points, level')
          .eq('provider_id', entry.provider_id)
          .order('goal_date', { ascending: false })
          .limit(1)
          .single();

        return {
          providerId: entry.provider_id,
          providerName: (entry as any).providers?.business_name || 'Unknown',
          businessName: (entry as any).providers?.business_name || 'Unknown',
          avatar: (entry as any).providers?.avatar_url || '',
          points: pointsData?.total_points || 0,
          level: pointsData?.level || 1,
          rank: index + 1,
          badges: badges?.map((b: any) => b.achievement_name) || [],
          streak: goals?.booking_streak || 0,
          city: (entry as any).providers?.city || ''
        };
      })
    );

    return leaderboard;
  }

  // Get current challenges/events
  async getActiveChallenges(_providerId: string): Promise<ChallengeEvent[]> {
    // const currentDate = new Date().toISOString(); // Commented out to suppress unused variable warning
    
    // For now, return mock challenges - in production, these would come from a challenges table
    const mockChallenges: ChallengeEvent[] = [
      {
        id: '1',
        title: 'Revenue Champion',
        titleAr: 'بطل الإيرادات',
        description: 'Earn the most revenue this month',
        descriptionAr: 'اكسب أعلى إيرادات هذا الشهر',
        type: 'city',
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        rewards: {
          first: { points: 1000, badge: 'Revenue King', prize: '500 JOD bonus' },
          second: { points: 500, badge: 'Revenue Master' },
          third: { points: 250, badge: 'Revenue Expert' },
          participation: { points: 50 }
        },
        criteria: {
          metric: 'monthly_revenue',
          target: 5000,
          operator: 'greater_than'
        },
        participants: 45,
        isActive: true,
        userParticipating: true,
        userRank: 12,
        userProgress: 3200
      },
      {
        id: '2',
        title: 'Customer Satisfaction Master',
        titleAr: 'أستاذ رضا العملاء',
        description: 'Maintain highest rating with most reviews',
        descriptionAr: 'حافظ على أعلى تقييم مع أكثر التقييمات',
        type: 'category',
        startDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
        rewards: {
          first: { points: 500, badge: 'Customer Champion' },
          second: { points: 300, badge: 'Service Star' },
          third: { points: 150, badge: 'Customer Favorite' },
          participation: { points: 25 }
        },
        criteria: {
          metric: 'average_rating',
          target: 4.8,
          operator: 'greater_than'
        },
        participants: 23,
        isActive: true,
        userParticipating: false
      }
    ];

    return mockChallenges;
  }

  // Get provider streaks
  async getProviderStreaks(providerId: string): Promise<StreakInfo> {
    const { data: currentGoals } = await supabase
      .from('provider_daily_goals')
      .select('*')
      .eq('provider_id', providerId)
      .order('goal_date', { ascending: false })
      .limit(1)
      .single();

    // Get historical data for longest streaks
    const { data: allGoals } = await supabase
      .from('provider_daily_goals')
      .select('booking_streak, perfect_rating_streak, response_streak')
      .eq('provider_id', providerId)
      .order('goal_date', { ascending: false });

    const longestBookingStreak = Math.max(...(allGoals?.map(g => g.booking_streak) || [0]));
    const longestRatingStreak = Math.max(...(allGoals?.map(g => g.perfect_rating_streak) || [0]));
    const longestResponseStreak = Math.max(...(allGoals?.map(g => g.response_streak) || [0]));

    return {
      bookingStreak: currentGoals?.booking_streak || 0,
      perfectRatingStreak: currentGoals?.perfect_rating_streak || 0,
      responseStreak: currentGoals?.response_streak || 0,
      revenueStreak: 0, // Would need to calculate this
      longestStreaks: {
        bookings: longestBookingStreak,
        rating: longestRatingStreak,
        response: longestResponseStreak,
        revenue: 0
      }
    };
  }

  // Award achievement to provider
  async awardAchievement(
    providerId: string,
    achievementType: string,
    achievementName: string,
    level: number,
    points: number,
    currentValue: number,
    targetValue: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('provider_achievements')
        .upsert({
          provider_id: providerId,
          achievement_type: achievementType,
          achievement_name: achievementName,
          achievement_level: level,
          points_earned: points,
          current_value: currentValue,
          target_value: targetValue,
          progress_percentage: (currentValue / targetValue) * 100,
          earned_at: new Date().toISOString(),
          is_active: true
        });

      if (error) {
        console.error('Error awarding achievement:', error);
        return false;
      }

      // Update provider's total points
      await this.updateProviderPoints(providerId, points);
      
      return true;
    } catch (error) {
      console.error('Error in awardAchievement:', error);
      return false;
    }
  }

  // Update provider's total points and level
  async updateProviderPoints(providerId: string, pointsToAdd: number): Promise<void> {
    const { data: currentGoals } = await supabase
      .from('provider_daily_goals')
      .select('total_points, points_earned_today, level')
      .eq('provider_id', providerId)
      .order('goal_date', { ascending: false })
      .limit(1)
      .single();

    const currentTotalPoints = currentGoals?.total_points || 0;
    const newTotalPoints = currentTotalPoints + pointsToAdd;
    const currentLevel = currentGoals?.level || 1;
    const newLevel = this.calculateLevelFromPoints(newTotalPoints);

    const today = format(new Date(), 'yyyy-MM-dd');

    await supabase
      .from('provider_daily_goals')
      .upsert({
        provider_id: providerId,
        goal_date: today,
        total_points: newTotalPoints,
        points_earned_today: (currentGoals?.points_earned_today || 0) + pointsToAdd,
        level: newLevel
      });

    // If level increased, award level-up achievement
    if (newLevel > currentLevel) {
      await this.awardAchievement(
        providerId,
        'level',
        `Level ${newLevel} Achieved`,
        newLevel,
        newLevel * 100,
        newLevel,
        newLevel
      );
    }
  }

  private calculateLevelFromPoints(points: number): number {
    // Calculate level based on points (inverse of calculatePointsForLevel)
    return Math.floor(Math.sqrt(points / 100)) || 1;
  }

  // Complete daily goal and award points
  async completeGoal(providerId: string, goalType: string, date: Date = new Date()): Promise<number> {
    const goals = await this.getDailyGoals(providerId, date);
    const goal = goals.find(g => g.type === goalType);
    
    if (!goal || goal.completed) {
      return 0; // Goal not found or already completed
    }

    // Mark goal as completed
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data: currentGoals } = await supabase
      .from('provider_daily_goals')
      .select('goals')
      .eq('provider_id', providerId)
      .eq('goal_date', dateStr)
      .single();

    if (currentGoals?.goals) {
      const updatedGoals = currentGoals.goals.map((g: any) => 
        g.type === goalType ? { ...g, completed: true } : g
      );

      await supabase
        .from('provider_daily_goals')
        .update({ goals: updatedGoals })
        .eq('provider_id', providerId)
        .eq('goal_date', dateStr);
    }

    // Award points
    await this.updateProviderPoints(providerId, goal.rewardPoints);
    
    return goal.rewardPoints;
  }

  // Get available badges for provider
  async getAvailableBadges(providerId: string): Promise<Badge[]> {
    // This would come from a badges configuration table
    // For now, return predefined badges with earned status
    const allBadges = this.getAllBadgeDefinitions();
    const achievements = await this.getProviderAchievements(providerId);
    const earnedBadgeNames = achievements.map(a => a.name);

    return allBadges.map(badge => ({
      ...badge,
      isEarned: earnedBadgeNames.includes(badge.name),
      earnedAt: achievements.find(a => a.name === badge.name)?.earnedAt
    }));
  }

  private getAllBadgeDefinitions(): Omit<Badge, 'isEarned' | 'earnedAt'>[] {
    return [
      {
        id: '1',
        name: '5-Star Champion',
        nameAr: 'بطل الخمس نجوم',
        description: 'Maintain 4.8+ rating with 50+ reviews',
        descriptionAr: 'حافظ على تقييم 4.8+ مع 50+ تقييم',
        iconUrl: '/badges/5-star-champion.png',
        rarity: 'epic',
        category: 'rating'
      },
      {
        id: '2',
        name: 'Revenue Master',
        nameAr: 'أستاذ الإيرادات',
        description: 'Earn 10,000 JOD in a month',
        descriptionAr: 'اكسب 10,000 دينار في الشهر',
        iconUrl: '/badges/revenue-master.png',
        rarity: 'rare',
        category: 'revenue'
      },
      {
        id: '3',
        name: 'Customer Whisperer',
        nameAr: 'همسات العملاء',
        description: 'Respond to 100 reviews',
        descriptionAr: 'رد على 100 تقييم',
        iconUrl: '/badges/customer-whisperer.png',
        rarity: 'common',
        category: 'engagement'
      },
      {
        id: '4',
        name: 'Perfect Week',
        nameAr: 'أسبوع مثالي',
        description: 'Complete all daily goals for 7 days',
        descriptionAr: 'أكمل جميع الأهداف اليومية لمدة 7 أيام',
        iconUrl: '/badges/perfect-week.png',
        rarity: 'rare',
        category: 'consistency'
      },
      {
        id: '5',
        name: 'Beauty Legend',
        nameAr: 'أسطورة الجمال',
        description: 'Reach level 10',
        descriptionAr: 'وصل للمستوى 10',
        iconUrl: '/badges/beauty-legend.png',
        rarity: 'legendary',
        category: 'level'
      }
    ];
  }
}