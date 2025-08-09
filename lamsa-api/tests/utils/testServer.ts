/**
 * Test Server Utilities
 * Provides utilities for starting and stopping test servers
 */

import { Server } from 'http';
import app from '../../src/app';

let server: Server | null = null;

/**
 * Start test server
 */
export async function startTestServer(): Promise<Server> {
  if (server) {
    throw new Error('Test server is already running');
  }

  return new Promise((resolve, reject) => {
    const port = process.env.PORT || 3001;
    
    server = app.listen(port, () => {
      console.log(`🚀 Test server started on port ${port}`);
      resolve(server!);
    });

    server.on('error', (error) => {
      console.error('Test server error:', error);
      reject(error);
    });

    // Set timeout for server start
    setTimeout(() => {
      if (!server?.listening) {
        reject(new Error('Test server failed to start within timeout'));
      }
    }, 30000);
  });
}

/**
 * Stop test server
 */
export async function stopTestServer(serverInstance?: Server): Promise<void> {
  const targetServer = serverInstance || server;
  
  if (!targetServer) {
    console.log('No test server to stop');
    return;
  }

  return new Promise((resolve, reject) => {
    targetServer.close((error) => {
      if (error) {
        console.error('Error stopping test server:', error);
        reject(error);
      } else {
        console.log('✅ Test server stopped');
        server = null;
        resolve();
      }
    });

    // Force close after timeout
    setTimeout(() => {
      if (targetServer.listening) {
        console.log('Force closing test server...');
        // Force close all connections
        try {
          targetServer.close();
          targetServer.unref();
        } catch (err) {
          console.error('Error force closing server:', err);
        }
        server = null;
        resolve();
      }
    }, 10000);
  });
}

/**
 * Get test server instance
 */
export function getTestServer(): Server | null {
  return server;
}

/**
 * Check if test server is running
 */
export function isTestServerRunning(): boolean {
  return server !== null && server.listening;
}

/**
 * Wait for test server to be ready
 */
export async function waitForTestServer(timeout: number = 30000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (isTestServerRunning()) {
      // Additional check - try to make a request
      try {
        const response = await fetch(`http://localhost:${process.env.PORT || 3001}/api/health`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Test server failed to become ready within timeout');
}

// Cleanup on process exit
process.on('exit', async () => {
  if (server) {
    await stopTestServer();
  }
});

process.on('SIGINT', async () => {
  if (server) {
    await stopTestServer();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (server) {
    await stopTestServer();
  }
  process.exit(0);
});