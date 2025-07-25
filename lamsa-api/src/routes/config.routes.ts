/**
 * @file config.routes.ts
 * @description Configuration endpoints for mobile app
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { Router, Request, Response } from 'express';
import { apiRateLimiter } from '../middleware/rate-limit.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = Router();

/**
 * @route GET /api/config/mobile
 * @description Get mobile app configuration (non-sensitive values only)
 * @access Public
 */
router.get('/mobile', apiRateLimiter, (req: Request, res: Response) => {
  // Only return config if proper headers are present
  const clientVersion = req.headers['x-client-version'];
  const platform = req.headers['x-platform'];
  
  if (!platform || platform !== 'mobile') {
    return res.status(400).json({
      success: false,
      error: 'Invalid client platform',
    });
  }

  // In production, you might want to check client version compatibility
  const minVersion = '1.0.0';
  if (clientVersion && clientVersion < minVersion) {
    return res.status(426).json({
      success: false,
      error: 'Client version too old. Please update the app.',
      minVersion,
    });
  }

  // Return configuration based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const config = {
    // SECURITY: Never expose sensitive credentials through public endpoints
    // Mobile apps should use authenticated endpoints to get configuration
    apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    environment: process.env.NODE_ENV || 'production',
    features: {
      enableOTP: true,
      enablePushNotifications: !isDevelopment,
      enableAnalytics: !isDevelopment,
      enableMockOTP: isDevelopment && process.env.ENABLE_MOCK_OTP === 'true',
    },
    // App-specific configuration
    app: {
      minPasswordLength: 8,
      otpLength: 6,
      otpExpiryMinutes: 5,
      maxLoginAttempts: 5,
      sessionTimeoutMinutes: 30,
      // Jordan-specific settings
      countryCode: '+962',
      phoneNumberPrefixes: ['77', '78', '79'],
      currency: 'JOD',
      defaultLanguage: 'ar',
      supportedLanguages: ['ar', 'en'],
    },
    // URLs for various services
    urls: {
      termsOfService: 'https://lamsa.com/terms',
      privacyPolicy: 'https://lamsa.com/privacy',
      support: 'https://lamsa.com/support',
      helpCenter: 'https://help.lamsa.com',
    },
  }

  return res.json({
    success: true,
    config,
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route GET /api/config/features
 * @description Get feature flags for mobile app
 * @access Public
 */
router.get('/features', apiRateLimiter, (_req: Request, res: Response) => {
  const features = {
    // Feature flags that can be toggled without app update
    booking: {
      enableInstantBooking: true,
      enableAdvancedBooking: true,
      maxAdvanceBookingDays: 30,
      enableCancellation: true,
      cancellationHoursBeforeAppointment: 24,
    },
    payment: {
      enableOnlinePayment: false, // Will be enabled when Tap integration is complete
      enableCashPayment: true,
      enableWalletPayment: false,
      paymentProviders: [],
    },
    provider: {
      enableProviderSignup: true,
      enablePortfolio: true,
      enableReviews: true,
      enableMessaging: false, // Coming soon
      maxPortfolioImages: 10,
    },
    search: {
      enableLocationSearch: true,
      enableFilterByPrice: true,
      enableFilterByRating: true,
      defaultSearchRadiusKm: 10,
      maxSearchRadiusKm: 50,
    },
    social: {
      enableSharing: true,
      enableReferrals: false, // Coming soon
      socialPlatforms: ['whatsapp', 'instagram', 'facebook'],
    },
  };

  res.json({
    success: true,
    features,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route GET /api/config/mobile/secure
 * @description Get secure mobile app configuration (authenticated)
 * @access Private - Requires authentication
 * @deprecated Supabase credentials should be embedded in the mobile app build process, not fetched via API
 */
router.get('/mobile/secure', authenticate, apiRateLimiter, (req: AuthRequest, res: Response) => {
  // SECURITY: Never expose Supabase credentials via API endpoints
  // These should be configured during the build process using environment variables
  
  // Return only non-sensitive configuration for authenticated users
  const config = {
    // Add any truly non-sensitive config that requires authentication here
    userSettings: {
      notificationsEnabled: true,
      language: 'ar',
    },
    // Feature flags that might be user-specific
    features: {
      betaFeatures: false,
      premiumFeatures: false,
    }
  };

  return res.json({
    success: true,
    config,
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;