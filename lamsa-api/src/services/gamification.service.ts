// Main gamification service that coordinates all gamification modules
import { GamificationAchievementsService } from './gamification-achievements.service';
import { GamificationPointsService } from './gamification-points.service';
import { GamificationLeaderboardService } from './gamification-leaderboard.service';
import { GamificationStreaksService } from './gamification-streaks.service';

// Re-export all interfaces
export type {
  Achievement,
  Badge
} from './gamification-achievements.service';

export type {
  ProviderLevel,
  DailyGoal
} from './gamification-points.service';

export type {
  Leaderboard,
  ChallengeEvent
} from './gamification-leaderboard.service';

export type {
  StreakInfo
} from './gamification-streaks.service';

/**
 * Main gamification service that coordinates all gamification functionality.
 * This service acts as a facade for all gamification modules, maintaining
 * backward compatibility while organizing code into focused services.
 */
export class GamificationService {
  private achievementsService: GamificationAchievementsService;
  private pointsService: GamificationPointsService;
  private leaderboardService: GamificationLeaderboardService;
  private streaksService: GamificationStreaksService;

  constructor() {
    this.achievementsService = new GamificationAchievementsService();
    this.pointsService = new GamificationPointsService();
    this.leaderboardService = new GamificationLeaderboardService();
    this.streaksService = new GamificationStreaksService();
  }

  // ===== LEVEL AND POINTS METHODS =====

  async getProviderLevel(providerId: string) {
    return this.pointsService.getProviderLevel(providerId);
  }

  async getDailyGoals(providerId: string, date: Date = new Date()) {
    return this.pointsService.getDailyGoals(providerId, date);
  }

  async completeGoal(providerId: string, goalType: string, date: Date = new Date()) {
    return this.pointsService.completeGoal(providerId, goalType, date);
  }

  async updateProviderPoints(providerId: string, pointsToAdd: number) {
    await this.pointsService.updateProviderPoints(providerId, pointsToAdd);
    
    // Check if this triggers any achievements
    const currentLevel = await this.pointsService.getProviderLevel(providerId);
    
    // Award level-up achievement if needed
    // This handles the circular dependency by having the main service coordinate
    const { data: lastLevelAchievement } = await require('../config/supabase').supabase
      .from('provider_achievements')
      .select('achievement_level')
      .eq('provider_id', providerId)
      .eq('achievement_type', 'level')
      .order('achievement_level', { ascending: false })
      .limit(1)
      .single();

    const lastAwardedLevel = lastLevelAchievement?.achievement_level || 0;
    
    if (currentLevel.currentLevel > lastAwardedLevel) {
      await this.achievementsService.awardAchievement(
        providerId,
        'level',
        `Level ${currentLevel.currentLevel} Achieved`,
        currentLevel.currentLevel,
        currentLevel.currentLevel * 100,
        currentLevel.currentLevel,
        currentLevel.currentLevel
      );
    }
  }

  // ===== ACHIEVEMENT METHODS =====

  async getProviderAchievements(providerId: string) {
    return this.achievementsService.getProviderAchievements(providerId);
  }

  async awardAchievement(
    providerId: string,
    achievementType: string,
    achievementName: string,
    level: number,
    points: number,
    currentValue: number,
    targetValue: number
  ) {
    const result = await this.achievementsService.awardAchievement(
      providerId,
      achievementType,
      achievementName,
      level,
      points,
      currentValue,
      targetValue
    );

    // Award points for the achievement
    if (result) {
      await this.pointsService.updateProviderPoints(providerId, points);
    }

    return result;
  }

  async getAvailableBadges(providerId: string) {
    return this.achievementsService.getAvailableBadges(providerId);
  }

  // ===== LEADERBOARD METHODS =====

  async getLeaderboard(
    providerId: string,
    scope: 'city' | 'category' | 'global' = 'city',
    limit: number = 20
  ) {
    return this.leaderboardService.getLeaderboard(providerId, scope, limit);
  }

  async getActiveChallenges(providerId: string) {
    return this.leaderboardService.getActiveChallenges(providerId);
  }

  // ===== STREAK METHODS =====

  async getProviderStreaks(providerId: string) {
    return this.streaksService.getProviderStreaks(providerId);
  }

  async updateBookingStreak(providerId: string, increment: boolean = true) {
    const newStreak = await this.streaksService.updateBookingStreak(providerId, increment);
    
    // Check for streak milestones and award points
    const awardedPoints = await this.streaksService.checkStreakMilestones(
      providerId,
      'booking',
      newStreak
    );

    if (awardedPoints > 0) {
      await this.pointsService.updateProviderPoints(providerId, awardedPoints);
    }

    return newStreak;
  }

  async updatePerfectRatingStreak(providerId: string, increment: boolean = true) {
    const newStreak = await this.streaksService.updatePerfectRatingStreak(providerId, increment);
    
    // Check for streak milestones and award points
    const awardedPoints = await this.streaksService.checkStreakMilestones(
      providerId,
      'rating',
      newStreak
    );

    if (awardedPoints > 0) {
      await this.pointsService.updateProviderPoints(providerId, awardedPoints);
    }

    return newStreak;
  }

  async updateResponseStreak(providerId: string, increment: boolean = true) {
    const newStreak = await this.streaksService.updateResponseStreak(providerId, increment);
    
    // Check for streak milestones and award points
    const awardedPoints = await this.streaksService.checkStreakMilestones(
      providerId,
      'response',
      newStreak
    );

    if (awardedPoints > 0) {
      await this.pointsService.updateProviderPoints(providerId, awardedPoints);
    }

    return newStreak;
  }
}

// Export individual services for direct use if needed
export {
  GamificationAchievementsService,
  GamificationPointsService,
  GamificationLeaderboardService,
  GamificationStreaksService
};