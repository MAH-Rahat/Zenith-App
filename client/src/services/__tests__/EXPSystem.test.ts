/**
 * EXPSystem.test.ts
 * 
 * Unit tests for EXPSystem service
 * Tests EXP awarding, level calculation, rank mapping, and persistence
 */

import { expSystem } from '../EXPSystem';
import { databaseManager } from '../DatabaseManager';
import { EXP_RULES } from '../../config/GameRules';

describe('EXPSystem', () => {
  beforeAll(async () => {
    // Initialize database once for all tests
    await databaseManager.init();
  });

  beforeEach(async () => {
    // Reset user profile to default state using UPDATE (profile already exists from init)
    const now = new Date().toISOString();
    const timestamp = Date.now();
    
    await databaseManager.update(
      'user_profile',
      {
        totalEXP: 0,
        dailyEXP: 0,
        level: 0,
        rank: 'Script Novice',
        currentHP: 100,
        health_score: 100,
        lastResetDate: now,
        lastActivityTimestamp: timestamp,
        updatedAt: now,
      },
      'id = 1'
    );
    
    // Clear contribution grid
    await databaseManager.delete('contribution_grid', '1=1');
  });

  afterEach(async () => {
    // Clean up
    const db = (databaseManager as any).db;
    await db.runAsync('DELETE FROM contribution_grid');
  });

  describe('calculateLevel', () => {
    it('should calculate level 0 for 0-99 EXP', () => {
      expect(expSystem.calculateLevel(0)).toBe(0);
      expect(expSystem.calculateLevel(50)).toBe(0);
      expect(expSystem.calculateLevel(99)).toBe(0);
    });

    it('should calculate level 1 for 100-199 EXP', () => {
      expect(expSystem.calculateLevel(100)).toBe(1);
      expect(expSystem.calculateLevel(150)).toBe(1);
      expect(expSystem.calculateLevel(199)).toBe(1);
    });

    it('should calculate level 10 for 1000-1099 EXP', () => {
      expect(expSystem.calculateLevel(1000)).toBe(10);
      expect(expSystem.calculateLevel(1050)).toBe(10);
      expect(expSystem.calculateLevel(1099)).toBe(10);
    });

    it('should calculate level 100 for 10000+ EXP', () => {
      expect(expSystem.calculateLevel(10000)).toBe(100);
      expect(expSystem.calculateLevel(15000)).toBe(150);
    });
  });

  describe('calculateRank', () => {
    it('should return Script Novice for levels 0-4', () => {
      expect(expSystem.calculateRank(0)).toBe('Script Novice');
      expect(expSystem.calculateRank(2)).toBe('Script Novice');
      expect(expSystem.calculateRank(4)).toBe('Script Novice');
    });

    it('should return Function Apprentice for levels 5-9', () => {
      expect(expSystem.calculateRank(5)).toBe('Function Apprentice');
      expect(expSystem.calculateRank(7)).toBe('Function Apprentice');
      expect(expSystem.calculateRank(9)).toBe('Function Apprentice');
    });

    it('should return Component Engineer for levels 10-19', () => {
      expect(expSystem.calculateRank(10)).toBe('Component Engineer');
      expect(expSystem.calculateRank(15)).toBe('Component Engineer');
      expect(expSystem.calculateRank(19)).toBe('Component Engineer');
    });

    it('should return Stack Architect for levels 20-34', () => {
      expect(expSystem.calculateRank(20)).toBe('Stack Architect');
      expect(expSystem.calculateRank(27)).toBe('Stack Architect');
      expect(expSystem.calculateRank(34)).toBe('Stack Architect');
    });

    it('should return Systems Operator for levels 35-49', () => {
      expect(expSystem.calculateRank(35)).toBe('Systems Operator');
      expect(expSystem.calculateRank(42)).toBe('Systems Operator');
      expect(expSystem.calculateRank(49)).toBe('Systems Operator');
    });

    it('should return AI Engineer Candidate for levels 50-74', () => {
      expect(expSystem.calculateRank(50)).toBe('AI Engineer Candidate');
      expect(expSystem.calculateRank(62)).toBe('AI Engineer Candidate');
      expect(expSystem.calculateRank(74)).toBe('AI Engineer Candidate');
    });

    it('should return Principal Builder for levels 75-99', () => {
      expect(expSystem.calculateRank(75)).toBe('Principal Builder');
      expect(expSystem.calculateRank(87)).toBe('Principal Builder');
      expect(expSystem.calculateRank(99)).toBe('Principal Builder');
    });

    it('should return Zenith Engineer for levels 100+', () => {
      expect(expSystem.calculateRank(100)).toBe('Zenith Engineer');
      expect(expSystem.calculateRank(150)).toBe('Zenith Engineer');
      expect(expSystem.calculateRank(1000)).toBe('Zenith Engineer');
    });
  });

  describe('awardEXP', () => {
    it('should award EXP for academic task', async () => {
      const result = await expSystem.awardEXP(EXP_RULES.academic_task, 'academic_task');

      expect(result.totalEXP).toBe(10);
      expect(result.dailyEXP).toBe(10);
      expect(result.level).toBe(0);
      expect(result.rank).toBe('Script Novice');
      expect(result.leveledUp).toBe(false);
      expect(result.rankChanged).toBe(false);
    });

    it('should award EXP for coding quest', async () => {
      const result = await expSystem.awardEXP(EXP_RULES.coding_quest, 'coding_quest');

      expect(result.totalEXP).toBe(20);
      expect(result.dailyEXP).toBe(20);
      expect(result.level).toBe(0);
      expect(result.rank).toBe('Script Novice');
    });

    it('should award EXP for project deployed', async () => {
      const result = await expSystem.awardEXP(EXP_RULES.project_deployed, 'project_deployed');

      expect(result.totalEXP).toBe(100);
      expect(result.dailyEXP).toBe(100);
      expect(result.level).toBe(1);
      expect(result.rank).toBe('Script Novice');
      expect(result.leveledUp).toBe(true);
    });

    it('should detect level up', async () => {
      // Award 90 EXP (level 0)
      await expSystem.awardEXP(90, 'project_deployed');
      
      // Award 20 more EXP (should level up to 1)
      const result = await expSystem.awardEXP(20, 'coding_quest');

      expect(result.totalEXP).toBe(110);
      expect(result.level).toBe(1);
      expect(result.leveledUp).toBe(true);
    });

    it('should detect rank change', async () => {
      // Award 500 EXP (level 5, Function Apprentice)
      const result = await expSystem.awardEXP(500, 'project_deployed');

      expect(result.totalEXP).toBe(500);
      expect(result.level).toBe(5);
      expect(result.rank).toBe('Function Apprentice');
      expect(result.rankChanged).toBe(true);
    });

    it('should accumulate EXP across multiple awards', async () => {
      await expSystem.awardEXP(10, 'academic_task');
      await expSystem.awardEXP(20, 'coding_quest');
      const result = await expSystem.awardEXP(30, 'academic_task');

      expect(result.totalEXP).toBe(60);
      expect(result.dailyEXP).toBe(60);
    });

    it('should handle negative EXP (pomodoro failure)', async () => {
      // Award some EXP first
      await expSystem.awardEXP(50, 'project_deployed');
      
      // Apply penalty
      const result = await expSystem.awardEXP(EXP_RULES.pomodoro_failure, 'pomodoro_failure');

      expect(result.totalEXP).toBe(45);
      expect(result.dailyEXP).toBe(45);
    });

    it('should not allow negative total EXP', async () => {
      // Try to apply penalty with no EXP
      const result = await expSystem.awardEXP(-10, 'pomodoro_failure');

      expect(result.totalEXP).toBe(0);
      expect(result.dailyEXP).toBe(0);
    });

    it('should persist changes to database', async () => {
      await expSystem.awardEXP(100, 'project_deployed');

      const profile = await expSystem.getUserProfile();
      expect(profile).not.toBeNull();
      expect(profile!.totalEXP).toBe(100);
      expect(profile!.dailyEXP).toBe(100);
      expect(profile!.level).toBe(1);
    });

    it('should update contribution grid', async () => {
      await expSystem.awardEXP(50, 'project_deployed');

      const today = new Date().toISOString().split('T')[0];
      const gridData = await databaseManager.query(
        'SELECT * FROM contribution_grid WHERE date = ?',
        [today]
      );

      expect(gridData.length).toBe(1);
      expect(gridData[0].expEarned).toBe(50);
      expect(gridData[0].hasActivity).toBe(1);
    });

    it('should complete within 100ms requirement', async () => {
      const startTime = Date.now();
      await expSystem.awardEXP(20, 'coding_quest');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('getUserProfile', () => {
    it('should return current user profile', async () => {
      await expSystem.awardEXP(250, 'project_deployed');

      const profile = await expSystem.getUserProfile();

      expect(profile).not.toBeNull();
      expect(profile!.totalEXP).toBe(250);
      expect(profile!.level).toBe(2);
      expect(profile!.rank).toBe('Script Novice');
    });

    it('should return null if profile does not exist', async () => {
      await databaseManager.delete('user_profile', 'id = 1');

      const profile = await expSystem.getUserProfile();

      expect(profile).toBeNull();
    });
  });

  describe('resetDailyEXP', () => {
    it('should reset daily EXP to 0', async () => {
      await expSystem.awardEXP(50, 'project_deployed');
      await expSystem.resetDailyEXP();

      const profile = await expSystem.getUserProfile();

      expect(profile!.totalEXP).toBe(50);
      expect(profile!.dailyEXP).toBe(0);
    });

    it('should not affect total EXP', async () => {
      await expSystem.awardEXP(100, 'project_deployed');
      await expSystem.resetDailyEXP();

      const profile = await expSystem.getUserProfile();

      expect(profile!.totalEXP).toBe(100);
      expect(profile!.level).toBe(1);
    });
  });

  describe('getEXPValue', () => {
    it('should return correct EXP values from rules', () => {
      expect(expSystem.getEXPValue('academic_task')).toBe(10);
      expect(expSystem.getEXPValue('coding_quest')).toBe(20);
      expect(expSystem.getEXPValue('project_deployed')).toBe(100);
      expect(expSystem.getEXPValue('pomodoro_success')).toBe(20);
      expect(expSystem.getEXPValue('pomodoro_failure')).toBe(-5);
    });
  });

  describe('getEXPForNextLevel', () => {
    it('should calculate EXP needed for next level', () => {
      expect(expSystem.getEXPForNextLevel(0)).toBe(100);
      expect(expSystem.getEXPForNextLevel(1)).toBe(200);
      expect(expSystem.getEXPForNextLevel(5)).toBe(600);
      expect(expSystem.getEXPForNextLevel(10)).toBe(1100);
    });
  });

  describe('getLevelProgress', () => {
    it('should calculate progress to next level', () => {
      expect(expSystem.getLevelProgress(0)).toBe(0);
      expect(expSystem.getLevelProgress(50)).toBe(50);
      expect(expSystem.getLevelProgress(100)).toBe(0);
      expect(expSystem.getLevelProgress(150)).toBe(50);
      expect(expSystem.getLevelProgress(199)).toBe(99);
    });
  });

  describe('getRankThresholds', () => {
    it('should return all rank thresholds', () => {
      const thresholds = expSystem.getRankThresholds();

      expect(thresholds).toHaveLength(8);
      expect(thresholds[0].title).toBe('Script Novice');
      expect(thresholds[7].title).toBe('Zenith Engineer');
    });
  });
});
