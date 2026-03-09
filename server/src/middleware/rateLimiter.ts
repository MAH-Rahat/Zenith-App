import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { ErrorResponse } from '../types';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        details: {
          retryAfter: res.getHeader('Retry-After'),
        },
      },
    };
    
    res.status(429).json(response);
  },
  keyGenerator: (req) => {
    // Use userId from auth middleware if available, otherwise use IP
    return (req as any).userId || req.ip || 'unknown';
  },
});
