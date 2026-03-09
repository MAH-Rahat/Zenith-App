import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { OperatorAgent, CalendarEvent, Exam, OperatorInput } from '../services/agents/OperatorAgent';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Notification } from '../models/Notification';

/**
 * OPERATOR Agent Unit Tests
 * 
 * Tests calendar parsing, conflict detection, and auto-quest generation
 * Requirements: 41.4, 41.5, 41.6
 */

describe('OPERATOR Agent', () => {
  beforeAll(async () => {
    // Connect to database only
    await connectDatabase();
  }, 5000);

  afterAll(async () => {
    // Cleanup database connection
    await disconnectDatabase();
  });

  describe('Calendar Parsing', () => {
    it('should parse calendar events correctly', async () => {
      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'What are my upcoming tasks?',
        calendarEvents: [
          {
            id: '1',
            title: 'Team Meeting',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
          {
            id: '2',
            title: 'Project Review',
            startTime: '2024-01-15T14:00:00Z',
            endTime: '2024-01-15T15:00:00Z',
          },
        ],
        examDates: [],
      };

      const result = await OperatorAgent.process(input);

      expect(result).toBeDefined();
      expect(result.priority_tasks).toBeDefined();
      expect(Array.isArray(result.priority_tasks)).toBe(true);
    });

    it('should hard-block 17:00-22:00 for tuition commitments', async () => {
      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'Show my schedule',
        calendarEvents: [],
        examDates: [],
      };

      const result = await OperatorAgent.process(input);

      expect(result.calendar_blocks).toBeDefined();
      expect(result.calendar_blocks.length).toBeGreaterThan(0);
      
      const tutionBlock = result.calendar_blocks[0];
      expect(tutionBlock.startTime).toBe('17:00');
      expect(tutionBlock.endTime).toBe('22:00');
      expect(tutionBlock.reason).toContain('Tuition');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect overlapping calendar events', async () => {
      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'Check for conflicts',
        calendarEvents: [
          {
            id: '1',
            title: 'Meeting A',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
          {
            id: '2',
            title: 'Meeting B',
            startTime: '2024-01-15T10:30:00Z',
            endTime: '2024-01-15T11:30:00Z',
          },
        ],
        examDates: [],
      };

      const result = await OperatorAgent.process(input);

      expect(result.conflicts_detected).toBeDefined();
      expect(result.conflicts_detected.length).toBeGreaterThan(0);
      
      const conflict = result.conflicts_detected[0];
      expect(conflict.event1).toBe('Meeting A');
      expect(conflict.event2).toBe('Meeting B');
    });

    it('should not detect conflicts for non-overlapping events', async () => {
      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'Check for conflicts',
        calendarEvents: [
          {
            id: '1',
            title: 'Meeting A',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
          {
            id: '2',
            title: 'Meeting B',
            startTime: '2024-01-15T12:00:00Z',
            endTime: '2024-01-15T13:00:00Z',
          },
        ],
        examDates: [],
      };

      const result = await OperatorAgent.process(input);

      expect(result.conflicts_detected).toBeDefined();
      expect(result.conflicts_detected.length).toBe(0);
    });

    it('should detect conflicts for events starting at the same time', async () => {
      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'Check for conflicts',
        calendarEvents: [
          {
            id: '1',
            title: 'Event A',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
          {
            id: '2',
            title: 'Event B',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
        ],
        examDates: [],
      };

      const result = await OperatorAgent.process(input);

      expect(result.conflicts_detected).toBeDefined();
      expect(result.conflicts_detected.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-Quest Generation', () => {
    it('should auto-generate study quests for exams within 7 days', async () => {
      const today = new Date();
      const examIn5Days = new Date(today);
      examIn5Days.setDate(today.getDate() + 5);

      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'What should I study?',
        calendarEvents: [],
        examDates: [
          {
            id: '1',
            name: 'CSE321 Midterm',
            date: examIn5Days.toISOString(),
          },
        ],
      };

      const result = await OperatorAgent.process(input);

      expect(result.auto_quests).toBeDefined();
      expect(result.auto_quests.length).toBeGreaterThan(0);
      
      const quest = result.auto_quests[0];
      expect(quest.description).toContain('CSE321 Midterm');
      expect(quest.description).toContain('5 days');
      expect(quest.type).toBe('main');
      expect(quest.energyLevel).toBe('high');
      expect(quest.expValue).toBe(10);
    });

    it('should not generate quests for exams beyond 7 days', async () => {
      const today = new Date();
      const examIn10Days = new Date(today);
      examIn10Days.setDate(today.getDate() + 10);

      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'What should I study?',
        calendarEvents: [],
        examDates: [
          {
            id: '1',
            name: 'CSE341 Final',
            date: examIn10Days.toISOString(),
          },
        ],
      };

      const result = await OperatorAgent.process(input);

      expect(result.auto_quests).toBeDefined();
      expect(result.auto_quests.length).toBe(0);
    });

    it('should not generate quests for past exams', async () => {
      const today = new Date();
      const examYesterday = new Date(today);
      examYesterday.setDate(today.getDate() - 1);

      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'What should I study?',
        calendarEvents: [],
        examDates: [
          {
            id: '1',
            name: 'CSE422 Quiz',
            date: examYesterday.toISOString(),
          },
        ],
      };

      const result = await OperatorAgent.process(input);

      expect(result.auto_quests).toBeDefined();
      expect(result.auto_quests.length).toBe(0);
    });

    it('should generate multiple quests for multiple upcoming exams', async () => {
      const today = new Date();
      const exam1 = new Date(today);
      exam1.setDate(today.getDate() + 3);
      const exam2 = new Date(today);
      exam2.setDate(today.getDate() + 6);

      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'What should I study?',
        calendarEvents: [],
        examDates: [
          {
            id: '1',
            name: 'CSE321 Midterm',
            date: exam1.toISOString(),
          },
          {
            id: '2',
            name: 'CSE341 Quiz',
            date: exam2.toISOString(),
          },
        ],
      };

      const result = await OperatorAgent.process(input);

      expect(result.auto_quests).toBeDefined();
      expect(result.auto_quests.length).toBe(2);
    });
  });

  describe('Deadline Tracking', () => {
    it('should surface next deadline within 7 days', async () => {
      const today = new Date();
      const examIn3Days = new Date(today);
      examIn3Days.setDate(today.getDate() + 3);

      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'What is my next deadline?',
        calendarEvents: [],
        examDates: [
          {
            id: '1',
            name: 'CSE423 Assignment',
            date: examIn3Days.toISOString(),
          },
        ],
      };

      const result = await OperatorAgent.process(input);

      expect(result.next_deadline).toBeDefined();
      expect(result.next_deadline).not.toBeNull();
      expect(result.next_deadline!.name).toBe('CSE423 Assignment');
      expect(result.next_deadline!.daysRemaining).toBe(3);
    });

    it('should return null when no deadlines within 7 days', async () => {
      const today = new Date();
      const examIn15Days = new Date(today);
      examIn15Days.setDate(today.getDate() + 15);

      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'What is my next deadline?',
        calendarEvents: [],
        examDates: [
          {
            id: '1',
            name: 'CSE422 Project',
            date: examIn15Days.toISOString(),
          },
        ],
      };

      const result = await OperatorAgent.process(input);

      expect(result.next_deadline).toBeNull();
    });

    it('should return closest deadline when multiple exist', async () => {
      const today = new Date();
      const exam1 = new Date(today);
      exam1.setDate(today.getDate() + 2);
      const exam2 = new Date(today);
      exam2.setDate(today.getDate() + 5);

      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'What is my next deadline?',
        calendarEvents: [],
        examDates: [
          {
            id: '1',
            name: 'CSE341 Quiz',
            date: exam2.toISOString(),
          },
          {
            id: '2',
            name: 'CSE321 Lab',
            date: exam1.toISOString(),
          },
        ],
      };

      const result = await OperatorAgent.process(input);

      expect(result.next_deadline).toBeDefined();
      expect(result.next_deadline).not.toBeNull();
      expect(result.next_deadline!.name).toBe('CSE321 Lab');
      expect(result.next_deadline!.daysRemaining).toBe(2);
    });
  });

  describe('Output Structure', () => {
    it('should return all required output fields', async () => {
      const input: OperatorInput = {
        userId: 'test-user-id',
        userInput: 'Analyze my schedule',
        calendarEvents: [],
        examDates: [],
      };

      const result = await OperatorAgent.process(input);

      expect(result).toBeDefined();
      expect(result.priority_tasks).toBeDefined();
      expect(result.conflicts_detected).toBeDefined();
      expect(result.calendar_blocks).toBeDefined();
      expect(result.next_deadline).toBeDefined();
      expect(result.auto_quests).toBeDefined();
      
      expect(Array.isArray(result.priority_tasks)).toBe(true);
      expect(Array.isArray(result.conflicts_detected)).toBe(true);
      expect(Array.isArray(result.calendar_blocks)).toBe(true);
      expect(Array.isArray(result.auto_quests)).toBe(true);
    });
  });

  describe('Notification Persistence', () => {
    it('should persist output to notifications table', async () => {
      const today = new Date();
      const examIn5Days = new Date(today);
      examIn5Days.setDate(today.getDate() + 5);

      const input: OperatorInput = {
        userId: 'test-user-id-notification',
        userInput: 'Check my schedule',
        calendarEvents: [],
        examDates: [
          {
            id: '1',
            name: 'CSE321 Exam',
            date: examIn5Days.toISOString(),
          },
        ],
      };

      await OperatorAgent.process(input);

      // Wait a bit for async notification creation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Query notifications
      const notifications = await Notification.find({
        userId: 'test-user-id-notification',
        type: 'operator',
      }).sort({ timestamp: -1 }).limit(1);

      expect(notifications.length).toBeGreaterThan(0);
      
      const notification = notifications[0];
      expect(notification.type).toBe('operator');
      expect(notification.title).toContain('OPERATOR');
      expect(notification.data).toBeDefined();
      expect(notification.data.auto_quests).toBeDefined();
    });
  });
});
