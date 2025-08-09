import { supabase } from '../config/supabase';
import { format, startOfDay, endOfDay, differenceInDays } from 'date-fns';

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

export class GamificationPointsService {
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

    // If level increased, this would trigger an achievement award
    // but we avoid circular dependencies by letting the calling service handle it
    if (newLevel > currentLevel) {
      // The calling service should handle level-up achievements
      console.log(`Provider ${providerId} leveled up from ${currentLevel} to ${newLevel}`);
    }
  }

  private calculatePointsForLevel(level: number): number {
    // Exponential point requirement: level^2 * 100
    return Math.pow(level, 2) * 100;
  }

  private calculateLevelFromPoints(points: number): number {
    // Calculate level based on points (inverse of calculatePointsForLevel)
    return Math.floor(Math.sqrt(points / 100)) || 1;
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
}