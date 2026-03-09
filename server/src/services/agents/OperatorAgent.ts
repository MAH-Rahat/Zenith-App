import { config } from '../../config';
import { CacheService } from '../cacheService';
import { Notification } from '../../models/Notification';
import mongoose from 'mongoose';

/**
 * OPERATOR Agent - Life Administration
 * 
 * Persona: Cold C-suite executive assistant with zero warmth
 * 
 * Responsibilities:
 * - Calendar management and parsing
 * - Deadline tracking and surfacing
 * - Scheduling conflict detection
 * - Hard-blocking 17:00-22:00 for tuition commitments
 * - Auto-generating study quests when exams reach 7 days
 * 
 * Requirements: 41.1-41.9, 60.1, 60.7, 64.2, 64.4
 */

// ===== Input/Output Interfaces =====

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO 8601 format
  endTime: string;   // ISO 8601 format
  description?: string;
}

export interface Exam {
  id: string;
  name: string;
  date: string; // ISO 8601 format
  color?: string;
}

export interface OperatorInput {
  userId: string;
  userInput: string;
  calendarEvents?: CalendarEvent[];
  examDates?: Exam[];
}

export interface Conflict {
  event1: string;
  event2: string;
  conflictTime: string;
}

export interface TimeBlock {
  startTime: string;
  endTime: string;
  reason: string;
}

export interface Deadline {
  name: string;
  date: string;
  daysRemaining: number;
}

export interface AutoQuest {
  description: string;
  expValue: number;
  type: 'main' | 'side';
  energyLevel: 'high' | 'medium' | 'low';
}

export interface OperatorOutput {
  priority_tasks: string[];
  conflicts_detected: Conflict[];
  calendar_blocks: TimeBlock[];
  next_deadline: Deadline | null;
  auto_quests: AutoQuest[];
}

// ===== OPERATOR Agent Class =====

export class OperatorAgent {
  /**
   * Process OPERATOR agent request
   * 
   * Requirements: 41.1, 41.2, 41.3, 41.4, 41.5, 41.6, 41.7, 41.8, 41.9
   */
  static async process(input: OperatorInput): Promise<OperatorOutput> {
    console.log('🔧 OPERATOR processing request...');

    // Hard-block 17:00-22:00 for tuition commitments (Requirement 41.3)
    const tutionBlock: TimeBlock = {
      startTime: '17:00',
      endTime: '22:00',
      reason: 'Tuition commitment (non-negotiable)',
    };

    // Parse calendar events (Requirement 41.2)
    const calendarEvents = input.calendarEvents || [];
    
    // Parse exam dates
    const examDates = input.examDates || [];

    // Surface upcoming deadlines within 7 days (Requirement 41.4)
    const upcomingDeadlines = this.getUpcomingDeadlines(examDates);

    // Detect scheduling conflicts (Requirement 41.5)
    const conflicts = this.detectConflicts(calendarEvents);

    // Auto-generate study quests for exams within 7 days (Requirement 41.6)
    const autoQuests = this.generateStudyQuests(upcomingDeadlines);

    // Call Gemini API for natural language processing (Requirement 41.9)
    const priorityTasks = await this.generatePriorityTasks(
      input.userInput,
      calendarEvents,
      upcomingDeadlines
    );

    // Construct output (Requirement 41.7)
    const output: OperatorOutput = {
      priority_tasks: priorityTasks,
      conflicts_detected: conflicts,
      calendar_blocks: [tutionBlock],
      next_deadline: upcomingDeadlines[0] || null,
      auto_quests: autoQuests,
    };

    // Persist output to notifications table (Requirement 41.8)
    await this.persistNotification(input.userId, output);

    console.log('✅ OPERATOR processing complete');
    return output;
  }

  /**
   * Persist OPERATOR output to notifications table
   * 
   * Requirement: 41.8
   */
  private static async persistNotification(
    userId: string,
    output: OperatorOutput
  ): Promise<void> {
    try {
      // Create notification message
      let message = 'OPERATOR analysis complete.';
      
      if (output.next_deadline) {
        message = `Next deadline: ${output.next_deadline.name} in ${output.next_deadline.daysRemaining} days.`;
      }

      if (output.conflicts_detected.length > 0) {
        message += ` ${output.conflicts_detected.length} scheduling conflict(s) detected.`;
      }

      if (output.auto_quests.length > 0) {
        message += ` ${output.auto_quests.length} study quest(s) auto-generated.`;
      }

      // Create notification document
      await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'operator',
        title: 'OPERATOR: Life Administration Update',
        message,
        data: output,
        isRead: false,
        timestamp: new Date(),
      });

      console.log('✅ OPERATOR output persisted to notifications');
    } catch (error) {
      console.error('Failed to persist OPERATOR notification:', error);
      // Don't throw - notification persistence failure shouldn't break the agent
    }
  }

  /**
   * Get upcoming deadlines within 7 days
   * 
   * Requirement: 41.4
   */
  private static getUpcomingDeadlines(examDates: Exam[]): Deadline[] {
    const now = new Date();
    const deadlines: Deadline[] = [];

    for (const exam of examDates) {
      const examDate = new Date(exam.date);
      const daysRemaining = this.calculateDaysRemaining(examDate);

      // Only include exams within 7 days and in the future
      if (daysRemaining <= 7 && daysRemaining > 0) {
        deadlines.push({
          name: exam.name,
          date: exam.date,
          daysRemaining,
        });
      }
    }

    // Sort by days remaining (closest first)
    deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return deadlines;
  }

  /**
   * Calculate days remaining until a date
   */
  private static calculateDaysRemaining(targetDate: Date): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day
    
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Detect scheduling conflicts between calendar events
   * 
   * Requirement: 41.5
   */
  private static detectConflicts(events: CalendarEvent[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // Compare each event with every other event
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const start1 = new Date(event1.startTime);
        const end1 = new Date(event1.endTime);
        const start2 = new Date(event2.startTime);
        const end2 = new Date(event2.endTime);

        // Check if events overlap
        if (this.eventsOverlap(start1, end1, start2, end2)) {
          conflicts.push({
            event1: event1.title,
            event2: event2.title,
            conflictTime: start1 > start2 ? event1.startTime : event2.startTime,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two time ranges overlap
   */
  private static eventsOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Auto-generate study quests for upcoming exams
   * 
   * Requirement: 41.6
   */
  private static generateStudyQuests(deadlines: Deadline[]): AutoQuest[] {
    const quests: AutoQuest[] = [];

    for (const deadline of deadlines) {
      quests.push({
        description: `Study for ${deadline.name} (${deadline.daysRemaining} days remaining)`,
        expValue: 10,
        type: 'main',
        energyLevel: 'high',
      });
    }

    return quests;
  }

  /**
   * Generate priority tasks using Gemini API
   * 
   * Requirements: 41.9, 60.1, 60.7
   */
  private static async generatePriorityTasks(
    userInput: string,
    calendarEvents: CalendarEvent[],
    upcomingDeadlines: Deadline[]
  ): Promise<string[]> {
    try {
      // Check cache first (1 hour TTL) - Requirement 60.7
      const cacheKey = `operator:priority:${userInput}`;
      const cached = await CacheService.getCachedGeminiResponse<string[]>(cacheKey);

      if (cached) {
        console.log('✅ Priority tasks served from cache');
        return cached;
      }

      // Call Gemini API - Requirement 60.1
      const priorityTasks = await this.callGeminiForPriorityTasks(
        userInput,
        calendarEvents,
        upcomingDeadlines
      );

      // Cache the result
      await CacheService.cacheGeminiResponse(cacheKey, priorityTasks);

      return priorityTasks;
    } catch (error) {
      console.error('Failed to generate priority tasks:', error);
      
      // Return default priority tasks if Gemini fails
      return this.getDefaultPriorityTasks(upcomingDeadlines);
    }
  }

  /**
   * Call Gemini API to generate priority tasks
   * 
   * Requirement: 60.1
   */
  private static async callGeminiForPriorityTasks(
    userInput: string,
    calendarEvents: CalendarEvent[],
    upcomingDeadlines: Deadline[]
  ): Promise<string[]> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct prompt with cold C-suite executive persona (Requirement 41.1)
    const prompt = this.buildPriorityTasksPrompt(userInput, calendarEvents, upcomingDeadlines);

    // Call Gemini API with exponential backoff (Requirement 60.7)
    const response = await this.callGeminiWithRetry(apiKey, prompt);

    // Parse response
    return this.parsePriorityTasksResponse(response);
  }

  /**
   * Build prompt for priority tasks generation
   * 
   * Requirement: 41.1 (cold C-suite executive persona)
   */
  private static buildPriorityTasksPrompt(
    userInput: string,
    calendarEvents: CalendarEvent[],
    upcomingDeadlines: Deadline[]
  ): string {
    return `You are a cold C-suite executive assistant with zero warmth. Your job is to analyze calendar data and provide priority tasks with brutal efficiency.

User Input: "${userInput}"

Calendar Events:
${calendarEvents.length > 0 ? calendarEvents.map(e => `- ${e.title} (${e.startTime} to ${e.endTime})`).join('\n') : 'No calendar events'}

Upcoming Deadlines (within 7 days):
${upcomingDeadlines.length > 0 ? upcomingDeadlines.map(d => `- ${d.name} in ${d.daysRemaining} days`).join('\n') : 'No upcoming deadlines'}

Respond with EXACTLY 3 priority tasks in JSON format. Be direct, cold, and efficient. No pleasantries.

Format:
{
  "priority_tasks": [
    "Task 1",
    "Task 2",
    "Task 3"
  ]
}`;
  }

  /**
   * Call Gemini API with exponential backoff retry logic
   * 
   * Requirement: 60.7
   */
  private static async callGeminiWithRetry(
    apiKey: string,
    prompt: string,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data: any = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
          throw new Error('No response from Gemini API');
        }

        return generatedText;
      } catch (error) {
        lastError = error as Error;
        console.error(`Gemini API attempt ${attempt + 1} failed:`, error);

        // Exponential backoff: wait 2^attempt seconds
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('Gemini API failed after retries');
  }

  /**
   * Parse Gemini API response to extract priority tasks
   */
  private static parsePriorityTasksResponse(responseText: string): string[] {
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText.trim();

      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
      }

      cleanedText = cleanedText.trim();

      // Parse JSON
      const parsed = JSON.parse(cleanedText);

      if (!parsed.priority_tasks || !Array.isArray(parsed.priority_tasks)) {
        throw new Error('Invalid response format');
      }

      // Return up to 3 tasks
      return parsed.priority_tasks.slice(0, 3);
    } catch (error) {
      console.error('Failed to parse priority tasks response:', error);
      console.error('Response text:', responseText);

      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Get default priority tasks when Gemini fails
   */
  private static getDefaultPriorityTasks(upcomingDeadlines: Deadline[]): string[] {
    const tasks: string[] = [];

    // Add exam preparation tasks
    for (const deadline of upcomingDeadlines.slice(0, 2)) {
      tasks.push(`Prepare for ${deadline.name} (${deadline.daysRemaining} days remaining)`);
    }

    // Add generic task if needed
    if (tasks.length < 3) {
      tasks.push('Review daily schedule and prioritize tasks');
    }

    // Ensure exactly 3 tasks
    while (tasks.length < 3) {
      tasks.push('No additional priority tasks identified');
    }

    return tasks.slice(0, 3);
  }
}
