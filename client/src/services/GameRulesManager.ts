/**
 * GameRulesManager.ts
 * 
 * Service for managing game rules with custom overrides from settings.
 * Allows runtime configuration of EXP_RULES for testing and balancing.
 * 
 * Requirements: 79.4
 */

import { EXP_RULES } from '../config/GameRules';
import { databaseManager } from './DatabaseManager';

export type EXPRuleKey = keyof typeof EXP_RULES;

interface CustomEXPRules {
  academic_task?: number;
  coding_quest?: number;
  project_deployed?: number;
  pomodoro_success?: number;
  pomodoro_failure?: number;
}

class GameRulesManagerImpl {
  private customRules: CustomEXPRules = {};
  private isLoaded = false;

  /**
   * Load custom EXP rules from settings table
   */
  async loadCustomRules(): Promise<void> {
    try {
      const rules = await databaseManager.query<{ key: string; value: string }>(
        "SELECT key, value FROM settings WHERE key LIKE 'exp_rule_%'"
      );

      this.customRules = {};
      
      for (const rule of rules) {
        const ruleKey = rule.key.replace('exp_rule_', '') as EXPRuleKey;
        const value = parseInt(rule.value, 10);
        
        if (!isNaN(value) && ruleKey in EXP_RULES) {
          this.customRules[ruleKey] = value;
        }
      }

      this.isLoaded = true;
      console.log('Custom EXP rules loaded:', this.customRules);
    } catch (error) {
      console.error('Failed to load custom EXP rules:', error);
      this.customRules = {};
      this.isLoaded = true;
    }
  }

  /**
   * Get EXP value for a specific rule, using custom value if set
   */
  getEXPValue(ruleKey: EXPRuleKey): number {
    if (!this.isLoaded) {
      console.warn('Custom rules not loaded yet, using default');
    }

    return this.customRules[ruleKey] ?? EXP_RULES[ruleKey];
  }

  /**
   * Get all EXP rules (merged defaults with custom overrides)
   */
  getAllRules(): Record<EXPRuleKey, number> {
    return {
      academic_task: this.getEXPValue('academic_task'),
      coding_quest: this.getEXPValue('coding_quest'),
      project_deployed: this.getEXPValue('project_deployed'),
      pomodoro_success: this.getEXPValue('pomodoro_success'),
      pomodoro_failure: this.getEXPValue('pomodoro_failure'),
    };
  }

  /**
   * Get default EXP rules (from config file)
   */
  getDefaultRules(): Record<EXPRuleKey, number> {
    return { ...EXP_RULES };
  }

  /**
   * Set custom EXP value for a specific rule
   */
  async setCustomRule(ruleKey: EXPRuleKey, value: number): Promise<void> {
    try {
      const settingKey = `exp_rule_${ruleKey}`;
      const valueStr = value.toString();

      // Check if setting exists
      const existing = await databaseManager.query<{ key: string }>(
        'SELECT key FROM settings WHERE key = ?',
        [settingKey]
      );

      if (existing.length > 0) {
        await databaseManager.update(
          'settings',
          { value: valueStr, updatedAt: new Date().toISOString() },
          'key = ?',
          [settingKey]
        );
      } else {
        await databaseManager.insert('settings', {
          key: settingKey,
          value: valueStr,
          updatedAt: new Date().toISOString(),
        });
      }

      // Update in-memory cache
      this.customRules[ruleKey] = value;
      console.log(`Custom EXP rule set: ${ruleKey} = ${value}`);
    } catch (error) {
      console.error('Failed to set custom EXP rule:', error);
      throw new Error('Failed to save custom rule');
    }
  }

  /**
   * Reset a specific rule to default value
   */
  async resetRule(ruleKey: EXPRuleKey): Promise<void> {
    try {
      const settingKey = `exp_rule_${ruleKey}`;
      
      await databaseManager.delete('settings', 'key = ?', [settingKey]);
      
      // Remove from in-memory cache
      delete this.customRules[ruleKey];
      console.log(`Custom EXP rule reset: ${ruleKey}`);
    } catch (error) {
      console.error('Failed to reset custom EXP rule:', error);
      throw new Error('Failed to reset rule');
    }
  }

  /**
   * Reset all rules to defaults
   */
  async resetAllRules(): Promise<void> {
    try {
      await databaseManager.delete('settings', "key LIKE 'exp_rule_%'");
      
      this.customRules = {};
      console.log('All custom EXP rules reset to defaults');
    } catch (error) {
      console.error('Failed to reset all custom EXP rules:', error);
      throw new Error('Failed to reset all rules');
    }
  }

  /**
   * Check if a rule has a custom override
   */
  hasCustomRule(ruleKey: EXPRuleKey): boolean {
    return ruleKey in this.customRules;
  }

  /**
   * Get human-readable label for a rule key
   */
  getRuleLabel(ruleKey: EXPRuleKey): string {
    const labels: Record<EXPRuleKey, string> = {
      academic_task: 'Academic Task',
      coding_quest: 'Coding Quest',
      project_deployed: 'Project Deployed',
      pomodoro_success: 'Pomodoro Success',
      pomodoro_failure: 'Pomodoro Failure',
    };
    return labels[ruleKey];
  }
}

// Singleton instance
export const gameRulesManager = new GameRulesManagerImpl();
