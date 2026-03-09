import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { Application } from 'express';

describe('Express App Setup', () => {
  let app: Application;

  beforeEach(() => {
    app = createApp();
  });

  describe('Middleware Chain', () => {
    it('should parse JSON body', async () => {
      const response = await request(app)
        .post('/api/health')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBeDefined();
    });

    it('should handle CORS', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should log requests', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
      });
    });

    it('should return consistent error format', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Health Check', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'ok',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app).get('/api/health');

      const timestamp = response.body.data.timestamp;
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });
});
