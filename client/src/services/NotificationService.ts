/**
 * NotificationService
 * 
 * Manages Firebase Cloud Messaging integration via Expo Notifications API.
 * Handles device token registration, notification permissions, and notification tap handling.
 * 
 * Requirements:
 * - 62.1: Use Firebase Cloud Messaging for push notifications
 * - 62.2: Register device token on first launch
 * - 62.3: Send device token to backend for notification targeting
 * - 62.4: Handle notification taps to open relevant app screen
 * - 62.5: Use Expo Notifications API as FCM wrapper
 * - 62.6: Request notification permissions on first launch
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from './apiClient';

// Configure notification behavior
// Requirement 62.5: Use Expo Notifications API as FCM wrapper
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type?: 'exam_countdown' | 'transit_mode' | 'weekly_reflection' | 'sentinel_alert' | 'broker_alert' | 'signal_opportunity' | 'general';
  screen?: string;
  examId?: string;
  questId?: string;
  [key: string]: any;
}

class NotificationService {
  private deviceToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Initialize notification service
   * Requirement 62.2: Register device token on first launch
   * Requirement 62.6: Request notification permissions on first launch
   */
  async initialize(): Promise<void> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return;
      }

      // Register device token
      await this.registerDeviceToken();

      // Set up notification listeners
      this.setupNotificationListeners();

      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   * Requirement 62.6: Request notification permissions on first launch
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('Notifications only work on physical devices');
        return false;
      }

      // Get current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions denied');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00FF66', // growth color
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register device token with Expo and backend
   * Requirement 62.2: Register device token on first launch
   * Requirement 62.3: Send device token to backend for notification targeting
   */
  private async registerDeviceToken(): Promise<void> {
    try {
      // Get Expo push token
      // Requirement 62.5: Use Expo Notifications API as FCM wrapper
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.warn('No Expo project ID found, skipping token registration');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.deviceToken = tokenData.data;
      console.log('Device token obtained:', this.deviceToken);

      // Send token to backend
      // Requirement 62.3: Send device token to backend for notification targeting
      await this.sendTokenToBackend(this.deviceToken);
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  /**
   * Send device token to backend API
   * Requirement 62.3: Send device token to backend for notification targeting
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const response = await apiClient.post('/notifications/register-device', {
        deviceToken: token,
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
        },
      });

      if (response.success) {
        console.log('Device token registered with backend');
      } else {
        console.error('Failed to register device token with backend:', response.error);
      }
    } catch (error) {
      console.error('Error sending token to backend:', error);
      // Don't throw - allow app to continue even if backend registration fails
    }
  }

  /**
   * Set up notification listeners
   * Requirement 62.4: Handle notification taps to open relevant app screen
   */
  private setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Notification is automatically displayed by the handler
    });

    // Listener for notification taps
    // Requirement 62.4: Handle notification taps to open relevant app screen
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as NotificationData;
      this.handleNotificationTap(data);
    });
  }

  /**
   * Handle notification tap to navigate to relevant screen
   * Requirement 62.4: Handle notification taps to open relevant app screen
   */
  private handleNotificationTap(data: NotificationData): void {
    console.log('Notification tapped:', data);

    // Navigation will be handled by the app's navigation system
    // The data contains screen and parameters for navigation
    // This method can be extended to emit events or use a navigation ref
    
    // For now, we'll log the navigation intent
    // The actual navigation will be implemented when integrating with React Navigation
    if (data.screen) {
      console.log(`Navigate to screen: ${data.screen}`, data);
    }

    // Emit custom event for app to handle navigation
    // This allows the app to handle navigation without tight coupling
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('notificationTap', { detail: data });
      window.dispatchEvent(event);
    }
  }

  /**
   * Schedule a local notification
   * Used for exam countdowns, transit mode, weekly reflections
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      console.log('Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Schedule exam countdown notification (7 days before exam)
   * Requirement 63.2: Schedule local notifications for exam countdowns
   */
  async scheduleExamCountdownNotification(
    examName: string,
    examDate: Date,
    examId: string
  ): Promise<string> {
    try {
      // Calculate 7 days before exam at 9:00 AM
      const notificationDate = new Date(examDate);
      notificationDate.setDate(notificationDate.getDate() - 7);
      notificationDate.setHours(9, 0, 0, 0);

      // Only schedule if notification date is in the future
      if (notificationDate.getTime() <= Date.now()) {
        console.warn(`Exam ${examName} is less than 7 days away, skipping notification`);
        return '';
      }

      const notificationId = await this.scheduleLocalNotification(
        `${examName} Exam Alert`,
        `Your ${examName} exam is in 7 days. Time to focus on studying!`,
        {
          type: 'exam_countdown',
          screen: 'Activity',
          examId,
        },
        {
          date: notificationDate,
        }
      );

      console.log(`Exam countdown notification scheduled for ${examName} at ${notificationDate.toISOString()}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling exam countdown notification:', error);
      throw error;
    }
  }

  /**
   * Schedule Transit Mode end notification (daily at 10:00 PM)
   * Requirement 63.3: Schedule local notifications for Transit_Mode end
   */
  async scheduleTransitModeEndNotification(): Promise<string> {
    try {
      // Schedule for 10:00 PM daily
      const now = new Date();
      const notificationTime = new Date(now);
      notificationTime.setHours(22, 0, 0, 0);

      // If it's already past 10 PM today, schedule for tomorrow
      if (notificationTime.getTime() <= now.getTime()) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }

      const notificationId = await this.scheduleLocalNotification(
        'Transit Mode Ended',
        'Transit window closed. Return to deep work.',
        {
          type: 'transit_mode',
          screen: 'Home',
        },
        {
          hour: 22,
          minute: 0,
          repeats: true,
        }
      );

      console.log('Transit Mode end notification scheduled for daily 10:00 PM');
      return notificationId;
    } catch (error) {
      console.error('Error scheduling Transit Mode end notification:', error);
      throw error;
    }
  }

  /**
   * Schedule Weekly Reflection prompt (Sunday at 8:00 PM)
   * Requirement 63.4: Schedule local notifications for Weekly_Reflection prompts
   */
  async scheduleWeeklyReflectionNotification(): Promise<string> {
    try {
      // Calculate next Sunday at 8:00 PM
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      
      let daysUntilSunday = 0;
      if (dayOfWeek === 0) {
        // Today is Sunday
        const currentHour = now.getHours();
        if (currentHour >= 20) {
          // Already past 8:00 PM, schedule for next Sunday
          daysUntilSunday = 7;
        }
      } else {
        // Calculate days until next Sunday
        daysUntilSunday = 7 - dayOfWeek;
      }
      
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      nextSunday.setHours(20, 0, 0, 0);

      const notificationId = await this.scheduleLocalNotification(
        'Weekly Reflection Time',
        'Take 10 minutes to reflect on your week and receive your Weekly Growth Report from ARCHITECT.',
        {
          type: 'weekly_reflection',
          screen: 'Activity',
        },
        {
          weekday: 1, // Sunday (1-7, where 1 is Sunday)
          hour: 20,
          minute: 0,
          repeats: true,
        }
      );

      console.log('Weekly Reflection notification scheduled for Sundays at 8:00 PM');
      return notificationId;
    } catch (error) {
      console.error('Error scheduling Weekly Reflection notification:', error);
      throw error;
    }
  }

  /**
   * Get badge count for Activity tab
   * Requirement 63.5: Display notification badge counts on Activity tab
   * Returns count of due flashcards
   */
  async getActivityBadgeCount(): Promise<number> {
    try {
      // Count due flashcards (cards where nextReviewDate <= today)
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const todayStr = today.toISOString();

      // This will be implemented by FlashcardEngine
      // For now, return 0 as placeholder
      return 0;
    } catch (error) {
      console.error('Error getting activity badge count:', error);
      return 0;
    }
  }

  /**
   * Clear notifications when user views relevant content
   * Requirement 63.6: Clear notifications when user views relevant content
   */
  async clearNotificationsByType(type: NotificationData['type']): Promise<void> {
    try {
      // Get all delivered notifications
      const deliveredNotifications = await Notifications.getPresentedNotificationsAsync();

      // Filter notifications by type and dismiss them
      for (const notification of deliveredNotifications) {
        const data = notification.request.content.data as NotificationData;
        if (data.type === type) {
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      }

      console.log(`Cleared notifications of type: ${type}`);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Clear all delivered notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }

  /**
   * Set badge count on app icon
   * Requirement 63.5: Display notification badge counts on Activity tab
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log(`Badge count set to: ${count}`);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get device token
   */
  getDeviceToken(): string | null {
    return this.deviceToken;
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
