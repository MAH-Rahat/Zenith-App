import express, { Application } from 'express';
import cors from 'cors';
import { errorHandler, rateLimiter, requestLogger } from './middleware';
import routes from './routes';

export function createApp(): Application {
  const app = express();

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  // Request logging middleware
  app.use(requestLogger);

  // Rate limiting middleware
  app.use(rateLimiter);

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
