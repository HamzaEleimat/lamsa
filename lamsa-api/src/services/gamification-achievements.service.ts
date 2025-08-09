import { supabase } from '../config/supabase';

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

export class GamificationAchievementsService {
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

      // Note: Point updating should be handled by the calling service
      // to avoid circular dependencies
      return true;
    } catch (error) {
      console.error('Error in awardAchievement:', error);
      return false;
    }
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