import { AppState, AppStateStatus } from 'react-native';
import { expSystem } from './EXPSystem';
import { gameRulesManager } from './GameRulesManager';
import { databaseManager } from './DatabaseManager';

const POMODORO_DURATION_MS = 25 * 60 * 1000; // 25 minutes

export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

class PomodoroTimerImpl {
  private status: PomodoroStatus = 'idle';
  private startTime: number = 0;
  private remainingTime: number = POMODORO_DURATION_MS;
  private intervalId: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private onTickCallback: ((remainingMs: number) => void) | null = null;
  private onStatusChangeCallback: ((status: PomodoroStatus) => void) | null = null;
  private onFlashCallback: (() => void) | null = null;

  /**
   * Start the Pomodoro timer
   */
  start(): void {
    if (this.status === 'running') {
      console.log('Timer already running');
      return;
    }

    this.status = 'running';
    this.startTime = Date.now();
    this.remainingTime = POMODORO_DURATION_MS;

    // Start interval
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    // Monitor app state
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    this.notifyStatusChange();
    console.log('Pomodoro timer started');
  }

  /**
   * Pause the timer (manual pause, no penalty)
   */
  pause(): void {
    if (this.status !== 'running') {
      return;
    }

    this.status = 'paused';
    this.clearInterval();
    this.notifyStatusChange();
    console.log('Pomodoro timer paused');
  }

  /**
   * Resume the timer
   */
  resume(): void {
    if (this.status !== 'paused') {
      return;
    }

    this.status = 'running';
    this.startTime = Date.now();

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    this.notifyStatusChange();
    console.log('Pomodoro timer resumed');
  }

  /**
   * Stop the timer manually (no penalty)
   */
  stop(): void {
    this.status = 'idle';
    this.remainingTime = POMODORO_DURATION_MS;
    this.cleanup();
    this.notifyStatusChange();
    console.log('Pomodoro timer stopped manually');
  }

  /**
   * Handle timer tick
   */
  private tick(): void {
    const elapsed = Date.now() - this.startTime;
    this.remainingTime = Math.max(0, POMODORO_DURATION_MS - elapsed);

    if (this.onTickCallback) {
      this.onTickCallback(this.remainingTime);
    }

    // Check if completed
    if (this.remainingTime <= 0) {
      this.complete();
    }
  }

  /**
   * Complete the Pomodoro successfully
   */
  private async complete(): Promise<void> {
    this.status = 'completed';
    this.cleanup();

    // Award EXP
    try {
      const successEXP = gameRulesManager.getEXPValue('pomodoro_success');
      await expSystem.awardEXP(successEXP, 'pomodoro');
      console.log(`Pomodoro completed! Awarded ${successEXP} EXP`);

      // Log session outcome to quests table (Requirement 35.6)
      await databaseManager.insert('quests', {
        description: 'Pomodoro Session Completed',
        expValue: successEXP,
        isComplete: true,
        type: 'side',
        energyLevel: 'high',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to award Pomodoro EXP or log session:', error);
    }

    this.notifyStatusChange();
  }

  /**
   * Fail the Pomodoro (app switch detected)
   */
  private async fail(): Promise<void> {
    this.status = 'failed';
    this.cleanup();

    // Flash screen red (Requirement 35.3)
    if (this.onFlashCallback) {
      this.onFlashCallback();
    }

    // Deduct EXP (Requirement 35.4)
    try {
      const failurePenalty = Math.abs(gameRulesManager.getEXPValue('pomodoro_failure'));
      await expSystem.deductEXP(failurePenalty);
      console.log(`Pomodoro failed! Deducted ${failurePenalty} EXP`);

      // Log session outcome to quests table (Requirement 35.6)
      await databaseManager.insert('quests', {
        description: 'Pomodoro Session Failed - App Switch Detected',
        expValue: -failurePenalty,
        isComplete: false,
        type: 'side',
        energyLevel: 'high',
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
    } catch (error) {
      console.error('Failed to deduct Pomodoro penalty or log session:', error);
    }

    this.notifyStatusChange();
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (this.status !== 'running') {
      return;
    }

    // If app goes to background or inactive, fail the Pomodoro
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('App switched away during Pomodoro - FAILURE');
      this.fail();
    }
  };

  /**
   * Clean up interval and listeners
   */
  private cleanup(): void {
    this.clearInterval();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * Clear the interval
   */
  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Notify status change
   */
  private notifyStatusChange(): void {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(this.status);
    }
  }

  /**
   * Set tick callback
   */
  onTick(callback: (remainingMs: number) => void): void {
    this.onTickCallback = callback;
  }

  /**
   * Set status change callback
   */
  onStatusChange(callback: (status: PomodoroStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }

  /**
   * Set flash callback (for red screen flash on failure)
   */
  onFlash(callback: () => void): void {
    this.onFlashCallback = callback;
  }

  /**
   * Get current status
   */
  getStatus(): PomodoroStatus {
    return this.status;
  }

  /**
   * Get remaining time in milliseconds
   */
  getRemainingTime(): number {
    return this.remainingTime;
  }

  /**
   * Get remaining time formatted as MM:SS
   */
  getFormattedTime(): string {
    const totalSeconds = Math.ceil(this.remainingTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Singleton instance
export const pomodoroTimer = new PomodoroTimerImpl();
