import { Router } from 'express';
import { gamificationController } from '../controllers/gamification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateProvider } from '../middleware/provider.middleware';
import { apiRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication to all gamification routes
router.use(authenticate);

// Apply rate limiting
router.use(apiRateLimiter);

// Get comprehensive gamification overview
router.get('/overview/:providerId?', 
  validateProvider, 
  gamificationController.getGamificationOverview.bind(gamificationController)
);

// Get provider's current level and progress
router.get('/level/:providerId?', 
  validateProvider, 
  gamificationController.getProviderLevel.bind(gamificationController)
);

// Get daily goals and progress
router.get('/goals/daily/:providerId?', 
  validateProvider, 
  gamificationController.getDailyGoals.bind(gamificationController)
);

// Complete a daily goal
router.post('/goals/complete', 
  gamificationController.completeGoal.bind(gamificationController)
);

// Get provider achievements
router.get('/achievements/:providerId?', 
  validateProvider, 
  gamificationController.getProviderAchievements.bind(gamificationController)
);

// Get leaderboard
router.get('/leaderboard/:providerId?', 
  validateProvider, 
  gamificationController.getLeaderboard.bind(gamificationController)
);

// Get active challenges/events
router.get('/challenges/:providerId?', 
  validateProvider, 
  gamificationController.getActiveChallenges.bind(gamificationController)
);

// Get provider streaks
router.get('/streaks/:providerId?', 
  validateProvider, 
  gamificationController.getProviderStreaks.bind(gamificationController)
);

// Get available badges
router.get('/badges/:providerId?', 
  validateProvider, 
  gamificationController.getAvailableBadges.bind(gamificationController)
);

// Award achievement (admin endpoint - could add admin middleware)
router.post('/achievements/award', 
  gamificationController.awardAchievement.bind(gamificationController)
);

// Update provider points (admin endpoint)
router.post('/points/update', 
  gamificationController.updateProviderPoints.bind(gamificationController)
);

export default router;