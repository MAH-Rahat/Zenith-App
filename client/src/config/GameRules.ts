/**
 * GameRules.ts
 * 
 * Centralized configuration for all game mechanics rules in Zenith.
 * These constants ensure consistency across the app and make it easy to adjust game balance.
 * 
 * Requirements: 7.1, 7.2, 7.3, 8.1, 79.1, 79.2, 79.3
 */

/**
 * EXP_RULES: Experience point rewards and penalties for different activities
 * 
 * - academic_task: EXP awarded for completing academic/study tasks
 * - coding_quest: EXP awarded for completing coding-related quests
 * - project_deployed: EXP awarded for deploying a project
 * - pomodoro_success: EXP awarded for successfully completing a 25-minute Pomodoro session
 * - pomodoro_failure: EXP penalty for failing a Pomodoro session (switching apps)
 */
export const EXP_RULES = {
  academic_task: 10,
  coding_quest: 20,
  project_deployed: 100,
  pomodoro_success: 20,
  pomodoro_failure: -5,
} as const;

/**
 * HP_RULES: Health point system configuration
 * 
 * - base_hp: Starting HP value for new users
 * - daily_inactivity_penalty: HP deducted after 24 hours with 0 EXP earned
 * - hp_floor: Minimum HP value (triggers Critical State when reached)
 * - inactivity_threshold_hours: Hours of inactivity before penalty is applied
 */
export const HP_RULES = {
  base_hp: 100,
  daily_inactivity_penalty: -15,
  hp_floor: 0,
  inactivity_threshold_hours: 24,
} as const;

/**
 * Type definitions for type-safe usage across the app
 */
export type EXPRuleKey = keyof typeof EXP_RULES;
export type HPRuleKey = keyof typeof HP_RULES;
