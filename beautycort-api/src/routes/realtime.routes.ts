import { Router } from 'express';
import { realtimeController } from '../controllers/realtime.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateProvider } from '../middleware/provider.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication to all realtime routes
router.use(authenticateToken);

// Apply rate limiting
router.use(rateLimitMiddleware);

// Get WebSocket connection info
router.get('/info', 
  realtimeController.getWebSocketInfo.bind(realtimeController)
);

// Get real-time connection status for provider
router.get('/status/:providerId?', 
  validateProvider,
  realtimeController.getConnectionStatus.bind(realtimeController)
);

// Get real-time service statistics
router.get('/stats', 
  realtimeController.getRealtimeStats.bind(realtimeController)
);

// Trigger metrics update for provider
router.post('/metrics/update/:providerId?', 
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