import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Initialize environment variables first
dotenv.config();

// Initialize and validate environment configuration
import { initializeEnvironment } from './utils/environment-validation';

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

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BeautyCort API',
      version: '1.0.0',
      description: 'Beauty booking platform API for Jordan market',
      contact: {
        name: 'BeautyCort Development Team',
        email: 'dev@beautycort.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.beautycort.com' 
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
console.log('🔧 Initializing environment configuration...');
// const envConfig = initializeEnvironment(); // Commented out to suppress unused variable warning
initializeEnvironment();

const app: Application = express();

// CORS configuration for mobile app support
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allowed origins
    const allowedOrigins = [
      'http://localhost:8081', // Expo default
      'http://localhost:19000', // Expo DevTools
      'http://localhost:19001', // Expo web
      'http://localhost:19002', // Expo web
      'http://localhost:3000', // Web dashboard dev
      'http://localhost:3001', // Alternative API port
      'https://beautycort.com', // Production web
      'https://api.beautycort.com' // Production API
    ];
    
    // Check if origin is allowed or matches Expo pattern
    const isAllowed = allowedOrigins.includes(origin) || 
                     /^https?:\/\/.*\.exp\.direct$/.test(origin) || // Expo published apps
                     /^https?:\/\/.*\.expo\.dev$/.test(origin) || // Expo development
                     /^exp:\/\//.test(origin); // Expo client
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400 // Cache preflight response for 24 hours
};

// Enhanced security headers
const helmetOptions = {
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.beautycort.com"],
    }
  } : false, // Disable CSP in development
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
};

// Apply middleware in correct order
app.use(helmet(helmetOptions)); // Security headers - must be early
app.use(cors(corsOptions)); // CORS - must be before routes
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Request logging

// Body parsing with size limits
app.use(express.json({ limit: '10mb' })); // For image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    message: 'BeautyCort API',
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
    },
  });
});

// Test dashboard route
app.get('/dashboard', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'test-dashboard.html'));
});

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'BeautyCort API Documentation',
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
