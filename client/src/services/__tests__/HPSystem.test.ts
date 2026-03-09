/**
 * HPSystem.test.ts
 * 
 * Unit tests for HPSystem service
 * Tests HP initialization, inactivity detection, penalty application, and logging
 */

import { hpSystem } from '../HPSystem';
import { databaseManager } from '../DatabaseManager';
import { HP_RULES } from '../../config/GameRules';

// Mock DatabaseManager
jest.mock('../DatabaseManager', () => ({
  databaseManager: {
    init: jest.fn(),
    query: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

describe('HPSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeHP', () => {
    it('should log when HP is already initialized', async () => {
      const mockProfile = {
        id: 1,
        totalEXP: 0,
        dailyEXP: 0,
        level: 0,
        rank: 'Script Novice',
        currentHP: 100,
        lastResetDate: new Date().toISOString(),
        lastActivityTimestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await hpSystem.initializeHP();

      expect(consoleSpy).toHaveBeenCalledWith('HP already initialized at base value');
      consoleSpy.mockRestore();
    });

    it('should handle missing user profile', async () => {
      (databaseManager.query as jest.Mock).mockResolvedValue([]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await hpSystem.initializeHP();

      expect(consoleSpy).toHaveBeenCalledWith('User profile will be initialized by DatabaseManager');
      consoleSpy.mockRestore();
    });
  });

  describe('checkInactivity', () => {
    it('should not apply penalty if less than 24 hours inactive', async () => {
      const now = Date.now();
      const mockProfile = {
        id: 1,
        totalEXP: 0,
        dailyEXP: 0,
        level: 0,
        rank: 'Script Novice',
        currentHP: 100,
        lastResetDate: new Date().toISOString(),
        lastActivityTimestamp: now - (20 * 60 * 60 * 1000), // 20 hours ago
        updatedAt: new Date().toISOString(),
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);

      const result = await hpSystem.checkInactivity();

      expect(result.penaltyApplied).toBe(false);
      expect(result.currentHP).toBe(100);
      expect(result.hoursInactive).toBeLessThan(24);
    });

    it('should not apply penalty if EXP was earned in last 24 hours', async () => {
      const now = Date.now();
      const mockProfile = {
        id: 1,
        totalEXP: 50,
        dailyEXP: 20, // EXP earned today
        level: 0,
        rank: 'Script Novice',
        currentHP: 100,
        lastResetDate: new Date().toISOString(),
        lastActivityTimestamp: now - (25 * 60 * 60 * 1000), // 25 hours ago
        updatedAt: new Date().toISOString(),
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);

      const result = await hpSystem.checkInactivity();

      expect(result.penaltyApplied).toBe(false);
      expect(result.currentHP).toBe(100);
    });

    it('should apply penalty after 24 hours with 0 EXP', async () => {
      const now = Date.now();
      const mockProfile = {
        id: 1,
        totalEXP: 0,
        dailyEXP: 0, // No EXP earned
        level: 0,
        rank: 'Script Novice',
        currentHP: 100,
        lastResetDate: new Date().toISOString(),
        lastActivityTimestamp: now - (25 * 60 * 60 * 1000), // 25 hours ago
        updatedAt: new Date().toISOString(),
      };

      const mockUpdatedProfile = {
        ...mockProfile,
        currentHP: 85, // 100 - 15
      };

      // Mock the query calls in order:
      // 1. checkInactivity() queries user profile
      // 2. applyPenalty() queries user profile
      // 3. checkInactivity() queries updated profile after penalty
      (databaseManager.query as jest.Mock)
        .mockResolvedValueOnce([mockProfile])  // First call in checkInactivity
        .mockResolvedValueOnce([mockProfile])  // Call in applyPenalty
        .mockResolvedValueOnce([mockUpdatedProfile]); // Second call in checkInactivity

      (databaseManager.update as jest.Mock).mockResolvedValue(undefined);
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      const result = await hpSystem.checkInactivity();

      expect(result.penaltyApplied).toBe(true);
      expect(result.currentHP).toBe(85);
      expect(result.hoursInactive).toBeGreaterThanOrEqual(24);
    });
  });

  describe('applyPenalty', () => {
    it('should deduct 15 HP from current HP', async () => {
      const mockProfile = {
        id: 1,
        totalEXP: 0,
        dailyEXP: 0,
        level: 0,
        rank: 'Script Novice',
        currentHP: 100,
        lastResetDate: new Date().toISOString(),
        lastActivityTimestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);
      (databaseManager.update as jest.Mock).mockResolvedValue(undefined);
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      const result = await hpSystem.applyPenalty();

      expect(result.newHP).toBe(85); // 100 - 15
      expect(result.penaltyAmount).toBe(-15);
      expect(result.criticalStateTriggered).toBe(false);

      expect(databaseManager.update).toHaveBeenCalledWith(
        'user_profile',
        expect.objectContaining({
          currentHP: 85,
        }),
        'id = 1'
      );
    });

    it('should not reduce HP below 0', async () => {
      const mockProfile = {
        id: 1,
        totalEXP: 0,
        dailyEXP: 0,
        level: 0,
        rank: 'Script Novice',
        currentHP: 10, // Low HP
        lastResetDate: new Date().toISOString(),
        lastActivityTimestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);
      (databaseManager.update as jest.Mock).mockResolvedValue(undefined);
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      const result = await hpSystem.applyPenalty();

      expect(result.newHP).toBe(0); // Should not go below 0
      expect(result.criticalStateTriggered).toBe(true);
    });

    it('should trigger Critical State when HP reaches 0', async () => {
      const mockProfile = {
        id: 1,
        totalEXP: 0,
        dailyEXP: 0,
        level: 0,
        rank: 'Script Novice',
        currentHP: 15, // Exactly one penalty away from 0
        lastResetDate: new Date().toISOString(),
        lastActivityTimestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);
      (databaseManager.update as jest.Mock).mockResolvedValue(undefined);
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await hpSystem.applyPenalty();

      expect(result.newHP).toBe(0);
      expect(result.criticalStateTriggered).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Critical State triggered - HP reached 0');

      consoleSpy.mockRestore();
    });
  });

  describe('logHPChange', () => {
    it('should log HP change to hp_log table', async () => {
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      await hpSystem.logHPChange(-15, 'daily_inactivity_penalty', 85);

      expect(databaseManager.insert).toHaveBeenCalledWith(
        'hp_log',
        expect.objectContaining({
          hpChange: -15,
          reason: 'daily_inactivity_penalty',
          newHP: 85,
          user_id: 1,
        })
      );
    });

    it('should not throw error if logging fails', async () => {
      (databaseManager.insert as jest.Mock).mockRejectedValue(new Error('Database error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(hpSystem.logHPChange(-15, 'test', 85)).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getCurrentHP', () => {
    it('should return current HP from database', async () => {
      const mockProfile = {
        id: 1,
        currentHP: 75,
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);

      const hp = await hpSystem.getCurrentHP();

      expect(hp).toBe(75);
    });

    it('should throw error if user profile not found', async () => {
      (databaseManager.query as jest.Mock).mockResolvedValue([]);

      await expect(hpSystem.getCurrentHP()).rejects.toThrow('Failed to get current HP');
    });
  });

  describe('resetHP', () => {
    it('should reset HP to base value', async () => {
      (databaseManager.update as jest.Mock).mockResolvedValue(undefined);
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      await hpSystem.resetHP();

      expect(databaseManager.update).toHaveBeenCalledWith(
        'user_profile',
        expect.objectContaining({
          currentHP: HP_RULES.base_hp,
        }),
        'id = 1'
      );

      expect(databaseManager.insert).toHaveBeenCalledWith(
        'hp_log',
        expect.objectContaining({
          hpChange: HP_RULES.base_hp,
          reason: 'critical_state_reset',
          newHP: HP_RULES.base_hp,
        })
      );
    });
  });

  describe('adjustHP', () => {
    it('should adjust HP by specified amount', async () => {
      const mockProfile = {
        id: 1,
        currentHP: 50,
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);
      (databaseManager.update as jest.Mock).mockResolvedValue(undefined);
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      const newHP = await hpSystem.adjustHP(20, 'test_adjustment');

      expect(newHP).toBe(70);
      expect(databaseManager.update).toHaveBeenCalledWith(
        'user_profile',
        expect.objectContaining({
          currentHP: 70,
        }),
        'id = 1'
      );
    });

    it('should not allow HP to exceed base_hp', async () => {
      const mockProfile = {
        id: 1,
        currentHP: 95,
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);
      (databaseManager.update as jest.Mock).mockResolvedValue(undefined);
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      const newHP = await hpSystem.adjustHP(20, 'test_adjustment');

      expect(newHP).toBe(100); // Capped at base_hp
    });

    it('should not allow HP to go below 0', async () => {
      const mockProfile = {
        id: 1,
        currentHP: 10,
      };

      (databaseManager.query as jest.Mock).mockResolvedValue([mockProfile]);
      (databaseManager.update as jest.Mock).mockResolvedValue(undefined);
      (databaseManager.insert as jest.Mock).mockResolvedValue(1);

      const newHP = await hpSystem.adjustHP(-20, 'test_adjustment');

      expect(newHP).toBe(0); // Floored at 0
    });
  });

  describe('getHPPercentage', () => {
    it('should calculate HP percentage correctly', () => {
      expect(hpSystem.getHPPercentage(100)).toBe(100);
      expect(hpSystem.getHPPercentage(50)).toBe(50);
      expect(hpSystem.getHPPercentage(0)).toBe(0);
      expect(hpSystem.getHPPercentage(75)).toBe(75);
    });
  });

  describe('getHPColor', () => {
    it('should return alert color for 0 HP', () => {
      expect(hpSystem.getHPColor(0)).toBe('#FF2A42');
    });

    it('should return alert color for HP <= 25%', () => {
      expect(hpSystem.getHPColor(25)).toBe('#FF2A42');
      expect(hpSystem.getHPColor(10)).toBe('#FF2A42');
    });

    it('should return caution color for HP <= 50%', () => {
      expect(hpSystem.getHPColor(50)).toBe('#FFB800');
      expect(hpSystem.getHPColor(30)).toBe('#FFB800');
    });

    it('should return active color for HP <= 75%', () => {
      expect(hpSystem.getHPColor(75)).toBe('#00E5FF');
      expect(hpSystem.getHPColor(60)).toBe('#00E5FF');
    });

    it('should return growth color for HP > 75%', () => {
      expect(hpSystem.getHPColor(100)).toBe('#00FF66');
      expect(hpSystem.getHPColor(80)).toBe('#00FF66');
    });
  });

  describe('getHPRules', () => {
    it('should return HP_RULES configuration', () => {
      const rules = hpSystem.getHPRules();

      expect(rules).toEqual(HP_RULES);
      expect(rules.base_hp).toBe(100);
      expect(rules.daily_inactivity_penalty).toBe(-15);
      expect(rules.hp_floor).toBe(0);
      expect(rules.inactivity_threshold_hours).toBe(24);
    });
  });

  describe('getHPLog', () => {
    it('should return HP log entries', async () => {
      const mockLogs = [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          hpChange: -15,
          reason: 'daily_inactivity_penalty',
          newHP: 85,
          user_id: 1,
        },
        {
          id: 2,
          timestamp: new Date().toISOString(),
          hpChange: -15,
          reason: 'daily_inactivity_penalty',
          newHP: 70,
          user_id: 1,
        },
      ];

      (databaseManager.query as jest.Mock).mockResolvedValue(mockLogs);

      const logs = await hpSystem.getHPLog(50);

      expect(logs).toEqual(mockLogs);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM hp_log ORDER BY timestamp DESC LIMIT ?',
        [50]
      );
    });

    it('should return empty array if query fails', async () => {
      (databaseManager.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const logs = await hpSystem.getHPLog();

      expect(logs).toEqual([]);
    });
  });
});
