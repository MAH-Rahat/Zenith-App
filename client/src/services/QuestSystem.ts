import { databaseManager } from './DatabaseManager';
import { expSystem } from './EXPSystem';
import { MicroStep } from './AIEngine';

export interface Quest {
  id: string;
  description: string;
  energyLevel: 'high' | 'medium' | 'low';
  expValue: number;
  isComplete: boolean;
  type: 'main' | 'side';
  createdAt: string;
  completedAt?: string;
  parentQuestId?: string;
  isMicroStep: boolean;
  microSteps?: MicroStep[];
}

class QuestSystemImpl {
  /**
   * Create a new quest
   */
  async createQuest(
    description: string,
    energyLevel: 'high' | 'medium' | 'low',
    expValue: number,
    type: 'main' | 'side' = 'side',
    parentQuestId?: string,
    isMicroStep: boolean = false
  ): Promise<string> {
    try {
      const id = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const questData: any = {
        id,
        description,
        energyLevel,
        expValue,
        isComplete: 0,
        type,
        createdAt: new Date().toISOString()
      };

      // Only add parent_quest_id if it exists
      if (parentQuestId) {
        questData.parent_quest_id = parentQuestId;
      }
      
      await databaseManager.insert('quests', questData);

      console.log(`Quest created: ${id}`);
      return id;
    } catch (error) {
      console.error('Failed to create quest:', error);
      throw new Error('Failed to create quest');
    }
  }

  /**
   * Complete a quest and award EXP
   */
  async completeQuest(questId: string): Promise<void> {
    try {
      // Get quest details
      const quests = await databaseManager.query<Quest>(
        'SELECT * FROM quests WHERE id = ?',
        [questId]
      );

      if (quests.length === 0) {
        throw new Error('Quest not found');
      }

      const quest = quests[0];

      if (quest.isComplete) {
        console.log('Quest already completed');
        return;
      }

      // Mark quest as complete
      await databaseManager.update(
        'quests',
        {
          isComplete: 1,
          completedAt: new Date().toISOString()
        },
        'id = ?',
        [questId]
      );

      // Award EXP
      await expSystem.awardEXP(quest.expValue, 'quest');

      console.log(`Quest completed: ${questId}, EXP awarded: ${quest.expValue}`);
    } catch (error) {
      console.error('Failed to complete quest:', error);
      throw new Error('Failed to complete quest');
    }
  }

  /**
   * Delete a quest
   */
  async deleteQuest(questId: string): Promise<void> {
    try {
      // Delete micro-steps if this is a parent quest
      await databaseManager.delete('quests', 'parent_quest_id = ?', [questId]);
      
      // Delete the quest itself
      await databaseManager.delete('quests', 'id = ?', [questId]);

      console.log(`Quest deleted: ${questId}`);
    } catch (error) {
      console.error('Failed to delete quest:', error);
      throw new Error('Failed to delete quest');
    }
  }

  /**
   * Get quests by energy level
   */
  async getQuestsByEnergyLevel(energyLevel: 'high' | 'medium' | 'low'): Promise<Quest[]> {
    try {
      const quests = await databaseManager.query<any>(
        'SELECT * FROM quests WHERE energyLevel = ? AND isComplete = 0 ORDER BY createdAt DESC',
        [energyLevel]
      );

      return this.mapQuests(quests);
    } catch (error) {
      console.error('Failed to get quests by energy level:', error);
      return [];
    }
  }

  /**
   * Get quests by type (main or side)
   */
  async getQuestsByType(type: 'main' | 'side'): Promise<Quest[]> {
    try {
      const quests = await databaseManager.query<any>(
        'SELECT * FROM quests WHERE type = ? AND isComplete = 0 ORDER BY createdAt DESC',
        [type]
      );

      return this.mapQuests(quests);
    } catch (error) {
      console.error('Failed to get quests by type:', error);
      return [];
    }
  }

  /**
   * Get all active (incomplete) quests
   */
  async getActiveQuests(): Promise<Quest[]> {
    try {
      const quests = await databaseManager.query<any>(
        'SELECT * FROM quests WHERE isComplete = 0 ORDER BY createdAt DESC'
      );

      return this.mapQuests(quests);
    } catch (error) {
      console.error('Failed to get active quests:', error);
      return [];
    }
  }

  /**
   * Get completed quests for a specific date
   */
  async getCompletedQuests(date: string): Promise<Quest[]> {
    try {
      const quests = await databaseManager.query<any>(
        `SELECT * FROM quests 
         WHERE isComplete = 1 
         AND DATE(completedAt) = DATE(?)
         ORDER BY completedAt DESC`,
        [date]
      );

      return this.mapQuests(quests);
    } catch (error) {
      console.error('Failed to get completed quests:', error);
      return [];
    }
  }

  /**
   * Attach micro-steps to a parent quest
   */
  async attachMicroSteps(parentQuestId: string, microSteps: MicroStep[]): Promise<void> {
    try {
      // Get parent quest to determine energy level and base EXP
      const parentQuests = await databaseManager.query<any>(
        'SELECT energyLevel, expValue, type FROM quests WHERE id = ?',
        [parentQuestId]
      );

      if (parentQuests.length === 0) {
        throw new Error('Parent quest not found');
      }

      const parentQuest = parentQuests[0];
      const microStepEXP = Math.floor(parentQuest.expValue / 3);

      // Create micro-step quests
      for (const microStep of microSteps) {
        await this.createQuest(
          microStep.description,
          parentQuest.energyLevel,
          microStepEXP,
          parentQuest.type,
          parentQuestId,
          true
        );
      }

      console.log(`Attached ${microSteps.length} micro-steps to quest ${parentQuestId}`);
    } catch (error) {
      console.error('Failed to attach micro-steps:', error);
      throw new Error('Failed to attach micro-steps');
    }
  }

  /**
   * Get micro-steps for a parent quest
   */
  async getMicroSteps(parentQuestId: string): Promise<Quest[]> {
    try {
      const quests = await databaseManager.query<any>(
        'SELECT * FROM quests WHERE parent_quest_id = ? ORDER BY created_at ASC',
        [parentQuestId]
      );

      return this.mapQuests(quests);
    } catch (error) {
      console.error('Failed to get micro-steps:', error);
      return [];
    }
  }

  /**
   * Generate main quests for daily academic tasks
   * Requirements: 4.1, 4.5, 4.6
   */
  async generateMainQuests(): Promise<Quest[]> {
    try {
      // Check if main quests already generated today
      const today = new Date().toISOString().split('T')[0];
      const existingQuests = await databaseManager.query<any>(
        `SELECT * FROM quests WHERE type = 'main' AND DATE(createdAt) = DATE(?) AND isComplete = 0`,
        [today]
      );

      if (existingQuests.length > 0) {
        console.log('Main quests already generated for today');
        return this.mapQuests(existingQuests);
      }

      // Generate default academic main quests
      const mainQuests = [
        { description: 'Complete CSE321 assignment', energyLevel: 'high' as const, expValue: 30 },
        { description: 'Review CSE341 lecture notes', energyLevel: 'medium' as const, expValue: 20 },
        { description: 'Practice CSE422 problems', energyLevel: 'high' as const, expValue: 30 },
      ];

      const createdQuests: Quest[] = [];
      for (const quest of mainQuests) {
        const id = await this.createQuest(
          quest.description,
          quest.energyLevel,
          quest.expValue,
          'main'
        );
        const created = await databaseManager.query<any>(
          'SELECT * FROM quests WHERE id = ?',
          [id]
        );
        if (created.length > 0) {
          createdQuests.push(this.mapQuests(created)[0]);
        }
      }

      console.log(`Generated ${createdQuests.length} main quests for today`);
      return createdQuests;
    } catch (error) {
      console.error('Failed to generate main quests:', error);
      return [];
    }
  }

  /**
   * Add a side quest (custom task)
   * Requirements: 5.3, 5.4, 5.5
   */
  async addSideQuest(description: string, energyLevel: 'high' | 'medium' | 'low', expValue: number = 20): Promise<string> {
    try {
      const id = await this.createQuest(description, energyLevel, expValue, 'side');
      console.log(`Side quest created: ${id}`);
      return id;
    } catch (error) {
      console.error('Failed to add side quest:', error);
      throw new Error('Failed to add side quest');
    }
  }

  /**
   * Validate quest description for Atomic Task Enforcer
   * Returns true if micro-steps are required
   */
  requiresMicroSteps(description: string): boolean {
    return description.length > 50;
  }

  /**
   * Validate micro-step descriptions
   * Returns true if all micro-steps meet minimum length requirement
   */
  validateMicroSteps(microSteps: string[]): boolean {
    if (microSteps.length !== 3) {
      return false;
    }

    return microSteps.every(step => step.trim().length >= 5);
  }

  /**
   * Map database rows to Quest objects
   */
  private mapQuests(rows: any[]): Quest[] {
    return rows.map(row => ({
      id: row.id,
      description: row.description,
      energyLevel: row.energyLevel,
      expValue: row.expValue,
      isComplete: row.isComplete === 1,
      type: row.type,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      parentQuestId: row.parent_quest_id,
      isMicroStep: !!row.parent_quest_id // A quest is a micro-step if it has a parent
    }));
  }
}

// Singleton instance
export const questSystem = new QuestSystemImpl();
