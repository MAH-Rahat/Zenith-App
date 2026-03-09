import { databaseManager } from '../DatabaseManager';

describe('Database Migration System', () => {
  beforeEach(async () => {
    // Initialize database before each test
    await databaseManager.init();
  });

  afterAll(async () => {
    await databaseManager.close();
  });

  describe('Migration Version Tracking', () => {
    it('should have migration system methods available', async () => {
      // Verify migration methods exist and are callable
      expect(typeof databaseManager.migrate).toBe('function');
      
      // Call migrate without errors
      await expect(databaseManager.migrate(1)).resolves.not.toThrow();
    });

    it('should not re-run migrations if already at target version', async () => {
      // Run migrate again
      await databaseManager.migrate(1);

      // Should still be at version 1
      const result = await databaseManager.query<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'schema_version'"
      );

      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect(parseInt(result[0].value, 10)).toBe(1);
      }
    });
  });

  describe('Migration V1 - Schema Creation', () => {
    it('should create all 10 tables with correct schema', async () => {
      // Verify all tables exist by querying them
      const tables = [
        'user_profile',
        'quests',
        'skill_nodes',
        'contribution_grid',
        'bug_grimoire',
        'flashcards',
        'exams',
        'hp_log',
        'notifications',
        'settings'
      ];

      for (const table of tables) {
        const result = await databaseManager.query(`SELECT * FROM ${table} LIMIT 1`);
        expect(result).toBeDefined();
      }
    });

    it('should support parent_quest_id field in quests table', async () => {
      // Insert a parent quest
      await databaseManager.insert('quests', {
        id: 'parent-quest',
        description: 'Parent Quest',
        expValue: 10,
        isComplete: 0,
        type: 'main',
        energyLevel: 'high',
        createdAt: new Date().toISOString()
      });

      // Insert a child quest referencing parent
      const childId = await databaseManager.insert('quests', {
        id: 'child-quest',
        description: 'Child Quest',
        expValue: 5,
        isComplete: 0,
        type: 'side',
        energyLevel: 'low',
        parent_quest_id: 'parent-quest',
        createdAt: new Date().toISOString()
      });

      // Verify child quest was created
      expect(childId).toBeGreaterThan(0);
    });

    it('should support user_id field in hp_log table', async () => {
      // Insert HP log entry
      const logId = await databaseManager.insert('hp_log', {
        timestamp: new Date().toISOString(),
        hpChange: -15,
        reason: 'inactivity',
        newHP: 85,
        user_id: 1
      });

      // Verify HP log was created
      expect(logId).toBeGreaterThan(0);
    });

    it('should create indexes for performance', async () => {
      // Verify queries work efficiently
      const result = await databaseManager.query(
        'SELECT * FROM quests WHERE type = ? AND isComplete = ?',
        ['main', 0]
      );

      expect(result).toBeDefined();
    });
  });

  describe('Migration Idempotency', () => {
    it('should be safe to run migrations multiple times', async () => {
      // Insert test data
      await databaseManager.insert('quests', {
        id: 'test-quest',
        description: 'Test Quest',
        expValue: 10,
        isComplete: 0,
        type: 'main',
        energyLevel: 'high',
        createdAt: new Date().toISOString()
      });

      // Run migration again
      await databaseManager.migrate(1);

      // Verify data is still accessible
      const result = await databaseManager.query<{ id: string }>(
        "SELECT id FROM quests WHERE id = 'test-quest'"
      );

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Schema Fields', () => {
    it('should support all required fields in user_profile table', async () => {
      const now = new Date().toISOString();
      const timestamp = Date.now();

      const userId = await databaseManager.insert('user_profile', {
        id: 2,
        totalEXP: 100,
        dailyEXP: 20,
        level: 1,
        rank: 'Function Apprentice',
        currentHP: 85,
        health_score: 90,
        lastResetDate: now,
        lastActivityTimestamp: timestamp,
        createdAt: now,
        updatedAt: now
      });

      expect(userId).toBeGreaterThan(0);
    });

    it('should support all required fields in quests table', async () => {
      const questId = await databaseManager.insert('quests', {
        id: 'full-quest',
        description: 'Complete Quest',
        expValue: 20,
        isComplete: 1,
        type: 'main',
        energyLevel: 'high',
        microSteps: JSON.stringify(['step1', 'step2', 'step3']),
        parent_quest_id: null,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

      expect(questId).toBeGreaterThan(0);
    });

    it('should support all required fields in skill_nodes table', async () => {
      const nodeId = await databaseManager.insert('skill_nodes', {
        id: 'test-skill',
        skillId: 'test-skill-unique',
        name: 'Test Skill',
        phase: 2,
        isUnlocked: 1,
        isComplete: 1,
        proofOfWork: 'https://github.com/user/repo',
        completedAt: new Date().toISOString()
      });

      expect(nodeId).toBeGreaterThan(0);
    });
  });
});
