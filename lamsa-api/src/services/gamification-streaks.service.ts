import { supabase } from '../config/supabase';

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

export class GamificationStreaksService {
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

  // Update booking streak
  async updateBookingStreak(providerId: string, increment: boolean = true): Promise<number> {
    const { data: currentGoals } = await supabase
      .from('provider_daily_goals')
      .select('booking_streak')
      .eq('provider_id', providerId)
      .order('goal_date', { ascending: false })
      .limit(1)
      .single();

    const currentStreak = currentGoals?.booking_streak || 0;
    const newStreak = increment ? currentStreak + 1 : 0;

    const today = new Date().toISOString().split('T')[0];

    await supabase
      .from('provider_daily_goals')
      .upsert({
        provider_id: providerId,
        goal_date: today,
        booking_streak: newStreak
      });

    return newStreak;
  }

  // Update perfect rating streak
  async updatePerfectRatingStreak(providerId: string, increment: boolean = true): Promise<number> {
    const { data: currentGoals } = await supabase
      .from('provider_daily_goals')
      .select('perfect_rating_streak')
      .eq('provider_id', providerId)
      .order('goal_date', { ascending: false })
      .limit(1)
      .single();

    const currentStreak = currentGoals?.perfect_rating_streak || 0;
    const newStreak = increment ? currentStreak + 1 : 0;

    const today = new Date().toISOString().split('T')[0];

    await supabase
      .from('provider_daily_goals')
      .upsert({
        provider_id: providerId,
        goal_date: today,
        perfect_rating_streak: newStreak
      });

    return newStreak;
  }

  // Update response streak
  async updateResponseStreak(providerId: string, increment: boolean = true): Promise<number> {
    const { data: currentGoals } = await supabase
      .from('provider_daily_goals')
      .select('response_streak')
      .eq('provider_id', providerId)
      .order('goal_date', { ascending: false })
      .limit(1)
      .single();

    const currentStreak = currentGoals?.response_streak || 0;
    const newStreak = increment ? currentStreak + 1 : 0;

    const today = new Date().toISOString().split('T')[0];

    await supabase
      .from('provider_daily_goals')
      .upsert({
        provider_id: providerId,
        goal_date: today,
        response_streak: newStreak
      });

    return newStreak;
  }

  // Check if streak milestone reached and award points
  async checkStreakMilestones(providerId: string, streakType: 'booking' | 'rating' | 'response', currentStreak: number): Promise<number> {
    const milestones = [7, 14, 30, 60, 100]; // Days for milestone achievements
    const points = [100, 250, 500, 1000, 2000]; // Points for each milestone

    let awardedPoints = 0;

    for (let i = 0; i < milestones.length; i++) {
      if (currentStreak === milestones[i]) {
        // Check if this milestone was already awarded
        const { data: existingAchievement } = await supabase
          .from('provider_achievements')
          .select('id')
          .eq('provider_id', providerId)
          .eq('achievement_type', 'streak')
          .eq('achievement_name', `${streakType}_streak_${milestones[i]}`)
          .single();

        if (!existingAchievement) {
          // Award milestone achievement
          await supabase
            .from('provider_achievements')
            .insert({
              provider_id: providerId,
              achievement_type: 'streak',
              achievement_name: `${streakType}_streak_${milestones[i]}`,
              achievement_level: i + 1,
              points_earned: points[i],
              current_value: currentStreak,
              target_value: milestones[i],
              progress_percentage: 100,
              earned_at: new Date().toISOString(),
              is_active: true
            });

          awardedPoints = points[i];
          break;
        }
      }
    }

    return awardedPoints;
  }
}