import { Router } from 'express';
import authRoutes from './authRoutes';

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

export default router;
