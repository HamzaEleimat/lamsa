import app from './app';
import { supabase } from './config/supabase';
import { secureLogger } from './utils/secure-logger';

const PORT = process.env.PORT || 3001;

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('_test_').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      secureLogger.warn('Supabase connection warning', { message: error.message });
    } else {
      secureLogger.info('Supabase connected successfully');
    }
  } catch (error) {
    secureLogger.error('Supabase connection error', error);
  }
};

const server = app.listen(PORT, async () => {
  secureLogger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    apiBaseUrl: `http://localhost:${PORT}/api`,
    healthCheck: `http://localhost:${PORT}/api/health`
  });
  
  // Test database connection
  await testSupabaseConnection();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  secureLogger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    secureLogger.info('HTTP server closed');
  });
});

export default server;