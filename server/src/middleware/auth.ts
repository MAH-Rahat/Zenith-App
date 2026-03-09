import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import { AuthRequest } from '../types';

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Authentication middleware
 * - Validates JWT on all protected endpoints
 * - Extracts user ID from token
 * - Returns 401 status code for invalid/expired tokens
 */
export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'No token provided');
    }
    
    const token = authHeader.substring(7);
    
    // Verify token signature and expiry
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // Extract user ID and attach to request
    req.userId = decoded.userId;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // Return 401 for invalid/expired tokens
      next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
};
