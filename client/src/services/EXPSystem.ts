/**
 * EXPSystem.ts
 * 
 * Core gamification engine managing experience points, level progression, and rank titles.
 * Integrates with DatabaseManager for persistence and uses EXP_RULES from GameRules.ts.
 * 
 * Requirements: 7.1, 7.2, 7.4, 9.1, 9.2, 9.3
 */

import { databaseManager } from './DatabaseManager';
import { EXP_RULES, type EXPRuleKey } from '../config/GameRules';
import { animationController } from './AnimationController';

/**
 * Rank thresholds mapping levels to rank titles
 * Requirement 9.2: Eight-tier rank progression system
 */
const RANK_THRESHOLDS = [
  { minLevel: 0, maxLevel: 4, title: 'Script Novice' },
  { minLevel: 5, maxLevel: 9, title: 'Function Apprentice' },
  { minLevel: 10, maxLevel: 19, title: 'Component Engineer' },
  { minLevel: 20, maxLevel: 34, title: 'Stack Architect' },
  { minLevel: 35, maxLevel: 49, title: 'Systems Operator' },
  { minLevel: 50, maxLevel: 74, title: 'AI Engineer Candidate' },
  { minLevel: 75, maxLevel: 99, title: 'Principal Builder' },
  { minLevel: 100, maxLevel: Infinity, title: 'Zenith Engineer' },
] as const;

export type RankTitle = typeof RANK_THRESHOLDS[number]['title'];

interface UserProfile {
  id: number;
  totalEXP: number;
  dailyEXP: number;
  level: number;
  rank: string;
  currentHP: number;
  lastResetDate: string;
  lastActivityTimestamp: number;
  updatedAt: string;
}

type EXPChangeListener = (data: {
  totalEXP: number;
  dailyEXP: number;
  level: number;
  rank: string;
  leveledUp: boolean;
  rankChanged: boolean;
}) => void;

class EXPSystemImpl {
  private listeners: Set<EXPChangeListener> = new Set();

  /**
   * Register a listener for EXP changes
   */
  addListener(listener: EXPChangeListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of EXP changes
   */
  private notifyListeners(data: {
    totalEXP: number;
    dailyEXP: number;
    level: number;
    rank: string;
    leveledUp: boolean;
    rankChanged: boolean;
  }): void {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in EXP change listener:', error);
      }
    });
  }

  /**
   * Award EXP to the user and persist changes
   * Requirement 7.1: Award EXP with storage persistence
   * Requirement 7.4: Persist changes to user_profile table within 100ms
   */
  async awardEXP(amount: number, source: EXPRuleKey): Promise<{
    totalEXP: number;
    dailyEXP: number;
    level: number;
    rank: string;
    leveledUp: boolean;
    rankChanged: boolean;
  }> {
    const startTime = Date.now();

    try {
      // Initialize database if needed
      await databaseManager.init();

      // Get current user profile
      const profiles = await databaseManager.query<UserProfile>(
        'SELECT * FROM user_profile WHERE id = 1'
      );

      if (profiles.length === 0) {
        throw new Error('User profile not found');
      }

      const profile = profiles[0];
      const oldLevel = profile.level;
      const oldRank = profile.rank;

      // Calculate new totals
      const newTotalEXP = Math.max(0, profile.totalEXP + amount);
      const newDailyEXP = Math.max(0, profile.dailyEXP + amount);

      // Calculate new level and rank
      const newLevel = this.calculateLevel(newTotalEXP);
      const newRank = this.calculateRank(newLevel);

      // Update user profile
      const now = new Date().toISOString();
      const timestamp = Date.now();

      await databaseManager.update(
        'user_profile',
        {
          totalEXP: newTotalEXP,
          dailyEXP: newDailyEXP,
          level: newLevel,
          rank: newRank,
          lastActivityTimestamp: timestamp,
          updatedAt: now,
        },
        'id = 1'
      );

      // Update contribution grid for today
      const today = new Date().toISOString().split('T')[0];
      await this.updateContributionGrid(today, newDailyEXP);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Log performance warning if exceeds 100ms requirement
      if (duration > 100) {
        console.warn(`EXP persistence took ${duration}ms (exceeds 100ms requirement)`);
      }

      // Trigger rank-up animation if rank changed
      // Requirement 10.4: Play rank-up animation when rank increases
      if (newRank !== oldRank) {
        animationController.playRankUpAnimation(newRank);
      }

      const result = {
        totalEXP: newTotalEXP,
        dailyEXP: newDailyEXP,
        level: newLevel,
        rank: newRank,
        leveledUp: newLevel > oldLevel,
        rankChanged: newRank !== oldRank,
      };

      // Notify all listeners of the EXP change
      this.notifyListeners(result);

      return result;
    } catch (error) {
      console.error('Failed to award EXP:', error);
      throw new Error('Failed to award EXP');
    }
  }

  /**
   * Calculate level from total EXP
   * Requirement 9.1: Level calculation using formula floor(totalEXP / 100)
   */
  calculateLevel(totalEXP: number): number {
    return Math.floor(totalEXP / 100);
  }

  /**
   * Calculate rank from level
   * Requirement 9.2: Eight-tier rank mapping
   */
  calculateRank(level: number): RankTitle {
    for (const threshold of RANK_THRESHOLDS) {
      if (level >= threshold.minLevel && level <= threshold.maxLevel) {
        return threshold.title;
      }
    }
    // Fallback to highest rank if level exceeds all thresholds
    return 'Zenith Engineer';
  }

  /**
   * Update contribution grid for the given date
   * Requirement 9.3: Update contribution_grid when EXP is awarded
   */
  private async updateContributionGrid(date: string, dailyEXP: number): Promise<void> {
    try {
      // Check if entry exists for today
      const existing = await databaseManager.query<{ id: number; questsCompleted: number }>(
        'SELECT id, questsCompleted FROM contribution_grid WHERE date = ?',
        [date]
      );

      if (existing.length > 0) {
        // Update existing entry
        await databaseManager.update(
          'contribution_grid',
          {
            expEarned: dailyEXP,
            hasActivity: dailyEXP > 0 ? 1 : 0,
          },
          'date = ?',
          [date]
        );
      } else {
        // Create new entry
        await databaseManager.insert('contribution_grid', {
          date,
          expEarned: dailyEXP,
          questsCompleted: 0,
          hasActivity: dailyEXP > 0 ? 1 : 0,
        });
      }
    } catch (error) {
      console.error('Failed to update contribution grid:', error);
      // Don't throw - contribution grid update is non-critical
    }
  }

  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<{
    totalEXP: number;
    dailyEXP: number;
    level: number;
    rank: string;
    currentHP: number;
  } | null> {
    try {
      await databaseManager.init();

      const profiles = await databaseManager.query<UserProfile>(
        'SELECT * FROM user_profile WHERE id = 1'
      );

      if (profiles.length === 0) {
        return null;
      }

      const profile = profiles[0];
      return {
        totalEXP: profile.totalEXP,
        dailyEXP: profile.dailyEXP,
        level: profile.level,
        rank: profile.rank,
        currentHP: profile.currentHP,
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Reset daily EXP counter (called at midnight)
   */
  async resetDailyEXP(): Promise<void> {
    try {
      await databaseManager.init();

      const now = new Date().toISOString();

      await databaseManager.update(
        'user_profile',
        {
          dailyEXP: 0,
          lastResetDate: now,
          updatedAt: now,
        },
        'id = 1'
      );

      console.log('Daily EXP reset successfully');
    } catch (error) {
      console.error('Failed to reset daily EXP:', error);
      throw new Error('Failed to reset daily EXP');
    }
  }

  /**
   * Get EXP value for a specific source
   */
  getEXPValue(source: EXPRuleKey): number {
    return EXP_RULES[source];
  }

  /**
   * Get all rank thresholds
   */
  getRankThresholds(): typeof RANK_THRESHOLDS {
    return RANK_THRESHOLDS;
  }

  /**
   * Calculate EXP needed for next level
   */
  getEXPForNextLevel(currentLevel: number): number {
    return (currentLevel + 1) * 100;
  }

  /**
   * Calculate progress to next level as percentage
   */
  getLevelProgress(totalEXP: number): number {
    const currentLevel = this.calculateLevel(totalEXP);
    const currentLevelEXP = currentLevel * 100;
    const nextLevelEXP = (currentLevel + 1) * 100;
    const progressEXP = totalEXP - currentLevelEXP;
    const requiredEXP = nextLevelEXP - currentLevelEXP;

    return (progressEXP / requiredEXP) * 100;
  }
}

// Singleton instance
export const expSystem = new EXPSystemImpl();
