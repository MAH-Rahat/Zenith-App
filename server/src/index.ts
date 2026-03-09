import { createApp } from './app';
import { config, connectDatabase, disconnectDatabase, connectRedis, disconnectRedis } from './config';

async function startServer() {
  try {
    // Connect to MongoDB Atlas
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`🚀 Zenith Backend API running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      server.close(async () => {
        await disconnectRedis();
        await disconnectDatabase();
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
