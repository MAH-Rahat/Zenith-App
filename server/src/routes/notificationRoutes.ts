/**
 * Notification Routes
 * 
 * Handles device token registration for push notifications.
 * 
 * Requirements:
 * - 62.3: Send device token to backend for notification targeting
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { DeviceToken } from '../models/DeviceToken';

const router = Router();

/**
 * POST /api/notifications/register-device
 * Register device token for push notifications
 * Requirement 62.3: Send device token to backend for notification targeting
 */
router.post('/register-device', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { deviceToken, platform, deviceInfo } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    if (!deviceToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Device token is required',
        },
      });
    }

    // Check if token already exists for this user
    let existingToken = await DeviceToken.findOne({ userId, deviceToken });

    if (existingToken) {
      // Update existing token
      existingToken.platform = platform;
      existingToken.deviceInfo = deviceInfo;
      existingToken.lastUpdated = new Date();
      await existingToken.save();

      return res.json({
        success: true,
        data: {
          message: 'Device token updated successfully',
          tokenId: existingToken._id,
        },
      });
    }

    // Create new token
    const newToken = new DeviceToken({
      userId,
      deviceToken,
      platform,
      deviceInfo,
      isActive: true,
      lastUpdated: new Date(),
    });

    await newToken.save();

    res.status(201).json({
      success: true,
      data: {
        message: 'Device token registered successfully',
        tokenId: newToken._id,
      },
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register device token',
      },
    });
  }
});

/**
 * DELETE /api/notifications/unregister-device
 * Unregister device token (e.g., on logout)
 */
router.delete('/unregister-device', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { deviceToken } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    if (!deviceToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Device token is required',
        },
      });
    }

    // Mark token as inactive instead of deleting
    await DeviceToken.updateOne(
      { userId, deviceToken },
      { isActive: false, lastUpdated: new Date() }
    );

    res.json({
      success: true,
      data: {
        message: 'Device token unregistered successfully',
      },
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to unregister device token',
      },
    });
  }
});

export default router;
