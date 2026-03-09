import { Router } from 'express';
import authRoutes from './authRoutes';
import agentRoutes from './agentRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// AI Agent routes
router.use('/agents', agentRoutes);

// Notification routes
// Requirement 62.3: Send device token to backend for notification targeting
router.use('/notifications', notificationRoutes);

export default router;
