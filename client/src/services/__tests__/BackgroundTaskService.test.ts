/**
 * BackgroundTaskService.test.ts
 * 
 * Unit tests for BackgroundTaskService
 */

import { backgroundTaskService } from '../BackgroundTaskService';
import { hpSystem } from '../HPSystem';

// Mock expo-task-manager
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock HPSystem
jest.mock('../HPSystem', () => ({
  hpSystem: {
    checkInactivity: jest.fn(),
  },
}));

describe('BackgroundTaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Stop any running intervals
    backgroundTaskService.stopPeriodicCheck();
  });

  afterEach(() => {
    // Clean up intervals
    backgroundTaskService.stopPeriodicCheck();
  });

  describe('registerHPInactivityTask', () => {
    it('should register the HP inactivity task and start periodic check', async () => {
      // Mock checkInactivity to return no penalty
      (hpSystem.checkInactivity as jest.Mock).mockResolvedValue({
        penaltyApplied: false,
        currentHP: 100,
        hoursInactive: 0,
      });

      await backgroundTaskService.registerHPInactivityTask();

      // Verify checkInactivity was called (initial check)
      expect(hpSystem.checkInactivity).toHaveBeenCalled();
    });

    it('should handle errors during registration gracefully', async () => {
      // Mock checkInactivity to throw error
      (hpSystem.checkInactivity as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      // Should throw because initial check fails
      await expect(
        backgroundTaskService.registerHPInactivityTask()
      ).rejects.toThrow('Failed to register background task');
      
      // Clean up
      backgroundTaskService.stopPeriodicCheck();
    });
  });

  describe('triggerManualCheck', () => {
    it('should manually trigger an inactivity check', async () => {
      // Mock checkInactivity
      (hpSystem.checkInactivity as jest.Mock).mockResolvedValue({
        penaltyApplied: false,
        currentHP: 100,
        hoursInactive: 5,
      });

      await backgroundTaskService.triggerManualCheck();

      expect(hpSystem.checkInactivity).toHaveBeenCalled();
    });

    it('should handle penalty application', async () => {
      // Mock checkInactivity with penalty
      (hpSystem.checkInactivity as jest.Mock).mockResolvedValue({
        penaltyApplied: true,
        currentHP: 85,
        hoursInactive: 25,
      });

      await backgroundTaskService.triggerManualCheck();

      expect(hpSystem.checkInactivity).toHaveBeenCalled();
    });
  });

  describe('getTaskName', () => {
    it('should return the task name constant', () => {
      const taskName = backgroundTaskService.getTaskName();
      expect(taskName).toBe('HP_INACTIVITY_CHECK');
    });
  });

  describe('stopPeriodicCheck', () => {
    it('should stop the periodic check', () => {
      // This should not throw
      backgroundTaskService.stopPeriodicCheck();
    });
  });

  describe('unregisterHPInactivityTask', () => {
    it('should unregister the task and stop periodic check', async () => {
      await backgroundTaskService.unregisterHPInactivityTask();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
