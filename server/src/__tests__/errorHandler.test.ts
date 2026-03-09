import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import { errorHandler, AppError } from '../middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should handle AppError with correct status and format', async () => {
    app.get('/test-error', (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError(400, 'TEST_ERROR', 'This is a test error'));
    });
    app.use(errorHandler);

    const response = await request(app).get('/test-error');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: 'This is a test error',
      },
    });
  });

  it('should include details when provided', async () => {
    app.get('/test-error-details', (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError(422, 'VALIDATION_ERROR', 'Validation failed', { field: 'email' }));
    });
    app.use(errorHandler);

    const response = await request(app).get('/test-error-details');

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { field: 'email' },
      },
    });
  });

  it('should handle unexpected errors with 500 status', async () => {
    app.get('/test-unexpected', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('Unexpected error'));
    });
    app.use(errorHandler);

    const response = await request(app).get('/test-unexpected');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  it('should maintain consistent error format', async () => {
    app.get('/test-format', (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError(403, 'FORBIDDEN', 'Access denied'));
    });
    app.use(errorHandler);

    const response = await request(app).get('/test-format');

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
    expect(response.body.error).toHaveProperty('message');
  });

  it('should handle multiple error types', async () => {
    app.get('/error-401', (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'));
    });
    app.get('/error-404', (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError(404, 'NOT_FOUND', 'Resource not found'));
    });
    app.use(errorHandler);

    const response401 = await request(app).get('/error-401');
    expect(response401.status).toBe(401);
    expect(response401.body.error.code).toBe('UNAUTHORIZED');

    const response404 = await request(app).get('/error-404');
    expect(response404.status).toBe(404);
    expect(response404.body.error.code).toBe('NOT_FOUND');
  });
});
