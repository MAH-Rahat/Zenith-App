import { Router } from 'express';
import authRoutes from './authRoutes';
import agentRoutes from './agentRoutes';

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

export default router;
