import * as Notifications from 'expo-notifications';
import { databaseManager } from './DatabaseManager';
import { questSystem } from './QuestSystem';
import { strikeSystem } from './StrikeSystem';

interface ExamAlert {
  examName: string;
  daysRemaining: number;
  alertSent: boolean;
  questsGenerated: boolean;
}

/**
 * ExamAlertService
 * 
 * Manages critical alerts for exam countdowns
 * 
 * Requirements:
 * - 21.2: Trigger push notification when reaching 7 days
 * - 21.3: Auto-generate study quests via OPERATOR agent
 * - 21.4: Display auto-generated quests in Main Quest column
 */
class ExamAlertServiceImpl {
  private alertCache: Map<string, ExamAlert> = new Map();

  /**
   * Check if exam has reached critical threshold (7 days or fewer)
   * and trigger appropriate actions
   * 
   * Requirement 21.1: Switch border to alert color when 7 days or fewer
   * Requirement 21.2: Trigger push notification
   */
  async checkExamCritical(examName: string, daysRemaining: number): Promise<void> {
    try {
      // Only process if exam is critical (7 days or fewer) and not past
      if (daysRemaining > 7 || daysRemaining < 0) {
        return;
      }

      // Check if we've already processed this exam at this threshold
      const cacheKey = `${examName}_${daysRemaining}`;
      const cached = this.alertCache.get(cacheKey);

      if (cached?.alertSent && cached?.questsGenerated) {
        console.log(`Alert already processed for ${examName} at ${daysRemaining} days`);
        return;
      }

      // Send push notification
      await this.sendCriticalNotification(examName, daysRemaining);

      // Auto-generate study quests
      await this.generateStudyQuests(examName, daysRemaining);

      // Update cache
      this.alertCache.set(cacheKey, {
        examName,
        daysRemaining,
        alertSent: true,
        questsGenerated: true,
      });

      // Persist alert to database
      await this.logAlert(examName, daysRemaining);

      console.log(`Critical alert processed for ${examName}: ${daysRemaining} days remaining`);
    } catch (error) {
      console.error('Failed to check exam critical:', error);
    }
  }

  /**
   * Send push notification for critical exam
   * Requirement 21.2: Trigger push notification when reaching 7 days
   * Requirement 21.3: Push notification includes exam name and days remaining
   */
  private async sendCriticalNotification(examName: string, daysRemaining: number): Promise<void> {
    try {
      // Check if notification already sent today for this exam
      const today = new Date().toISOString().split('T')[0];
      const existing = await databaseManager.query<any>(
        `SELECT * FROM notifications 
         WHERE type = 'exam_critical' 
         AND title LIKE ? 
         AND DATE(createdAt) = DATE(?)`,
        [`%${examName}%`, today]
      );

      if (existing.length > 0) {
        console.log(`Notification already sent today for ${examName}`);
        return;
      }

      // Check permissions
      const hasPerms = await strikeSystem.checkPermissions();

      const title = `⚠️ ${examName} Exam Alert`;
      const message = `Critical: Only ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining until ${examName} exam. Study quests have been generated.`;

      if (hasPerms) {
        // Send push notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: message,
            data: { 
              type: 'exam_critical',
              examName,
              daysRemaining 
            },
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null, // Send immediately
        });
      } else {
        console.warn('Cannot send notification: No permissions. Message:', message);
      }

      // Log notification to database
      await databaseManager.insert('notifications', {
        id: `exam_${examName}_${Date.now()}`,
        type: 'exam_critical',
        title,
        message,
        data: JSON.stringify({ examName, daysRemaining }),
        isRead: 0,
        createdAt: new Date().toISOString(),
      });

      console.log(`Critical notification sent for ${examName}`);
    } catch (error) {
      console.error('Failed to send critical notification:', error);
    }
  }

  /**
   * Auto-generate study quests for critical exam
   * Requirement 21.3: Auto-generate study quests via OPERATOR agent
   * Requirement 21.4: Display auto-generated quests in Main Quest column
   * 
   * Note: This is a placeholder implementation. In production, this would
   * integrate with the OPERATOR agent to generate personalized study quests
   * based on the exam syllabus and student's progress.
   */
  private async generateStudyQuests(examName: string, daysRemaining: number): Promise<void> {
    try {
      // Check if quests already generated today for this exam
      const today = new Date().toISOString().split('T')[0];
      const existing = await databaseManager.query<any>(
        `SELECT * FROM quests 
         WHERE type = 'main' 
         AND description LIKE ? 
         AND DATE(createdAt) = DATE(?)`,
        [`%${examName}%`, today]
      );

      if (existing.length > 0) {
        console.log(`Study quests already generated today for ${examName}`);
        return;
      }

      // Generate study quests based on exam and days remaining
      const studyQuests = this.getStudyQuestsForExam(examName, daysRemaining);

      for (const quest of studyQuests) {
        await questSystem.createQuest(
          quest.description,
          quest.energyLevel,
          quest.expValue,
          'main' // Main quest type
        );
      }

      console.log(`Generated ${studyQuests.length} study quests for ${examName}`);
    } catch (error) {
      console.error('Failed to generate study quests:', error);
    }
  }

  /**
   * Get study quests for specific exam
   * This is a placeholder implementation. In production, this would
   * integrate with OPERATOR agent for personalized quest generation.
   */
  private getStudyQuestsForExam(
    examName: string,
    daysRemaining: number
  ): Array<{ description: string; energyLevel: 'high' | 'medium' | 'low'; expValue: number }> {
    // Base study quests for each course
    const questTemplates: Record<string, Array<{ description: string; energyLevel: 'high' | 'medium' | 'low'; expValue: number }>> = {
      CSE321: [
        { description: `${examName}: Review operating system concepts`, energyLevel: 'high', expValue: 30 },
        { description: `${examName}: Practice process scheduling problems`, energyLevel: 'high', expValue: 30 },
        { description: `${examName}: Study memory management techniques`, energyLevel: 'medium', expValue: 20 },
      ],
      CSE341: [
        { description: `${examName}: Review compiler design principles`, energyLevel: 'high', expValue: 30 },
        { description: `${examName}: Practice parsing algorithms`, energyLevel: 'high', expValue: 30 },
        { description: `${examName}: Study code optimization techniques`, energyLevel: 'medium', expValue: 20 },
      ],
      CSE422: [
        { description: `${examName}: Review artificial intelligence concepts`, energyLevel: 'high', expValue: 30 },
        { description: `${examName}: Practice search algorithms`, energyLevel: 'high', expValue: 30 },
        { description: `${examName}: Study machine learning basics`, energyLevel: 'medium', expValue: 20 },
      ],
      CSE423: [
        { description: `${examName}: Review computer graphics fundamentals`, energyLevel: 'high', expValue: 30 },
        { description: `${examName}: Practice 3D transformations`, energyLevel: 'high', expValue: 30 },
        { description: `${examName}: Study rendering techniques`, energyLevel: 'medium', expValue: 20 },
      ],
    };

    // Get quests for this exam, or return generic quests
    const quests = questTemplates[examName] || [
      { description: `${examName}: Review lecture notes`, energyLevel: 'medium' as const, expValue: 20 },
      { description: `${examName}: Practice past exam questions`, energyLevel: 'high' as const, expValue: 30 },
    ];

    // If very critical (3 days or less), add urgent quest
    if (daysRemaining <= 3) {
      quests.unshift({
        description: `${examName}: URGENT - Final revision session`,
        energyLevel: 'high',
        expValue: 40,
      });
    }

    return quests;
  }

  /**
   * Log alert to database for tracking
   */
  private async logAlert(examName: string, daysRemaining: number): Promise<void> {
    try {
      // We can use the notifications table to track alerts
      // This is already done in sendCriticalNotification
      console.log(`Alert logged for ${examName}: ${daysRemaining} days`);
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }

  /**
   * Get alert history for an exam
   */
  async getAlertHistory(examName: string): Promise<any[]> {
    try {
      const alerts = await databaseManager.query<any>(
        `SELECT * FROM notifications 
         WHERE type = 'exam_critical' 
         AND title LIKE ? 
         ORDER BY createdAt DESC`,
        [`%${examName}%`]
      );

      return alerts;
    } catch (error) {
      console.error('Failed to get alert history:', error);
      return [];
    }
  }

  /**
   * Clear alert cache (useful for testing)
   */
  clearCache(): void {
    this.alertCache.clear();
    console.log('Alert cache cleared');
  }
}

// Singleton instance
export const examAlertService = new ExamAlertServiceImpl();
