import app from './app';
import { supabase } from './config/supabase-simple';

const PORT = process.env.PORT || 3001;

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('_test_').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      console.warn('Supabase connection warning:', error.message);
    } else {
      console.log('✅ Supabase connected successfully');
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
  }
};

const server = app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  
  // Test database connection
  await testSupabaseConnection();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default server;