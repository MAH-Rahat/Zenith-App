import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/authController';

const router = Router();

/**
 * POST /api/auth/register
 * Create new user with hashed password
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Authenticate user, return access + refresh tokens
 */
router.post('/login', login);

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token
 * Implements token rotation
 */
router.post('/refresh', refresh);

/**
 * POST /api/auth/logout
 * Revoke refresh token
 */
router.post('/logout', logout);

export default router;
