import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { getRedisClient } from '../config/redis';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Generate access token with 15-minute expiry
 */
function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as TokenPayload,
    config.jwt.secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token with 7-day expiry
 */
function generateRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as TokenPayload,
    config.jwt.refreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Store refresh token in Redis with 7-day TTL
 */
async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const key = `refresh_token:${userId}`;
  const redis = getRedisClient();
  await redis.set(key, token, { EX: REFRESH_TOKEN_TTL });
}

/**
 * Revoke refresh token from Redis
 */
async function revokeRefreshToken(userId: string): Promise<void> {
  const key = `refresh_token:${userId}`;
  const redis = getRedisClient();
  await redis.del(key);
}

/**
 * Verify refresh token from Redis
 */
async function verifyRefreshToken(userId: string, token: string): Promise<boolean> {
  const key = `refresh_token:${userId}`;
  const redis = getRedisClient();
  const storedToken = await redis.get(key);
  return storedToken === token;
}

/**
 * POST /api/auth/register
 * Create new user with hashed password
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Email and password are required');
    }

    if (password.length < 8) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError(409, 'USER_EXISTS', 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.email);
    const refreshToken = generateRefreshToken(user._id.toString(), user.email);

    // Store refresh token in Redis
    await storeRefreshToken(user._id.toString(), refreshToken);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          totalEXP: user.totalEXP,
          level: user.level,
          rank: user.rank,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate user, return access + refresh tokens
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Email and password are required');
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.getPasswordHash());
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.email);
    const refreshToken = generateRefreshToken(user._id.toString(), user.email);

    // Store refresh token in Redis (replaces any existing token)
    await storeRefreshToken(user._id.toString(), refreshToken);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          totalEXP: user.totalEXP,
          level: user.level,
          rank: user.rank,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token
 * Implements token rotation: issues new refresh token on each use
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Refresh token is required');
    }

    // Verify refresh token signature
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
    } catch (error) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
    }

    // Verify refresh token exists in Redis
    const isValid = await verifyRefreshToken(decoded.userId, refreshToken);
    if (!isValid) {
      throw new AppError(401, 'INVALID_TOKEN', 'Refresh token has been revoked');
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Generate new tokens (token rotation)
    const newAccessToken = generateAccessToken(user._id.toString(), user.email);
    const newRefreshToken = generateRefreshToken(user._id.toString(), user.email);

    // Store new refresh token in Redis (replaces old token)
    await storeRefreshToken(user._id.toString(), newRefreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Revoke refresh token
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Refresh token is required');
    }

    // Verify refresh token signature
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
    } catch (error) {
      // Even if token is expired, we should try to revoke it
      decoded = jwt.decode(refreshToken) as TokenPayload;
      if (!decoded || !decoded.userId) {
        throw new AppError(400, 'INVALID_TOKEN', 'Invalid refresh token');
      }
    }

    // Revoke refresh token from Redis
    await revokeRefreshToken(decoded.userId);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}
