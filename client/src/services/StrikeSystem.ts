import * as Notifications from 'expo-notifications';
import { databaseManager } from './DatabaseManager';
import { expSystem } from './EXPSystem';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH
  })
});

class StrikeSystemImpl {
  private hasPermissions: boolean = false;

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      this.hasPermissions = finalStatus === 'granted';
      
      if (!this.hasPermissions) {
        console.warn('Notification permissions not granted');
      }

      return this.hasPermissions;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if we have notification permissions
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      this.hasPermissions = status === 'granted';
      return this.hasPermissions;
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule daily 9 PM check
   */
  async scheduleDaily9PMCheck(): Promise<void> {
    try {
      // Cancel any existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule daily notification at 9 PM
      const trigger = {
        hour: 21, // 9 PM
        minute: 0,
        repeats: true
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daily Check',
          body: 'Checking your progress...',
          data: { type: 'daily_check' }
        },
        trigger
      });

      console.log('Daily 9 PM check scheduled');
    } catch (error) {
      console.error('Failed to schedule daily check:', error);
    }
  }

  /**
   * Check daily EXP and send notification if zero
   */
  async checkDailyEXP(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyEXP = await expSystem.getDailyEXP(today);

      if (dailyEXP === 0) {
        await this.sendZeroEXPNotification();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check daily EXP:', error);
      return false;
    }
  }

  /**
   * Send zero EXP notification
   */
  private async sendZeroEXPNotification(): Promise<void> {
    try {
      // Calculate days remaining (assuming 303 days from app start)
      const daysRemaining = await this.calculateDaysRemaining();

      const message = `System Warning: 0 EXP today. You have ${daysRemaining} days left. Write 5 lines of code or read one page of OS notes now.`;

      // Check if we already sent a notification today
      const today = new Date().toISOString().split('T')[0];
      const existingNotifications = await databaseManager.query<any>(
        `SELECT * FROM notifications 
         WHERE DATE(timestamp) = DATE(?) 
         AND notification_sent = 1`,
        [today]
      );

      if (existingNotifications.length > 0) {
        console.log('Notification already sent today');
        return;
      }

      // Check permissions
      const hasPerms = await this.checkPermissions();

      if (hasPerms) {
        // Send push notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'System Warning',
            body: message,
            data: { type: 'zero_exp_warning' },
            priority: Notifications.AndroidNotificationPriority.HIGH
          },
          trigger: null // Send immediately
        });
      } else {
        // Fallback: Log for in-app alert
        console.warn('Cannot send notification: No permissions. Message:', message);
      }

      // Log notification event
      await databaseManager.insert('notifications', {
        daily_exp: 0,
        days_remaining: daysRemaining,
        notification_sent: hasPerms ? 1 : 0,
        reason: 'Zero EXP warning',
        timestamp: new Date().toISOString()
      });

      console.log('Zero EXP notification sent');
    } catch (error) {
      console.error('Failed to send zero EXP notification:', error);
    }
  }

  /**
   * Calculate days remaining until deadline
   */
  private async calculateDaysRemaining(): Promise<number> {
    try {
      // Get deadline from settings or calculate from creation date
      const settings = await databaseManager.query<any>(
        'SELECT value FROM settings WHERE key = ?',
        ['deadline_date']
      );

      let deadlineDate: Date;

      if (settings.length > 0) {
        deadlineDate = new Date(JSON.parse(settings[0].value));
      } else {
        // Default: 303 days from now (as per requirements)
        deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 303);
        
        // Store deadline
        await databaseManager.insert('settings', {
          key: 'deadline_date',
          value: JSON.stringify(deadlineDate.toISOString()),
          updated_at: new Date().toISOString()
        });
      }

      const now = new Date();
      const diffTime = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return Math.max(0, diffDays);
    } catch (error) {
      console.error('Failed to calculate days remaining:', error);
      return 303; // Default fallback
    }
  }

  /**
   * Send custom notification
   */
  async sendNotification(title: string, message: string): Promise<void> {
    try {
      const hasPerms = await this.checkPermissions();

      if (!hasPerms) {
        console.warn('Cannot send notification: No permissions');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: { type: 'custom' }
        },
        trigger: null
      });

      console.log('Custom notification sent:', title);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(limit: number = 30): Promise<any[]> {
    try {
      const notifications = await databaseManager.query<any>(
        'SELECT * FROM notifications ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );

      return notifications;
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }
}

// Singleton instance
export const strikeSystem = new StrikeSystemImpl();
