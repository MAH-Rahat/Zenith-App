import * as Notifications from 'expo-notifications';
import { databaseManager } from './DatabaseManager';
import { storageManager } from './StorageManager';
import { hpSystem } from './HPSystem';
import { strikeSystem } from './StrikeSystem';
import { SentinelSystem as ISentinelSystem, NotificationEvent, EXPData } from '../types';

const STORAGE_KEY_NOTIFICATION_LOG = 'zenith_notification_log';
const STORAGE_KEY_EXP = 'zenith_exp_data';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

class SentinelSystemImpl implements ISentinelSystem {
  async initialize(): Promise<void> {
    try {
      // Initialize database first
      await databaseManager.init();
      console.log('DatabaseManager initialized');

      // Check for inactivity and HP penalties
      await hpSystem.checkInactivity();
      console.log('HP system checked');

      // Request notification permissions
      await strikeSystem.requestPermissions();
      
      // Schedule the daily 9 PM check
      await strikeSystem.scheduleDaily9PMCheck();
      console.log('Strike system initialized');

      console.log('SentinelSystem initialization complete');
    } catch (error) {
      console.error('Failed to initialize SentinelSystem:', error);
    }
  }

  scheduleDaily9PMCheck(): void {
    try {
      // Cancel any existing notifications
      Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule daily notification at 9 PM
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Zenith Accountability Check',
          body: 'Checking your progress...',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour: 21, // 9 PM
          minute: 0,
          repeats: true,
        },
      });

      console.log('Daily 9 PM notification scheduled');
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  async checkAndNotify(): Promise<void> {
    try {
      // Load daily EXP
      const expData = await storageManager.load<EXPData>(STORAGE_KEY_EXP);
      const dailyEXP = expData?.dailyEXP || 0;

      // Calculate days remaining in 2026
      const now = new Date();
      const endOf2026 = new Date('2026-12-31');
      const diffTime = endOf2026.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dailyEXP === 0) {
        // Send aggressive notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'System Alert: Zero Progress',
            body: `0 EXP gained today. You have ${daysRemaining} days left in 2026. Open your laptop and write 5 lines of code, or accept the rank of Junior Developer.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
          },
          trigger: null, // Send immediately
        });

        // Log the notification event
        await this.logNotificationEvent({
          timestamp: new Date().toISOString(),
          dailyEXP,
          daysRemaining,
          notificationSent: true,
          reason: 'zero_exp',
        });
      } else {
        // Log that check was performed but no notification sent
        await this.logNotificationEvent({
          timestamp: new Date().toISOString(),
          dailyEXP,
          daysRemaining,
          notificationSent: false,
        });
      }
    } catch (error) {
      console.error('Failed to check and notify:', error);
    }
  }

  async logNotificationEvent(event: NotificationEvent): Promise<void> {
    try {
      const existingLog = await storageManager.load<{ events: NotificationEvent[] }>(
        STORAGE_KEY_NOTIFICATION_LOG
      );
      
      const events = existingLog?.events || [];
      events.push(event);

      // Keep only last 30 days of logs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredEvents = events.filter(
        e => new Date(e.timestamp) > thirtyDaysAgo
      );

      await storageManager.save(STORAGE_KEY_NOTIFICATION_LOG, { events: filteredEvents });
    } catch (error) {
      console.error('Failed to log notification event:', error);
    }
  }
}

export const sentinelSystem = new SentinelSystemImpl();
