/**
 * Minimal Production Server for BeautyCort API
 * Simplified version for emergency deployment
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Initialize Supabase (gracefully handle missing credentials)
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? 
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) : 
  null;

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    let databaseStatus = 'not_configured';
    
    // Check database connection if Supabase is configured
    if (supabase) {
      try {
        const { error } = await supabase.from('users').select('count').limit(1);
        databaseStatus = error ? 'disconnected' : 'connected';
      } catch (err) {
        databaseStatus = 'error';
      }
    }
    
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: databaseStatus,
      memory: process.memoryUsage(),
      redis: process.env.REDIS_URL ? 'configured' : 'not_configured'
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Detailed health check
app.get('/api/health/detailed', async (req, res) => {
  try {
    const checks = [];

    // Database check
    if (supabase) {
      try {
        const { error } = await supabase.from('users').select('count').limit(1);
        checks.push({
          name: 'Database',
          status: error ? 'unhealthy' : 'healthy',
          responseTime: 100,
          details: error ? { error: error.message } : { connection: 'active' }
        });
      } catch (error) {
        checks.push({
          name: 'Database',
          status: 'unhealthy',
          responseTime: 0,
          details: { error: 'Connection failed' }
        });
      }
    } else {
      checks.push({
        name: 'Database',
        status: 'degraded',
        responseTime: 0,
        details: { error: 'Supabase not configured' }
      });
    }

    // Environment check
    checks.push({
      name: 'Environment',
      status: 'healthy',
      responseTime: 1,
      details: {
        nodeEnv: process.env.NODE_ENV,
        version: process.version,
        platform: process.platform
      }
    });

    // Configuration check
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    checks.push({
      name: 'Configuration',
      status: missingVars.length === 0 ? 'healthy' : 'degraded',
      responseTime: 1,
      details: {
        missingVars,
        configuredVars: requiredEnvVars.filter(v => process.env[v]).length
      }
    });

    const allHealthy = checks.every(check => check.status === 'healthy');
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');

    res.status(200).json({
      status: hasUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        degraded: checks.filter(c => c.status === 'degraded').length,
        unhealthy: checks.filter(c => c.status === 'unhealthy').length
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

// Basic API endpoints for testing
app.get('/api', (req, res) => {
  res.json({
    message: 'BeautyCort API - Minimal Production Version',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    endpoints: {
      health: '/api/health',
      detailedHealth: '/api/health/detailed'
    },
    status: 'operational'
  });
});

// Basic auth endpoint for testing
app.post('/api/auth/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth endpoint accessible',
    timestamp: new Date().toISOString()
  });
});

// Basic providers endpoint for testing
app.get('/api/providers', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Providers endpoint accessible (minimal version)',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 BeautyCort API (Minimal) running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Detailed health: http://localhost:${PORT}/api/health/detailed`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;