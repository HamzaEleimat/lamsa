import { Router } from 'express';
import { realtimeController } from '../controllers/realtime.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateProvider } from '../middleware/provider.middleware';
import { apiRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication to all realtime routes
router.use(authenticate);

// Apply rate limiting
router.use(apiRateLimiter);

// Get WebSocket connection info
router.get('/info', 
  realtimeController.getWebSocketInfo.bind(realtimeController)
);

// Get real-time connection status for provider
router.get(['/status/:providerId', '/status'], 
  validateProvider,
  realtimeController.getConnectionStatus.bind(realtimeController)
);

// Get real-time service statistics
router.get('/stats', 
  realtimeController.getRealtimeStats.bind(realtimeController)
);

// Trigger metrics update for provider
router.post(['/metrics/update/:providerId', '/metrics/update'], 
  validateProvider,
  realtimeController.triggerMetricsUpdate.bind(realtimeController)
);

// Send custom notification to provider
router.post('/notifications/send', 
  realtimeController.sendNotification.bind(realtimeController)
);

// Send system announcement (admin endpoint)
router.post('/announcements/system', 
  realtimeController.sendSystemAnnouncement.bind(realtimeController)
);

// Test real-time functionality (development endpoint)
router.post('/test', 
  realtimeController.testRealtimeFunction.bind(realtimeController)
);

export default router;