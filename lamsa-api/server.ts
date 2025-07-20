import { createServer } from 'http';
import app from './src/app';
import { realtimeService } from './src/services/realtime.service';
import { serverValidator } from './src/startup/server-validation';
import { connectRedis, disconnectRedis } from './src/config/redis';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
realtimeService.initialize(server);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Shutdown real-time service
    realtimeService.shutdown();
    
    // Disconnect from Redis
    await disconnectRedis();
    
    // Close database connections and other cleanup
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Force closing server');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server with validation
async function startServer() {
  try {
    // Run comprehensive startup validation
    await serverValidator.generateStartupReport();
    
    // Connect to Redis (optional - app will run without it)
    await connectRedis();
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 BeautyCort API server running on port ${PORT}`);
      console.log(`📊 Dashboard API available at http://localhost:${PORT}/api/dashboard`);
      console.log(`🔄 WebSocket server available at ws://localhost:${PORT}/ws`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧪 Test Dashboard: http://localhost:${PORT}/dashboard`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default server;