import { databaseManager } from './DatabaseManager';
import { expSystem } from './EXPSystem';

export interface SkillNode {
  id: string;
  name: string;
  phase: number;
  completionPercentage: number;
  proofOfWork?: string;
  isLocked: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface Phase {
  number: number;
  name: string;
  isLocked: boolean;
  completionPercentage: number;
  unlockCondition: string;
}

const PHASE_NAMES: Record<number, string> = {
  1: 'Full-Stack Mastery',
  2: 'DevSecOps Infrastructure',
  3: 'Security & Networking',
  4: 'AI & ML Engine'
};

const PHASE_UNLOCK_THRESHOLDS: Record<number, number> = {
  2: 80,  // Phase 2 unlocks when Phase 1 reaches 80%
  3: 50,  // Phase 3 unlocks when Phase 2 reaches 50%
  4: 100  // Phase 4 unlocks when Phase 3 reaches 100%
};

const NODE_EXP_VALUE = 20; // EXP awarded per completed node

class SkillTreeImpl {
  /**
   * Unlock a phase
   */
  async unlockPhase(phaseNumber: number): Promise<void> {
    try {
      await databaseManager.update(
        'skill_nodes',
        { is_locked: 0 },
        'phase = ?',
        [phaseNumber]
      );

      console.log(`Phase ${phaseNumber} unlocked`);
    } catch (error) {
      console.error('Failed to unlock phase:', error);
      throw new Error('Failed to unlock phase');
    }
  }

  /**
   * Get phase completion percentage
   */
  async getPhaseCompletion(phaseNumber: number): Promise<number> {
    try {
      const nodes = await databaseManager.query<any>(
        'SELECT completion_percentage FROM skill_nodes WHERE phase = ?',
        [phaseNumber]
      );

      if (nodes.length === 0) {
        return 0;
      }

      const totalCompletion = nodes.reduce((sum, node) => sum + node.completion_percentage, 0);
      return Math.floor(totalCompletion / nodes.length);
    } catch (error) {
      console.error('Failed to get phase completion:', error);
      return 0;
    }
  }

  /**
   * Check and apply phase unlock conditions
   */
  async checkPhaseUnlockConditions(): Promise<void> {
    try {
      // Check Phase 2 unlock (Phase 1 >= 80%)
      const phase1Completion = await this.getPhaseCompletion(1);
      if (phase1Completion >= PHASE_UNLOCK_THRESHOLDS[2]) {
        const phase2Nodes = await this.getNodesByPhase(2);
        if (phase2Nodes.some(node => node.isLocked)) {
          await this.unlockPhase(2);
        }
      }

      // Check Phase 3 unlock (Phase 2 >= 50%)
      const phase2Completion = await this.getPhaseCompletion(2);
      if (phase2Completion >= PHASE_UNLOCK_THRESHOLDS[3]) {
        const phase3Nodes = await this.getNodesByPhase(3);
        if (phase3Nodes.some(node => node.isLocked)) {
          await this.unlockPhase(3);
        }
      }

      // Check Phase 4 unlock (Phase 3 >= 100%)
      const phase3Completion = await this.getPhaseCompletion(3);
      if (phase3Completion >= PHASE_UNLOCK_THRESHOLDS[4]) {
        const phase4Nodes = await this.getNodesByPhase(4);
        if (phase4Nodes.some(node => node.isLocked)) {
          await this.unlockPhase(4);
        }
      }
    } catch (error) {
      console.error('Failed to check phase unlock conditions:', error);
    }
  }

  /**
   * Complete a skill node with proof of work
   */
  async completeNode(nodeId: string, proofOfWork: string): Promise<void> {
    try {
      if (!proofOfWork || proofOfWork.trim().length === 0) {
        throw new Error('Proof of work is required');
      }

      // Update node to 100% completion
      await databaseManager.update(
        'skill_nodes',
        {
          completion_percentage: 100,
          proof_of_work: proofOfWork,
          completed_at: new Date().toISOString()
        },
        'id = ?',
        [nodeId]
      );

      // Award EXP
      await expSystem.awardEXP(NODE_EXP_VALUE, 'skill_node');

      // Check if any phases should be unlocked
      await this.checkPhaseUnlockConditions();

      console.log(`Node completed: ${nodeId}`);
    } catch (error) {
      console.error('Failed to complete node:', error);
      throw new Error('Failed to complete node');
    }
  }

  /**
   * Update node progress percentage
   */
  async updateNodeProgress(nodeId: string, percentage: number): Promise<void> {
    try {
      if (percentage < 0 || percentage > 100) {
        throw new Error('Percentage must be between 0 and 100');
      }

      await databaseManager.update(
        'skill_nodes',
        { completion_percentage: percentage },
        'id = ?',
        [nodeId]
      );

      // Check if any phases should be unlocked
      await this.checkPhaseUnlockConditions();

      console.log(`Node progress updated: ${nodeId} -> ${percentage}%`);
    } catch (error) {
      console.error('Failed to update node progress:', error);
      throw new Error('Failed to update node progress');
    }
  }

  /**
   * Get all nodes for a specific phase
   */
  async getNodesByPhase(phaseNumber: number): Promise<SkillNode[]> {
    try {
      const nodes = await databaseManager.query<any>(
        'SELECT * FROM skill_nodes WHERE phase = ? ORDER BY created_at ASC',
        [phaseNumber]
      );

      return this.mapNodes(nodes);
    } catch (error) {
      console.error('Failed to get nodes by phase:', error);
      return [];
    }
  }

  /**
   * Get all skill nodes
   */
  async getAllNodes(): Promise<SkillNode[]> {
    try {
      const nodes = await databaseManager.query<any>(
        'SELECT * FROM skill_nodes ORDER BY phase ASC, created_at ASC'
      );

      return this.mapNodes(nodes);
    } catch (error) {
      console.error('Failed to get all nodes:', error);
      return [];
    }
  }

  /**
   * Get completed nodes within a date range
   */
  async getCompletedNodes(startDate: string, endDate: string): Promise<SkillNode[]> {
    try {
      const nodes = await databaseManager.query<any>(
        `SELECT * FROM skill_nodes 
         WHERE completion_percentage = 100 
         AND completed_at BETWEEN ? AND ?
         ORDER BY completed_at DESC`,
        [startDate, endDate]
      );

      return this.mapNodes(nodes);
    } catch (error) {
      console.error('Failed to get completed nodes:', error);
      return [];
    }
  }

  /**
   * Get all phases with their status
   */
  async getAllPhases(): Promise<Phase[]> {
    const phases: Phase[] = [];

    for (let i = 1; i <= 4; i++) {
      const nodes = await this.getNodesByPhase(i);
      const isLocked = nodes.length > 0 ? nodes[0].isLocked : true;
      const completion = await this.getPhaseCompletion(i);

      let unlockCondition = '';
      if (i === 1) {
        unlockCondition = 'Unlocked by default';
      } else if (i === 2) {
        unlockCondition = 'Unlock at Phase 1: 80%';
      } else if (i === 3) {
        unlockCondition = 'Unlock at Phase 2: 50%';
      } else if (i === 4) {
        unlockCondition = 'Unlock at Phase 3: 100%';
      }

      phases.push({
        number: i,
        name: PHASE_NAMES[i],
        isLocked,
        completionPercentage: completion,
        unlockCondition
      });
    }

    return phases;
  }

  /**
   * Get a single node by ID
   */
  async getNode(nodeId: string): Promise<SkillNode | null> {
    try {
      const nodes = await databaseManager.query<any>(
        'SELECT * FROM skill_nodes WHERE id = ?',
        [nodeId]
      );

      if (nodes.length === 0) {
        return null;
      }

      return this.mapNodes(nodes)[0];
    } catch (error) {
      console.error('Failed to get node:', error);
      return null;
    }
  }

  /**
   * Map database rows to SkillNode objects
   */
  private mapNodes(rows: any[]): SkillNode[] {
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      phase: row.phase,
      completionPercentage: row.completion_percentage,
      proofOfWork: row.proof_of_work,
      isLocked: row.is_locked === 1,
      completedAt: row.completed_at,
      createdAt: row.created_at
    }));
  }
}

// Singleton instance
export const skillTree = new SkillTreeImpl();
