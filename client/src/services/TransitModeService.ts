/**
 * TransitModeService.ts
 * 
 * Manages Transit Mode time-gated UI feature.
 * Automatically activates from 5:00 PM to 10:00 PM daily.
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 23.1, 23.2, 23.3, 23.4, 24.1, 24.2, 24.3, 24.4, 63.3, 69.4, 70.3
 */

import { databaseManager } from './DatabaseManager';
import { notificationService } from './NotificationService';

// Transit Mode time constants (24-hour format)
const TRANSIT_MODE_START_HOUR = 17; // 5:00 PM
const TRANSIT_MODE_END_HOUR = 22;   // 10:00 PM

interface TransitModeState {
  isActive: boolean;
  isManuallyDisabled: boolean;
  lastCheckTime: number;
}

class TransitModeServiceImpl {
  private state: TransitModeState = {
    isActive: false,
    isManuallyDisabled: false,
    lastCheckTime: Date.now(),
  };
  
  private checkIntervalId: NodeJS.Timeout | null = null;
  private transitModeNotificationId: string | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds
  private listeners: Set<(isActive: boolean) => void> = new Set();

  /**
   * Initialize Transit Mode service
   * Load settings and start time checking
   */
  async initialize(): Promise<void> {
    try {
      // Load manual override setting from database
      await this.loadSettings();
      
      // Check current time and set initial state
      await this.checkTimeGate();
      
      // Schedule Transit Mode end notification
      // Requirement 63.3: Schedule local notifications for Transit_Mode end
      await this.scheduleTransitModeNotification();
      
      // Start periodic time checking
      this.startPeriodicCheck();
      
      console.log('[TransitMode] Service initialized');
    } catch (error) {
      console.error('[TransitMode] Initialization failed:', error);
      throw new Error('Failed to initialize Transit Mode service');
    }
  }

  /**
   * Load Transit Mode settings from database
   * Requirement 24.4: Persist Transit Mode preference to settings table
   */
  private async loadSettings(): Promise<void> {
    try {
      const result = await databaseManager.query<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'transit_mode_enabled'"
      );
      
      if (result.length > 0) {
        this.state.isManuallyDisabled = result[0].value === 'false';
      } else {
        // Default: Transit Mode is enabled
        await databaseManager.insert('settings', {
          key: 'transit_mode_enabled',
          value: 'true',
          updatedAt: new Date().toISOString(),
        });
        this.state.isManuallyDisabled = false;
      }
      
      console.log(`[TransitMode] Settings loaded. Manual override: ${this.state.isManuallyDisabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('[TransitMode] Failed to load settings:', error);
      // Default to enabled if loading fails
      this.state.isManuallyDisabled = false;
    }
  }

  /**
   * Start periodic time checking
   * Requirement 23.3: Use expo-task-manager for background time checking
   * Requirement 23.4: Check time every 60 seconds minimum for Transit_Mode state
   * Requirement 70.3: Check Transit Mode state every 60 seconds
   */
  private startPeriodicCheck(): void {
    // Clear any existing interval
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    console.log('[TransitMode] Starting periodic time check (60 second interval)');

    // Set up periodic check every 60 seconds
    this.checkIntervalId = setInterval(async () => {
      await this.checkTimeGate();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic time checking
   */
  private stopPeriodicCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      console.log('[TransitMode] Periodic check stopped');
    }
  }

  /**
   * Check if current time is within Transit Mode window
   * Requirement 22.1: Activate automatically at 5:00 PM daily
   * Requirement 22.2: Deactivate automatically at 10:00 PM daily
   */
  private async checkTimeGate(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Check if we're in the Transit Mode time window (5:00 PM - 10:00 PM)
    const shouldBeActive = currentHour >= TRANSIT_MODE_START_HOUR && currentHour < TRANSIT_MODE_END_HOUR;
    
    // Apply manual override
    // Requirement 24.2: When the toggle is disabled, Transit_Mode shall not activate automatically
    const actuallyActive = shouldBeActive && !this.state.isManuallyDisabled;
    
    const wasActive = this.state.isActive;
    this.state.isActive = actuallyActive;
    this.state.lastCheckTime = Date.now();
    
    // Log state changes
    if (wasActive !== actuallyActive) {
      if (actuallyActive) {
        console.log(`[TransitMode] Activated at ${now.toLocaleTimeString()}`);
        this.notifyListeners(true);
      } else {
        console.log(`[TransitMode] Deactivated at ${now.toLocaleTimeString()}`);
        this.notifyListeners(false);
        
        // Send notification when Transit Mode ends at 10:00 PM
        // Requirement 23.1: When Transit_Mode deactivates at 10:00 PM, trigger push notification
        // Requirement 23.2: Display message "Transit window closed. Return to deep work."
        if (currentHour === TRANSIT_MODE_END_HOUR && !this.state.isManuallyDisabled) {
          await this.sendEndNotification();
        }
      }
    }
  }

  /**
   * Send push notification when Transit Mode ends
   * Requirement 23.1: When Transit_Mode deactivates at 10:00 PM, trigger push notification
   * Requirement 23.2: Display message "Transit window closed. Return to deep work."
   * Requirement 63.3: Schedule local notifications for Transit_Mode end
   */
  private async scheduleTransitModeNotification(): Promise<void> {
    try {
      // Cancel existing notification if any
      if (this.transitModeNotificationId) {
        await notificationService.cancelNotification(this.transitModeNotificationId);
      }

      // Schedule daily notification at 10:00 PM
      this.transitModeNotificationId = await notificationService.scheduleTransitModeEndNotification();
      
      console.log('[TransitMode] End notification scheduled');
    } catch (error) {
      console.error('[TransitMode] Failed to schedule notification:', error);
    }
  }

  /**
   * @deprecated Use scheduleTransitModeNotification instead
   * Send push notification when Transit Mode ends
   * Requirement 23.1: When Transit_Mode deactivates at 10:00 PM, trigger push notification
   * Requirement 23.2: Display message "Transit window closed. Return to deep work."
   */
  private async sendEndNotification(): Promise<void> {
    try {
      await notificationService.scheduleLocalNotification(
        'Transit Mode Ended',
        'Transit window closed. Return to deep work.',
        {
          type: 'transit_mode',
          screen: 'Home',
        },
        null // Send immediately
      );
      
      console.log('[TransitMode] End notification sent');
    } catch (error) {
      console.error('[TransitMode] Failed to send notification:', error);
    }
  }

  /**
   * Get current Transit Mode state
   */
  isTransitModeActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Check if Transit Mode is manually disabled
   */
  isManuallyDisabled(): boolean {
    return this.state.isManuallyDisabled;
  }

  /**
   * Set manual override for Transit Mode
   * Requirement 24.1: Display Transit Mode toggle in Settings tab
   * Requirement 24.2: When the toggle is disabled, Transit_Mode shall not activate automatically
   * Requirement 24.3: When the toggle is re-enabled, Transit_Mode shall resume automatic activation
   * Requirement 24.4: Persist Transit Mode preference to settings table
   */
  async setManualOverride(disabled: boolean): Promise<void> {
    try {
      this.state.isManuallyDisabled = disabled;
      
      // Persist to database
      await databaseManager.update(
        'settings',
        { value: disabled ? 'false' : 'true', updatedAt: new Date().toISOString() },
        "key = 'transit_mode_enabled'"
      );
      
      console.log(`[TransitMode] Manual override set to: ${disabled ? 'disabled' : 'enabled'}`);
      
      // Re-check time gate to apply new setting immediately
      await this.checkTimeGate();
    } catch (error) {
      console.error('[TransitMode] Failed to set manual override:', error);
      throw new Error('Failed to update Transit Mode setting');
    }
  }

  /**
   * Add listener for Transit Mode state changes
   */
  addListener(callback: (isActive: boolean) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove listener for Transit Mode state changes
   */
  removeListener(callback: (isActive: boolean) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(isActive: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(isActive);
      } catch (error) {
        console.error('[TransitMode] Listener callback error:', error);
      }
    });
  }

  /**
   * Get next transition time (when Transit Mode will activate or deactivate)
   */
  getNextTransitionTime(): Date {
    const now = new Date();
    const currentHour = now.getHours();
    
    const nextTransition = new Date(now);
    
    if (currentHour < TRANSIT_MODE_START_HOUR) {
      // Before Transit Mode starts today
      nextTransition.setHours(TRANSIT_MODE_START_HOUR, 0, 0, 0);
    } else if (currentHour < TRANSIT_MODE_END_HOUR) {
      // During Transit Mode, next transition is end time
      nextTransition.setHours(TRANSIT_MODE_END_HOUR, 0, 0, 0);
    } else {
      // After Transit Mode ends, next transition is tomorrow's start time
      nextTransition.setDate(nextTransition.getDate() + 1);
      nextTransition.setHours(TRANSIT_MODE_START_HOUR, 0, 0, 0);
    }
    
    return nextTransition;
  }

  /**
   * Manually trigger time check (for testing)
   */
  async triggerManualCheck(): Promise<void> {
    await this.checkTimeGate();
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.stopPeriodicCheck();
    this.listeners.clear();
    console.log('[TransitMode] Service cleaned up');
  }
}

// Singleton instance
export const transitModeService = new TransitModeServiceImpl();
