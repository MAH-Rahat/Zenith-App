/**
 * QuestSystem.test.ts
 * 
 * Unit tests for QuestSystem service
 * Tests quest creation, completion, energy categorization, and type filtering
 */

import { questSystem } from '../QuestSystem';
import { databaseManager } from '../DatabaseManager';

describe('QuestSystem', () => {
  beforeEach(async () => {
    await databaseManager.init();
    await databaseManager.clearAll();
    await databaseManager.init();
  });

  afterAll(async () => {
    await databaseManager.close();
  });

  describe('Quest Creation', () => {
    it('should create a quest with all required fields', async () => {
      const questId = await questSystem.createQuest(
        'Test quest',
        'medium',
        20,
        'side'
      );

      expect(questId).toBeDefined();
      expect(questId).toMatch(/^quest_/);

      const quests = await questSystem.getActiveQuests();
      expect(quests).toHaveLength(1);
      expect(quests[0].description).toBe('Test quest');
      expect(quests[0].energyLevel).toBe('medium');
      expect(quests[0].expValue).toBe(20);
      expect(quests[0].type).toBe('side');
    });

    it('should create quests with different energy levels', async () => {
      await questSystem.createQuest('High energy task', 'high', 30, 'main');
      await questSystem.createQuest('Medium energy task', 'medium', 20, 'side');
      await questSystem.createQuest('Low energy task', 'low', 10, 'side');

      const highQuests = await questSystem.getQuestsByEnergyLevel('high');
      const mediumQuests = await questSystem.getQuestsByEnergyLevel('medium');
      const lowQuests = await questSystem.getQuestsByEnergyLevel('low');

      expect(highQuests).toHaveLength(1);
      expect(mediumQuests).toHaveLength(1);
      expect(lowQuests).toHaveLength(1);
    });
  });

  describe('Quest Types', () => {
    it('should filter quests by type (main vs side)', async () => {
      await questSystem.createQuest('Main quest 1', 'high', 30, 'main');
      await questSystem.createQuest('Main quest 2', 'medium', 20, 'main');
      await questSystem.createQuest('Side quest 1', 'low', 10, 'side');

      const mainQuests = await questSystem.getQuestsByType('main');
      const sideQuests = await questSystem.getQuestsByType('side');

      expect(mainQuests).toHaveLength(2);
      expect(sideQuests).toHaveLength(1);
    });
  });

  describe('Generate Main Quests', () => {
    it('should generate default academic main quests', async () => {
      const quests = await questSystem.generateMainQuests();

      expect(quests.length).toBeGreaterThan(0);
      quests.forEach(quest => {
        expect(quest.type).toBe('main');
        expect(['high', 'medium', 'low']).toContain(quest.energyLevel);
      });
    });

    it('should not regenerate main quests if already created today', async () => {
      const firstCall = await questSystem.generateMainQuests();
      const secondCall = await questSystem.generateMainQuests();

      expect(firstCall.length).toBe(secondCall.length);
      expect(firstCall[0].id).toBe(secondCall[0].id);
    });
  });

  describe('Add Side Quest', () => {
    it('should add a side quest with specified energy level', async () => {
      const questId = await questSystem.addSideQuest('Custom task', 'high', 25);

      const quests = await questSystem.getQuestsByType('side');
      expect(quests).toHaveLength(1);
      expect(quests[0].description).toBe('Custom task');
      expect(quests[0].energyLevel).toBe('high');
      expect(quests[0].expValue).toBe(25);
    });

    it('should use default EXP value if not specified', async () => {
      const questId = await questSystem.addSideQuest('Default EXP task', 'medium');

      const quests = await questSystem.getQuestsByType('side');
      expect(quests[0].expValue).toBe(20);
    });
  });

  describe('Quest Completion', () => {
    it('should mark quest as complete', async () => {
      const questId = await questSystem.createQuest('Test quest', 'medium', 20, 'side');
      
      await questSystem.completeQuest(questId);

      const activeQuests = await questSystem.getActiveQuests();
      expect(activeQuests).toHaveLength(0);
    });

    it('should not fail when completing already completed quest', async () => {
      const questId = await questSystem.createQuest('Test quest', 'medium', 20, 'side');
      
      await questSystem.completeQuest(questId);
      await expect(questSystem.completeQuest(questId)).resolves.not.toThrow();
    });
  });

  describe('Quest Deletion', () => {
    it('should delete a quest', async () => {
      const questId = await questSystem.createQuest('Test quest', 'medium', 20, 'side');
      
      await questSystem.deleteQuest(questId);

      const quests = await questSystem.getActiveQuests();
      expect(quests).toHaveLength(0);
    });
  });

  describe('Micro-steps', () => {
    it('should validate micro-step requirements', () => {
      expect(questSystem.requiresMicroSteps('Short task')).toBe(false);
      expect(questSystem.requiresMicroSteps('This is a very long task description that exceeds fifty characters')).toBe(true);
    });

    it('should validate micro-step descriptions', () => {
      expect(questSystem.validateMicroSteps(['Step 1', 'Step 2', 'Step 3'])).toBe(true);
      expect(questSystem.validateMicroSteps(['Step 1', 'Step 2'])).toBe(false);
      expect(questSystem.validateMicroSteps(['Step 1', 'S2', 'Step 3'])).toBe(false);
    });

    it('should attach micro-steps to parent quest', async () => {
      const parentId = await questSystem.createQuest('Parent quest', 'high', 30, 'main');
      
      await questSystem.attachMicroSteps(parentId, [
        { description: 'Micro-step 1' },
        { description: 'Micro-step 2' },
        { description: 'Micro-step 3' },
      ]);

      const microSteps = await questSystem.getMicroSteps(parentId);
      expect(microSteps).toHaveLength(3);
      expect(microSteps[0].isMicroStep).toBe(true);
      expect(microSteps[0].parentQuestId).toBe(parentId);
    });
  });

  describe('Energy Level Filtering', () => {
    it('should return only quests with specified energy level', async () => {
      await questSystem.createQuest('High 1', 'high', 30, 'main');
      await questSystem.createQuest('High 2', 'high', 30, 'side');
      await questSystem.createQuest('Medium 1', 'medium', 20, 'side');
      await questSystem.createQuest('Low 1', 'low', 10, 'side');

      const highQuests = await questSystem.getQuestsByEnergyLevel('high');
      expect(highQuests).toHaveLength(2);
      expect(highQuests.every(q => q.energyLevel === 'high')).toBe(true);
    });
  });

  describe('Fog Mode Integration', () => {
    it('should attach micro-steps with correct EXP distribution', async () => {
      // Requirement 25.7: Create 3 separate quests from confirmed micro-steps
      const parentId = await questSystem.createQuest('Build a website', 'high', 60, 'side');
      
      const microSteps = [
        { step: 1, description: 'Design wireframes', estimatedMinutes: 20 },
        { step: 2, description: 'Set up React project', estimatedMinutes: 25 },
        { step: 3, description: 'Create homepage component', estimatedMinutes: 15 },
      ];

      await questSystem.attachMicroSteps(parentId, microSteps);

      const createdMicroSteps = await questSystem.getMicroSteps(parentId);
      
      // Verify 3 micro-steps were created
      expect(createdMicroSteps).toHaveLength(3);
      
      // Verify each micro-step has correct properties
      createdMicroSteps.forEach((step, index) => {
        expect(step.description).toBe(microSteps[index].description);
        expect(step.expValue).toBe(20); // 60 / 3 = 20 EXP per step
        expect(step.parentQuestId).toBe(parentId);
        expect(step.isMicroStep).toBe(true);
      });
    });

    it('should inherit energy level from parent quest', async () => {
      // Verify micro-steps inherit parent quest energy level
      const parentId = await questSystem.createQuest('Complex task', 'medium', 60, 'main');
      
      const microSteps = [
        { step: 1, description: 'First step', estimatedMinutes: 20 },
        { step: 2, description: 'Second step', estimatedMinutes: 25 },
        { step: 3, description: 'Third step', estimatedMinutes: 15 },
      ];

      await questSystem.attachMicroSteps(parentId, microSteps);

      const createdMicroSteps = await questSystem.getMicroSteps(parentId);
      
      // All micro-steps should have medium energy level
      createdMicroSteps.forEach(step => {
        expect(step.energyLevel).toBe('medium');
      });
    });

    it('should delete micro-steps when parent quest is deleted', async () => {
      // Verify cascade delete works
      const parentId = await questSystem.createQuest('Parent task', 'high', 60, 'side');
      
      const microSteps = [
        { step: 1, description: 'Step one', estimatedMinutes: 20 },
        { step: 2, description: 'Step two', estimatedMinutes: 25 },
        { step: 3, description: 'Step three', estimatedMinutes: 15 },
      ];

      await questSystem.attachMicroSteps(parentId, microSteps);
      
      // Verify micro-steps exist
      let createdMicroSteps = await questSystem.getMicroSteps(parentId);
      expect(createdMicroSteps).toHaveLength(3);

      // Delete parent quest
      await questSystem.deleteQuest(parentId);

      // Verify micro-steps are also deleted
      createdMicroSteps = await questSystem.getMicroSteps(parentId);
      expect(createdMicroSteps).toHaveLength(0);
    });
  });

  describe('Atomic Task Enforcer', () => {
    // Requirement 26.1: Test 50-character threshold
    it('should activate enforcer when task description exceeds 50 characters', () => {
      const shortTask = 'Short task';
      const longTask = 'This is a very long task description that definitely exceeds the fifty character limit';

      expect(questSystem.requiresMicroSteps(shortTask)).toBe(false);
      expect(questSystem.requiresMicroSteps(longTask)).toBe(true);
    });

    it('should not activate enforcer for exactly 50 characters', () => {
      const exactlyFifty = '12345678901234567890123456789012345678901234567890'; // 50 chars
      expect(exactlyFifty.length).toBe(50);
      expect(questSystem.requiresMicroSteps(exactlyFifty)).toBe(false);
    });

    it('should activate enforcer for 51 characters', () => {
      const fiftyOne = '123456789012345678901234567890123456789012345678901'; // 51 chars
      expect(fiftyOne.length).toBe(51);
      expect(questSystem.requiresMicroSteps(fiftyOne)).toBe(true);
    });

    // Requirement 26.2, 26.3: Test micro-step validation
    it('should require exactly 3 micro-steps', () => {
      const twoSteps = ['Step 1', 'Step 2'];
      const threeSteps = ['Step 1', 'Step 2', 'Step 3'];
      const fourSteps = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];

      expect(questSystem.validateMicroSteps(twoSteps)).toBe(false);
      expect(questSystem.validateMicroSteps(threeSteps)).toBe(true);
      expect(questSystem.validateMicroSteps(fourSteps)).toBe(false);
    });

    it('should validate each micro-step is minimum 5 characters', () => {
      const validSteps = ['Step 1', 'Step 2', 'Step 3'];
      const invalidSteps = ['Step 1', 'S2', 'Step 3']; // 'S2' is only 2 chars
      const allInvalid = ['S1', 'S2', 'S3'];

      expect(questSystem.validateMicroSteps(validSteps)).toBe(true);
      expect(questSystem.validateMicroSteps(invalidSteps)).toBe(false);
      expect(questSystem.validateMicroSteps(allInvalid)).toBe(false);
    });

    it('should validate micro-steps with exactly 5 characters', () => {
      const exactlyFive = ['12345', '67890', 'ABCDE'];
      expect(questSystem.validateMicroSteps(exactlyFive)).toBe(true);
    });

    it('should reject micro-steps with 4 characters', () => {
      const fourChars = ['1234', '5678', '90AB'];
      expect(questSystem.validateMicroSteps(fourChars)).toBe(false);
    });

    // Requirement 26.4, 26.5: Test quest creation prevention and 3 separate quests
    it('should create 3 separate quests from valid micro-steps', async () => {
      const microSteps = [
        'Setup project structure',
        'Install dependencies',
        'Create initial components',
      ];

      const questIds: string[] = [];
      for (const step of microSteps) {
        const questId = await questSystem.addSideQuest(step, 'medium', 20);
        questIds.push(questId);
      }

      expect(questIds).toHaveLength(3);
      
      const sideQuests = await questSystem.getQuestsByType('side');
      expect(sideQuests).toHaveLength(3);
      
      sideQuests.forEach((quest, index) => {
        expect(quest.description).toBe(microSteps[index]);
        expect(quest.type).toBe('side');
        expect(quest.energyLevel).toBe('medium');
        expect(quest.expValue).toBe(20);
      });
    });

    it('should prevent quest creation until 3 valid micro-steps are provided', () => {
      // This test validates the logic that would be used in the UI
      const invalidCases = [
        ['Step 1', 'Step 2'], // Only 2 steps
        ['Step 1', 'S2', 'Step 3'], // One step too short
        ['S1', 'S2', 'S3'], // All steps too short
        ['Step 1', 'Step 2', 'Step 3', 'Step 4'], // Too many steps
      ];

      invalidCases.forEach(steps => {
        expect(questSystem.validateMicroSteps(steps)).toBe(false);
      });

      const validCase = ['Step 1', 'Step 2', 'Step 3'];
      expect(questSystem.validateMicroSteps(validCase)).toBe(true);
    });
  });
});
