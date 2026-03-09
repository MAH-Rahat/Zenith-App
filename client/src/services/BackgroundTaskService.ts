/**
 * BackgroundTaskService.ts
 * 
 * Background task management for HP inactivity checking.
 * Uses expo-task-manager to periodically check for inactivity penalties.
 * 
 * Requirements: 8.4, 70.1, 70.2, 70.4
 */

import * as TaskManager from 'expo-task-manager';
import { hpSystem } from './HPSystem';

// Task name constant
const HP_INACTIVITY_CHECK_TASK = 'HP_INACTIVITY_CHECK';

/**
 * Define the background task for HP inactivity checking
 * Requirement 8.4: Check for inactivity penalty every hour using expo-task-manager
 * Requirement 70.1: Use expo-task-manager for all background tasks
 */
TaskManager.defineTask(HP_INACTIVITY_CHECK_TASK, async () => {
  try {
    console.log('[BackgroundTask] Running HP inactivity check...');
    
    // Call HPSystem.checkInactivity()
    const result = await hpSystem.checkInactivity();
    
    if (result.penaltyApplied) {
      console.log(
        `[BackgroundTask] Inactivity penalty applied. HP: ${result.currentHP}, Hours inactive: ${result.hoursInactive.toFixed(1)}`
      );
    } else {
      console.log(
        `[BackgroundTask] No penalty needed. HP: ${result.currentHP}, Hours inactive: ${result.hoursInactive.toFixed(1)}`
      );
    }
    
    // Return success
    return;
  } catch (error) {
    console.error('[BackgroundTask] HP inactivity check failed:', error);
    throw error;
  }
});

class BackgroundTaskServiceImpl {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes in milliseconds

  /**
   * Start periodic HP inactivity checking
   * Requirement 70.2: Set minimum polling interval of 60 seconds for all background tasks
   * Requirement 70.4: Check HP inactivity penalty every 60 minutes
   */
  async startPeriodicCheck(): Promise<void> {
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    console.log('[BackgroundTask] Starting periodic HP inactivity check');
    console.log(`[BackgroundTask] Check interval: ${this.CHECK_INTERVAL_MS / 1000 / 60} minutes`);

    // Run initial check - throw if it fails
    try {
      await this.runInactivityCheck();
    } catch (error) {
      console.error('[BackgroundTask] Initial check failed:', error);
      throw error;
    }

    // Set up periodic check every 60 minutes
    // Requirement 70.4: Check HP inactivity penalty every 60 minutes
    this.intervalId = setInterval(async () => {
      await this.runInactivityCheck();
    }, this.CHECK_INTERVAL_MS);

    console.log('[BackgroundTask] Periodic check started successfully');
  }

  /**
   * Stop periodic HP inactivity checking
   */
  stopPeriodicCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[BackgroundTask] Periodic check stopped');
    }
  }

  /**
   * Run a single inactivity check
   */
  private async runInactivityCheck(): Promise<void> {
    console.log('[BackgroundTask] Running HP inactivity check...');
    
    const result = await hpSystem.checkInactivity();
    
    if (result.penaltyApplied) {
      console.log(
        `[BackgroundTask] Inactivity penalty applied. HP: ${result.currentHP}, Hours inactive: ${result.hoursInactive.toFixed(1)}`
      );
    } else {
      console.log(
        `[BackgroundTask] No penalty needed. HP: ${result.currentHP}, Hours inactive: ${result.hoursInactive.toFixed(1)}`
      );
    }
  }

  /**
   * Register the HP inactivity check background task
   * This registers the task definition with expo-task-manager
   * Requirement 8.4: Check for inactivity penalty every hour using expo-task-manager
   * Requirement 70.1: Use expo-task-manager for all background tasks
   */
  async registerHPInactivityTask(): Promise<void> {
    try {
      // Check if task is already registered
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(HP_INACTIVITY_CHECK_TASK);
      
      if (isTaskRegistered) {
        console.log('[BackgroundTask] HP inactivity task already registered');
      } else {
        console.log('[BackgroundTask] HP inactivity task definition registered');
      }

      // Start the periodic check in the foreground
      await this.startPeriodicCheck();
      
      console.log('[BackgroundTask] HP inactivity checking initialized');
    } catch (error) {
      console.error('[BackgroundTask] Failed to register HP inactivity task:', error);
      throw new Error('Failed to register background task');
    }
  }

  /**
   * Unregister the HP inactivity check background task
   */
  async unregisterHPInactivityTask(): Promise<void> {
    try {
      this.stopPeriodicCheck();
      
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(HP_INACTIVITY_CHECK_TASK);
      
      if (isTaskRegistered) {
        await TaskManager.unregisterTaskAsync(HP_INACTIVITY_CHECK_TASK);
        console.log('[BackgroundTask] HP inactivity task unregistered');
      }
    } catch (error) {
      console.error('[BackgroundTask] Failed to unregister HP inactivity task:', error);
      throw new Error('Failed to unregister background task');
    }
  }

  /**
   * Check if the HP inactivity task is registered
   */
  async isTaskRegistered(): Promise<boolean> {
    try {
      return await TaskManager.isTaskRegisteredAsync(HP_INACTIVITY_CHECK_TASK);
    } catch (error) {
      console.error('[BackgroundTask] Failed to check task registration:', error);
      return false;
    }
  }

  /**
   * Get the task name constant
   */
  getTaskName(): string {
    return HP_INACTIVITY_CHECK_TASK;
  }

  /**
   * Manually trigger an inactivity check (for testing)
   */
  async triggerManualCheck(): Promise<void> {
    await this.runInactivityCheck();
  }
}

// Singleton instance
export const backgroundTaskService = new BackgroundTaskServiceImpl();
