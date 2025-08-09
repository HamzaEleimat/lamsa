import { supabase } from '../config/supabase';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

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

export class GamificationLeaderboardService {
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
}