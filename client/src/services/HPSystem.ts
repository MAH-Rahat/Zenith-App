/**
 * HPSystem.ts
 * 
 * Health point management system with daily inactivity penalties and Critical State mechanics.
 * Tracks user activity and applies penalties for unproductive days.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.6
 */

import { databaseManager } from './DatabaseManager';
import { HP_RULES } from '../config/GameRules';

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

interface HPLogEntry {
  id?: number;
  timestamp: string;
  hpChange: number;
  reason: string;
  newHP: number;
  user_id: number;
}

class HPSystemImpl {
  /**
   * Initialize user HP at 100 on first launch
   * Requirement 8.2: Initialize user HP at 100 on first launch
   */
  async initializeHP(): Promise<void> {
    try {
      await databaseManager.init();

      const profiles = await databaseManager.query<UserProfile>(
        'SELECT * FROM user_profile WHERE id = 1'
      );

      if (profiles.length === 0) {
        // User profile doesn't exist, will be created by DatabaseManager
        console.log('User profile will be initialized by DatabaseManager');
        return;
      }

      const profile = profiles[0];

      // Check if HP needs initialization (should already be 100 from default)
      if (profile.currentHP === HP_RULES.base_hp) {
        console.log('HP already initialized at base value');
        return;
      }

      // If HP is not at base value, log current state
      console.log(`Current HP: ${profile.currentHP}`);
    } catch (error) {
      console.error('Failed to initialize HP:', error);
      throw new Error('Failed to initialize HP');
    }
  }

  /**
   * Check for inactivity and apply penalty if needed
   * Requirement 8.3: Detect 24 hours with 0 EXP and deduct 15 HP
   */
  async checkInactivity(): Promise<{
    penaltyApplied: boolean;
    currentHP: number;
    hoursInactive: number;
  }> {
    try {
      await databaseManager.init();

      const profiles = await databaseManager.query<UserProfile>(
        'SELECT * FROM user_profile WHERE id = 1'
      );

      if (profiles.length === 0) {
        throw new Error('User profile not found');
      }

      const profile = profiles[0];
      const now = Date.now();
      const lastActivity = profile.lastActivityTimestamp;
      const hoursInactive = (now - lastActivity) / (1000 * 60 * 60);

      // Check if inactivity threshold exceeded
      if (hoursInactive >= HP_RULES.inactivity_threshold_hours) {
        // Check if any EXP was earned in the last 24 hours
        const dailyEXP = profile.dailyEXP;

        if (dailyEXP === 0) {
          // Apply penalty
          await this.applyPenalty();
          
          // Get updated HP
          const updatedProfiles = await databaseManager.query<UserProfile>(
            'SELECT currentHP FROM user_profile WHERE id = 1'
          );

          return {
            penaltyApplied: true,
            currentHP: updatedProfiles[0].currentHP,
            hoursInactive,
          };
        }
      }

      return {
        penaltyApplied: false,
        currentHP: profile.currentHP,
        hoursInactive,
      };
    } catch (error) {
      console.error('Failed to check inactivity:', error);
      throw new Error('Failed to check inactivity');
    }
  }

  /**
   * Apply inactivity penalty
   * Requirement 8.3: Deduct 15 HP after 24 hours with 0 EXP
   * Requirement 8.5: HP shall not reduce below 0
   */
  async applyPenalty(): Promise<{
    newHP: number;
    penaltyAmount: number;
    criticalStateTriggered: boolean;
  }> {
    try {
      await databaseManager.init();

      const profiles = await databaseManager.query<UserProfile>(
        'SELECT * FROM user_profile WHERE id = 1'
      );

      if (profiles.length === 0) {
        throw new Error('User profile not found');
      }

      const profile = profiles[0];
      const currentHP = profile.currentHP;
      const penaltyAmount = HP_RULES.daily_inactivity_penalty;

      // Calculate new HP, ensuring it doesn't go below hp_floor (0)
      const newHP = Math.max(HP_RULES.hp_floor, currentHP + penaltyAmount);

      // Update HP in database
      const now = new Date().toISOString();
      await databaseManager.update(
        'user_profile',
        {
          currentHP: newHP,
          updatedAt: now,
        },
        'id = 1'
      );

      // Log HP change
      await this.logHPChange(penaltyAmount, 'daily_inactivity_penalty', newHP);

      // Check if Critical State triggered
      const criticalStateTriggered = newHP === HP_RULES.hp_floor;

      if (criticalStateTriggered) {
        console.log('Critical State triggered - HP reached 0');
        // Trigger Critical State mechanics
        await this.triggerCriticalState();
      }

      return {
        newHP,
        penaltyAmount,
        criticalStateTriggered,
      };
    } catch (error) {
      console.error('Failed to apply penalty:', error);
      throw new Error('Failed to apply penalty');
    }
  }

  /**
   * Log HP change to hp_log table
   * Requirement 8.6: Log all HP changes to hp_log table with timestamp
   */
  async logHPChange(
    hpChange: number,
    reason: string,
    newHP: number
  ): Promise<void> {
    try {
      await databaseManager.init();

      const now = new Date().toISOString();

      const logEntry: HPLogEntry = {
        timestamp: now,
        hpChange,
        reason,
        newHP,
        user_id: 1,
      };

      await databaseManager.insert('hp_log', logEntry);

      console.log(`HP change logged: ${hpChange} HP (${reason}) -> ${newHP} HP`);
    } catch (error) {
      console.error('Failed to log HP change:', error);
      // Don't throw - logging is non-critical
    }
  }

  /**
   * Get current HP
   */
  async getCurrentHP(): Promise<number> {
    try {
      await databaseManager.init();

      const profiles = await databaseManager.query<UserProfile>(
        'SELECT currentHP FROM user_profile WHERE id = 1'
      );

      if (profiles.length === 0) {
        throw new Error('User profile not found');
      }

      return profiles[0].currentHP;
    } catch (error) {
      console.error('Failed to get current HP:', error);
      throw new Error('Failed to get current HP');
    }
  }

  /**
   * Get HP log history
   */
  async getHPLog(limit: number = 50): Promise<HPLogEntry[]> {
    try {
      await databaseManager.init();

      const logs = await databaseManager.query<HPLogEntry>(
        'SELECT * FROM hp_log ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );

      return logs;
    } catch (error) {
      console.error('Failed to get HP log:', error);
      return [];
    }
  }

  /**
   * Trigger Critical State when HP reaches 0
   * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
   */
  async triggerCriticalState(): Promise<void> {
    try {
      await databaseManager.init();

      const now = new Date().toISOString();

      // Reset rank to Script Novice and level to 0
      // Requirement 11.5: Reset rank to Script Novice
      await databaseManager.update(
        'user_profile',
        {
          rank: 'Script Novice',
          level: 0,
          totalEXP: 0,
          updatedAt: now,
        },
        'id = 1'
      );

      // Set all contribution grid cells to shattered state
      // Requirement 11.4: Render all contribution grid cells in void color
      await databaseManager.query(
        'UPDATE contribution_grid SET is_shattered = 1'
      );

      // Log Critical State event
      // Requirement 11.7: Log Critical State event to hp_log table
      await this.logHPChange(0, 'critical_state_triggered', 0);

      console.log('Critical State triggered - rank reset, grid shattered');
    } catch (error) {
      console.error('Failed to trigger Critical State:', error);
      throw new Error('Failed to trigger Critical State');
    }
  }

  /**
   * Reset HP to base value (used after Critical State acknowledgment)
   * Requirement 11.6: Reset HP to 100
   */
  async resetHP(): Promise<void> {
    try {
      await databaseManager.init();

      const now = new Date().toISOString();

      await databaseManager.update(
        'user_profile',
        {
          currentHP: HP_RULES.base_hp,
          updatedAt: now,
        },
        'id = 1'
      );

      // Clear shattered state from contribution grid
      await databaseManager.query(
        'UPDATE contribution_grid SET is_shattered = 0'
      );

      // Log HP reset
      await this.logHPChange(HP_RULES.base_hp, 'critical_state_reset', HP_RULES.base_hp);

      console.log('HP reset to base value');
    } catch (error) {
      console.error('Failed to reset HP:', error);
      throw new Error('Failed to reset HP');
    }
  }

  /**
   * Manually adjust HP (for testing or special events)
   */
  async adjustHP(amount: number, reason: string): Promise<number> {
    try {
      await databaseManager.init();

      const profiles = await databaseManager.query<UserProfile>(
        'SELECT currentHP FROM user_profile WHERE id = 1'
      );

      if (profiles.length === 0) {
        throw new Error('User profile not found');
      }

      const currentHP = profiles[0].currentHP;
      const newHP = Math.max(HP_RULES.hp_floor, Math.min(HP_RULES.base_hp, currentHP + amount));

      const now = new Date().toISOString();

      await databaseManager.update(
        'user_profile',
        {
          currentHP: newHP,
          updatedAt: now,
        },
        'id = 1'
      );

      // Log HP change
      await this.logHPChange(amount, reason, newHP);

      return newHP;
    } catch (error) {
      console.error('Failed to adjust HP:', error);
      throw new Error('Failed to adjust HP');
    }
  }

  /**
   * Get HP rules configuration
   */
  getHPRules(): typeof HP_RULES {
    return HP_RULES;
  }

  /**
   * Calculate HP percentage
   */
  getHPPercentage(currentHP: number): number {
    return (currentHP / HP_RULES.base_hp) * 100;
  }

  /**
   * Get HP color based on current value
   */
  getHPColor(currentHP: number): string {
    const percentage = this.getHPPercentage(currentHP);

    if (percentage === 0) {
      return '#FF2A42'; // alert color - Critical State
    } else if (percentage <= 25) {
      return '#FF2A42'; // alert color - critical
    } else if (percentage <= 50) {
      return '#FFB800'; // caution color - warning
    } else if (percentage <= 75) {
      return '#00E5FF'; // active color - moderate
    } else {
      return '#00FF66'; // growth color - healthy
    }
  }
}

// Singleton instance
export const hpSystem = new HPSystemImpl();
