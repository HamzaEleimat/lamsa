import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Initialize environment variables first
dotenv.config();

// Initialize and validate environment configuration
import { initializeEnvironment } from './utils/environment-validation';
import { secureLogger } from './utils/secure-logger';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import providerRoutes from './routes/provider.routes';
import enhancedProviderRoutes from './routes/enhanced-provider.routes';
import serviceRoutes from './routes/service.routes';
import serviceManagementRoutes from './routes/service-management.routes';
import availabilityRoutes from './routes/availability.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reviewAnalyticsRoutes from './routes/review-analytics.routes';
import gamificationRoutes from './routes/gamification.routes';
import realtimeRoutes from './routes/realtime.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import reviewRoutes from './routes/review.routes';
import notificationRoutes from './routes/notification.routes';
import imageRoutes from './routes/image.routes';
import configRoutes from './routes/config.routes';
import mfaRoutes from './routes/mfa.routes';
import adminRoutes from './routes/admin.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';
import { csrfProtection, csrfTokenGenerator, getCSRFToken } from './middleware/csrf.middleware';
import { enforceHTTPS, addSecurityHeaders } from './middleware/https-redirect.middleware';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lamsa API',
      version: '1.0.0',
      description: 'Beauty booking platform API for Jordan market',
      contact: {
        name: 'Lamsa Development Team',
        email: 'dev@lamsa.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.lamsa.com' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Initialize and validate environment before creating app
secureLogger.info('Initializing environment configuration...');
// const envConfig = initializeEnvironment(); // Commented out to suppress unused variable warning
initializeEnvironment();

const app: Application = express();

// CORS configuration for mobile app support
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.) only in development
    if (!origin) {
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('Origin required'));
    }
    
    // Production allowed origins
    const productionOrigins = [
      'https://lamsa.com',
      'https://www.lamsa.com',
      'https://app.lamsa.com',
      'https://admin.lamsa.com',
      'https://api.lamsa.com'
    ];
    
    // Development allowed origins
    const developmentOrigins = [
      'http://localhost:8081', // Expo default
      'http://localhost:19000', // Expo DevTools
      'http://localhost:19001', // Expo web
      'http://localhost:19002', // Expo web
      'http://localhost:3000', // Web dashboard dev
      'http://localhost:3001', // Alternative API port
    ];
    
    // Get allowed origins based on environment
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? productionOrigins 
      : [...productionOrigins, ...developmentOrigins];
    
    // Check if origin is allowed
    let isAllowed = allowedOrigins.includes(origin);
    
    // In development only, allow Expo patterns
    if (!isAllowed && process.env.NODE_ENV === 'development') {
      isAllowed = /^https?:\/\/.*\.exp\.direct$/.test(origin) || // Expo published apps
                  /^https?:\/\/.*\.expo\.dev$/.test(origin) || // Expo development
                  /^exp:\/\//.test(origin); // Expo client
    }
    
    if (isAllowed) {
      callback(null, true);
    } else {
      secureLogger.warn('CORS blocked origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400 // Cache preflight response for 24 hours
};

// Enhanced security headers
const isDevelopment = process.env.NODE_ENV !== 'production';
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Only allow unsafe-inline in development for Swagger UI
      styleSrc: isDevelopment ? ["'self'", "'unsafe-inline'"] : ["'self'"],
      scriptSrc: isDevelopment ? ["'self'", "'unsafe-inline'"] : ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.lamsa.com", "https://*.supabase.co"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
  permittedCrossDomainPolicies: false,
  hidePoweredBy: true,
  ieNoOpen: true,
  frameguard: { action: 'deny' as const },
  dnsPrefetchControl: { allow: false }
};

// Apply middleware in correct order
app.use(enforceHTTPS); // HTTPS redirect - must be first
app.use(helmet(helmetOptions)); // Security headers - must be early
app.use(addSecurityHeaders); // Additional security headers
app.use(cors(corsOptions)); // CORS - must be before routes
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Request logging

// Cookie parser for CSRF token handling
app.use(cookieParser());

// Body parsing with size limits
app.use(express.json({ limit: '1mb' })); // Reduced since images now use direct upload
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CSRF token generation for web requests
app.use(csrfTokenGenerator);

// Request timeout middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set timeout to 30 seconds for mobile network conditions
  req.setTimeout(30000, () => {
    res.status(408).json({
      success: false,
      error: 'Request timeout',
      message: 'The request took too long to process'
    });
  });
  next();
});

// Apply general rate limiting to all routes
app.use(apiRateLimiter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// Base route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Lamsa API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      providers: '/api/providers',
      services: '/api/services',
      serviceManagement: '/api/service-management',
      availability: '/api/availability',
      dashboard: '/api/dashboard',
      reviewAnalytics: '/api/review-analytics',
      gamification: '/api/gamification',
      realtime: '/api/realtime',
      websocket: '/ws',
      bookings: '/api/bookings',
      payments: '/api/payments',
      reviews: '/api/reviews',
      notifications: '/api/notifications',
      images: '/api/images',
      mfa: '/api/mfa',
      admin: '/api/admin',
    },
  });
});

// Test dashboard route - REMOVED for security
// SECURITY: Never serve HTML files without authentication in production
if (isDevelopment) {
  app.get('/dashboard', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'test-dashboard.html'));
  });
}

// Swagger Documentation (ONLY in development - NEVER in production)
if (isDevelopment) {
  secureLogger.info('Swagger documentation enabled for development environment');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Lamsa API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true
    }
  }));

  // Swagger JSON endpoint
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
} else {
  // In production, always return 404 for Swagger endpoints
  // SECURITY: Never allow Swagger in production, even with environment variables
  app.get('/api/docs', (_req, res) => {
    res.status(404).json({ error: 'API documentation is disabled in production' });
  });
  app.get('/api/docs.json', (_req, res) => {
    res.status(404).json({ error: 'API documentation is disabled in production' });
  });
  
  // Log warning if someone tries to enable Swagger in production
  if (process.env.ENABLE_SWAGGER === 'true') {
    secureLogger.warn('SECURITY WARNING: Attempt to enable Swagger in production was blocked');
  }
}

// CSRF token endpoint (before CSRF protection)
app.get('/api/csrf-token', getCSRFToken);

// Apply CSRF protection to all routes (after token endpoint)
app.use(csrfProtection);

// Configuration endpoints (after CSRF protection - now protected)
app.use('/api/config', configRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/providers', enhancedProviderRoutes); // Enhanced provider features
app.use('/api/services', serviceRoutes);
app.use('/api/service-management', serviceManagementRoutes); // Enhanced service management
app.use('/api/availability', availabilityRoutes); // Availability management
app.use('/api/dashboard', dashboardRoutes); // Provider dashboard
app.use('/api/review-analytics', reviewAnalyticsRoutes); // Review analytics
app.use('/api/gamification', gamificationRoutes); // Gamification system
app.use('/api/realtime', realtimeRoutes); // Real-time updates
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use(errorHandler);

export default app;
