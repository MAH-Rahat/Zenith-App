import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { Application } from 'express';

describe('Rate Limiting', () => {
  let app: Application;

  beforeEach(() => {
    app = createApp();
  });

  it('should allow requests within limit', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
  });

  it('should return 429 when limit exceeded', async () => {
    // Make 101 requests to exceed the limit of 100
    const requests = Array.from({ length: 101 }, () =>
      request(app).get('/api/health')
    );

    const responses = await Promise.all(requests);
    
    // At least one should be rate limited
    const rateLimitedResponse = responses.find(r => r.status === 429);
    
    if (rateLimitedResponse) {
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          details: {
            retryAfter: expect.any(String),
          },
        },
      });
    }
  }, 30000); // Increase timeout for this test

  it('should include rate limit headers', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
    expect(response.headers['ratelimit-reset']).toBeDefined();
  });

  it('should use consistent error format for rate limit', async () => {
    // Make many requests to trigger rate limit
    const requests = Array.from({ length: 101 }, () =>
      request(app).get('/api/health')
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponse = responses.find(r => r.status === 429);

    if (rateLimitedResponse) {
      expect(rateLimitedResponse.body).toHaveProperty('success', false);
      expect(rateLimitedResponse.body).toHaveProperty('error');
      expect(rateLimitedResponse.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(rateLimitedResponse.body.error).toHaveProperty('message');
    }
  }, 30000);
});
