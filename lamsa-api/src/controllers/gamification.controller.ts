import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { BilingualAppError } from '../middleware/enhanced-bilingual-error.middleware';
import { GamificationService } from '../services/gamification.service';

export class GamificationController {
  private gamificationService: GamificationService;

  constructor() {
    this.gamificationService = new GamificationService();
  }

  // Get provider's current level and progress
  async getProviderLevel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      const level = await this.gamificationService.getProviderLevel(providerId);

      const response: ApiResponse = {
        success: true,
        data: level
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get today's goals and progress
  async getDailyGoals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { date } = req.query;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      const targetDate = date ? new Date(date as string) : new Date();
      const goals = await this.gamificationService.getDailyGoals(providerId, targetDate);

      const response: ApiResponse = {
        success: true,
        data: {
          date: targetDate.toISOString().split('T')[0],
          goals
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get provider achievements
  async getProviderAchievements(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      const achievements = await this.gamificationService.getProviderAchievements(providerId);

      const response: ApiResponse = {
        success: true,
        data: {
          achievements,
          totalEarned: achievements.filter(a => a.isEarned).length,
          totalAvailable: achievements.length,
          totalPointsFromAchievements: achievements
            .filter(a => a.isEarned)
            .reduce((sum, a) => sum + a.pointsEarned, 0)
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get leaderboard
  async getLeaderboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      const { scope = 'city', limit = 20 } = req.query;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      const leaderboard = await this.gamificationService.getLeaderboard(
        providerId,
        scope as 'city' | 'category' | 'global',
        Number(limit)
      );

      // Find current provider's position
      const currentProviderRank = leaderboard.findIndex(entry => entry.providerId === providerId) + 1;

      const response: ApiResponse = {
        success: true,
        data: {
          leaderboard,
          currentProviderRank: currentProviderRank || null,
          scope,
          totalProviders: leaderboard.length
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get active challenges/events
  async getActiveChallenges(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      const challenges = await this.gamificationService.getActiveChallenges(providerId);

      const response: ApiResponse = {
        success: true,
        data: {
          challenges,
          participatingIn: challenges.filter(c => c.userParticipating).length,
          totalActive: challenges.filter(c => c.isActive).length
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get provider streaks
  async getProviderStreaks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      const streaks = await this.gamificationService.getProviderStreaks(providerId);

      const response: ApiResponse = {
        success: true,
        data: streaks
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Complete a daily goal
  async completeGoal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.user?.id;
      const { goalType, date } = req.body;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      if (!goalType) {
        throw new BilingualAppError('Goal type is required', 400);
      }

      const targetDate = date ? new Date(date) : new Date();
      const pointsEarned = await this.gamificationService.completeGoal(providerId, goalType, targetDate);

      const response: ApiResponse = {
        success: true,
        data: {
          goalType,
          pointsEarned,
          message: pointsEarned > 0 ? 'Goal completed successfully!' : 'Goal already completed or not found'
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Award achievement manually (admin endpoint)
  async awardAchievement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId, achievementType, achievementName, level, points, currentValue, targetValue } = req.body;
      
      if (!providerId || !achievementType || !achievementName) {
        throw new BilingualAppError('Provider ID, achievement type, and name are required', 400);
      }

      const success = await this.gamificationService.awardAchievement(
        providerId,
        achievementType,
        achievementName,
        level || 1,
        points || 100,
        currentValue || 0,
        targetValue || 1
      );

      const response: ApiResponse = {
        success,
        message: success ? 'Achievement awarded successfully' : 'Failed to award achievement'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get available badges
  async getAvailableBadges(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      const badges = await this.gamificationService.getAvailableBadges(providerId);
      const earnedBadges = badges.filter(b => b.isEarned);
      const availableBadges = badges.filter(b => !b.isEarned);

      const response: ApiResponse = {
        success: true,
        data: {
          badges,
          earned: earnedBadges,
          available: availableBadges,
          earnedCount: earnedBadges.length,
          totalCount: badges.length,
          completionPercentage: (earnedBadges.length / badges.length) * 100
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get comprehensive gamification overview
  async getGamificationOverview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = req.params.providerId || req.user?.id;
      
      if (!providerId) {
        throw new BilingualAppError('Provider ID is required', 400);
      }

      // Get all gamification data in parallel
      const [
        level,
        dailyGoals,
        achievements,
        streaks,
        badges,
        challenges
      ] = await Promise.all([
        this.gamificationService.getProviderLevel(providerId),
        this.gamificationService.getDailyGoals(providerId),
        this.gamificationService.getProviderAchievements(providerId),
        this.gamificationService.getProviderStreaks(providerId),
        this.gamificationService.getAvailableBadges(providerId),
        this.gamificationService.getActiveChallenges(providerId)
      ]);

      const earnedBadges = badges.filter(b => b.isEarned);
      const completedGoals = dailyGoals.filter(g => g.completed);

      const response: ApiResponse = {
        success: true,
        data: {
          level,
          dailyGoals: {
            goals: dailyGoals,
            completed: completedGoals.length,
            total: dailyGoals.length,
            completionRate: dailyGoals.length > 0 ? (completedGoals.length / dailyGoals.length) * 100 : 0
          },
          achievements: {
            recent: achievements.filter(a => a.isEarned).slice(0, 5),
            total: achievements.filter(a => a.isEarned).length,
            available: achievements.length
          },
          badges: {
            earned: earnedBadges,
            count: earnedBadges.length,
            total: badges.length
          },
          streaks,
          challenges: {
            active: challenges.filter(c => c.isActive),
            participating: challenges.filter(c => c.userParticipating),
            count: challenges.length
          },
          summary: {
            totalPoints: level.currentPoints,
            currentLevel: level.currentLevel,
            nextLevelProgress: level.levelProgress,
            achievementsEarned: achievements.filter(a => a.isEarned).length,
            badgesEarned: earnedBadges.length,
            currentStreak: Math.max(
              streaks.bookingStreak,
              streaks.perfectRatingStreak,
              streaks.responseStreak
            )
          }
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Update provider points (internal use)
  async updateProviderPoints(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerId, points } = req.body;
      
      if (!providerId || points === undefined) {
        throw new BilingualAppError('Provider ID and points are required', 400);
      }

      await this.gamificationService.updateProviderPoints(providerId, Number(points));

      const response: ApiResponse = {
        success: true,
        message: `${points} points ${points >= 0 ? 'added to' : 'deducted from'} provider account`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const gamificationController = new GamificationController();