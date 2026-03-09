/**
 * WeeklyReflectionService.ts
 * 
 * Schedules and manages weekly reflection prompts.
 * Triggers notification at 20:00 on Sunday.
 * 
 * Requirements: 39.1, 39.2, 63.4
 */

import { databaseManager } from './DatabaseManager';
import { notificationService } from './NotificationService';

class WeeklyReflectionServiceImpl {
  private notificationId: string | null = null;

  /**
   * Schedule weekly reflection notification for Sunday at 20:00
   * Requirement 39.1: Trigger Weekly_Reflection prompt at 20:00 on Sunday
   * Requirement 63.4: Schedule local notifications for Weekly_Reflection prompts
   */
  async scheduleWeeklyReflection(): Promise<void> {
    try {
      // Cancel existing notification if any
      if (this.notificationId) {
        await notificationService.cancelNotification(this.notificationId);
      }

      // Schedule weekly reflection notification
      this.notificationId = await notificationService.scheduleWeeklyReflectionNotification();

      console.log('[WeeklyReflection] Notification scheduled successfully');
    } catch (error) {
      console.error('[WeeklyReflection] Failed to schedule notification:', error);
      throw new Error('Failed to schedule weekly reflection notification');
    }
  }

  /**
   * Calculate next Sunday at 20:00
   */
  private getNextSunday20(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate days until next Sunday
    let daysUntilSunday = 0;
    if (dayOfWeek === 0) {
      // Today is Sunday
      const currentHour = now.getHours();
      if (currentHour >= 20) {
        // Already past 20:00, schedule for next Sunday
        daysUntilSunday = 7;
      }
    } else {
      // Calculate days until next Sunday
      daysUntilSunday = 7 - dayOfWeek;
    }
    
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(20, 0, 0, 0); // Set to 20:00:00
    
    return nextSunday;
  }

  /**
   * Cancel weekly reflection notification
   */
  async cancelWeeklyReflection(): Promise<void> {
    try {
      if (this.notificationId) {
        await notificationService.cancelNotification(this.notificationId);
        this.notificationId = null;
        console.log('[WeeklyReflection] Notification cancelled');
      }
    } catch (error) {
      console.error('[WeeklyReflection] Failed to cancel notification:', error);
    }
  }

  /**
   * Check if user has already submitted reflection for current week
   */
  async hasSubmittedThisWeek(): Promise<boolean> {
    try {
      const { weekStart } = this.getCurrentWeekDates();
      
      const reflections = await databaseManager.query<{ id: string }>(
        'SELECT id FROM weekly_reflections WHERE week_start_date = ?',
        [weekStart]
      );
      
      return reflections.length > 0;
    } catch (error) {
      console.error('[WeeklyReflection] Failed to check submission status:', error);
      return false;
    }
  }

  /**
   * Get current week dates (Sunday to Saturday)
   */
  private getCurrentWeekDates() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate last Sunday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    // Calculate next Saturday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    };
  }

  /**
   * Get all reflections (up to 52 weeks)
   * Requirement 90.1: Store exactly 52 weeks of data
   */
  async getAllReflections(): Promise<any[]> {
    try {
      const reflections = await databaseManager.query(
        `SELECT * FROM weekly_reflections 
         ORDER BY week_start_date DESC 
         LIMIT 52`
      );
      
      return reflections;
    } catch (error) {
      console.error('[WeeklyReflection] Failed to get reflections:', error);
      return [];
    }
  }

  /**
   * Get reflection by week start date
   */
  async getReflectionByWeek(weekStartDate: string): Promise<any | null> {
    try {
      const reflections = await databaseManager.query(
        'SELECT * FROM weekly_reflections WHERE week_start_date = ?',
        [weekStartDate]
      );
      
      return reflections.length > 0 ? reflections[0] : null;
    } catch (error) {
      console.error('[WeeklyReflection] Failed to get reflection:', error);
      return null;
    }
  }

  /**
   * Calculate growth metrics across all reflections
   * Requirement 90.4: Calculate growth metrics across 52 weeks
   */
  async calculateGrowthMetrics(): Promise<{
    totalReflections: number;
    averageExpDelta: number;
    totalExpGrowth: number;
    consistencyScore: number;
  }> {
    try {
      const reflections = await this.getAllReflections();
      
      if (reflections.length === 0) {
        return {
          totalReflections: 0,
          averageExpDelta: 0,
          totalExpGrowth: 0,
          consistencyScore: 0,
        };
      }
      
      const totalExpGrowth = reflections.reduce((sum, r) => sum + (r.exp_delta || 0), 0);
      const averageExpDelta = totalExpGrowth / reflections.length;
      
      // Consistency score: percentage of weeks with positive EXP delta
      const positiveWeeks = reflections.filter(r => (r.exp_delta || 0) > 0).length;
      const consistencyScore = (positiveWeeks / reflections.length) * 100;
      
      return {
        totalReflections: reflections.length,
        averageExpDelta: Math.round(averageExpDelta),
        totalExpGrowth,
        consistencyScore: Math.round(consistencyScore),
      };
    } catch (error) {
      console.error('[WeeklyReflection] Failed to calculate growth metrics:', error);
      return {
        totalReflections: 0,
        averageExpDelta: 0,
        totalExpGrowth: 0,
        consistencyScore: 0,
      };
    }
  }

  /**
   * Export all reflections as Markdown
   * Requirement 90.5: Export all reflections as Markdown
   */
  async exportToMarkdown(): Promise<string> {
    try {
      const reflections = await this.getAllReflections();
      const metrics = await this.calculateGrowthMetrics();
      
      let markdown = '# Weekly Reflections - 52-Week Transformation Record\n\n';
      markdown += '## Growth Metrics\n\n';
      markdown += `- Total Reflections: ${metrics.totalReflections}\n`;
      markdown += `- Average EXP Delta: ${metrics.averageExpDelta > 0 ? '+' : ''}${metrics.averageExpDelta}\n`;
      markdown += `- Total EXP Growth: ${metrics.totalExpGrowth > 0 ? '+' : ''}${metrics.totalExpGrowth}\n`;
      markdown += `- Consistency Score: ${metrics.consistencyScore}%\n\n`;
      markdown += '---\n\n';
      
      for (const reflection of reflections) {
        const weekStart = new Date(reflection.week_start_date).toLocaleDateString();
        const weekEnd = new Date(reflection.week_end_date).toLocaleDateString();
        
        markdown += `## Week of ${weekStart} - ${weekEnd}\n\n`;
        markdown += `**EXP Delta:** ${reflection.exp_delta > 0 ? '+' : ''}${reflection.exp_delta}\n\n`;
        
        markdown += `### Accomplishments\n${reflection.accomplishments}\n\n`;
        markdown += `### Avoided Tasks\n${reflection.avoided_tasks}\n\n`;
        markdown += `### Learning\n${reflection.learning}\n\n`;
        markdown += `### Challenges\n${reflection.challenges}\n\n`;
        markdown += `### Next Week Priorities\n${reflection.next_week_priorities}\n\n`;
        
        if (reflection.architect_report) {
          try {
            const report = JSON.parse(reflection.architect_report);
            markdown += `### ARCHITECT Weekly Growth Report\n\n`;
            markdown += `**What Shipped:** ${report.what_shipped}\n\n`;
            markdown += `**What Avoided:** ${report.what_avoided}\n\n`;
            markdown += `**Hard Truth:** ${report.hard_truth}\n\n`;
          } catch (e) {
            // Skip if report parsing fails
          }
        }
        
        markdown += '---\n\n';
      }
      
      return markdown;
    } catch (error) {
      console.error('[WeeklyReflection] Failed to export to Markdown:', error);
      return '# Export Failed\n\nUnable to export reflections.';
    }
  }

  /**
   * Initialize weekly reflection service
   */
  async initialize(): Promise<void> {
    try {
      // Schedule weekly reflection notification
      // Requirement 63.4: Schedule local notifications for Weekly_Reflection prompts
      await this.scheduleWeeklyReflection();
      
      console.log('[WeeklyReflection] Service initialized successfully');
    } catch (error) {
      console.error('[WeeklyReflection] Failed to initialize:', error);
    }
  }
}

// Singleton instance
export const weeklyReflectionService = new WeeklyReflectionServiceImpl();
