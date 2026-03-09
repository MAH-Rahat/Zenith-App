import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { databaseManager } from '../services/DatabaseManager';
import { examAlertService } from '../services/ExamAlertService';
import { notificationService } from '../services/NotificationService';

interface Exam {
  id: string;
  name: 'CSE321' | 'CSE341' | 'CSE422' | 'CSE423';
  date: string;
  color: string;
  daysRemaining: number;
  isCritical: boolean;
}

interface ExamCountdownProps {
  onExamCritical?: (examName: string, daysRemaining: number) => void;
}

/**
 * ExamCountdown Component
 * 
 * Displays countdown widgets for four academic exams with color coding and critical alerts.
 * 
 * Requirements:
 * - 20.1: Display 4 widgets for CSE321, CSE341, CSE422, CSE423
 * - 20.2: Assign colors: CSE321 (#00E5FF), CSE341 (#FFB800), CSE422 (#00FF66), CSE423 (#FF2A42)
 * - 20.3: Display days remaining until exam date
 * - 20.4: Calculate days as difference between current date and exam date
 * - 20.5: Persist exam dates to exams table
 * - 21.1: Switch border to alert color (#FF2A42) when 7 days or fewer
 */
export const ExamCountdown: React.FC<ExamCountdownProps> = ({ onExamCritical }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam configuration with colors
  // Requirement 20.2: Assign colors
  const EXAM_CONFIG = [
    { name: 'CSE321' as const, color: '#00E5FF' }, // active color
    { name: 'CSE341' as const, color: '#FFB800' }, // caution color
    { name: 'CSE422' as const, color: '#00FF66' }, // growth color
    { name: 'CSE423' as const, color: '#FF2A42' }, // alert color
  ];

  useEffect(() => {
    initializeExams();
    
    // Update countdown every hour
    const interval = setInterval(() => {
      loadExams();
    }, 3600000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  /**
   * Initialize exams in database if they don't exist
   * Requirement 20.5: Persist exam dates to exams table
   */
  const initializeExams = async () => {
    try {
      await databaseManager.init();
      
      // Check if exams exist
      const existingExams = await databaseManager.query<{ id: string }>(
        'SELECT id FROM exams LIMIT 1'
      );

      if (existingExams.length === 0) {
        // Initialize with default dates (30 days from now for all exams)
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        const dateStr = defaultDate.toISOString().split('T')[0];

        for (const config of EXAM_CONFIG) {
          await databaseManager.insert('exams', {
            id: config.name.toLowerCase(),
            name: config.name,
            date: dateStr,
            color: config.color,
          });
        }
      }

      await loadExams();
      
      // Schedule notifications for all exams
      // Requirement 63.2: Schedule local notifications for exam countdowns
      await scheduleExamNotifications();
    } catch (error) {
      console.error('Failed to initialize exams:', error);
      setLoading(false);
    }
  };

  /**
   * Load exams from database and calculate days remaining
   * Requirement 20.4: Calculate days as difference between current date and exam date
   */
  const loadExams = async () => {
    try {
      const examData = await databaseManager.query<{
        id: string;
        name: 'CSE321' | 'CSE341' | 'CSE422' | 'CSE423';
        date: string;
        color: string;
      }>('SELECT * FROM exams ORDER BY name');

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      const examsWithCountdown: Exam[] = examData.map(exam => {
        const examDate = new Date(exam.date);
        examDate.setHours(0, 0, 0, 0);
        
        // Requirement 20.4: Calculate days remaining
        const daysRemaining = Math.ceil(
          (examDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Requirement 21.1: Check if critical (7 days or fewer)
        const isCritical = daysRemaining <= 7 && daysRemaining >= 0;

        // Trigger critical alert callback if exam just became critical
        if (isCritical && onExamCritical) {
          onExamCritical(exam.name, daysRemaining);
        }

        // Requirement 21.2, 21.3, 21.4: Trigger push notification and auto-generate study quests
        if (isCritical) {
          examAlertService.checkExamCritical(exam.name, daysRemaining);
        }

        return {
          id: exam.id,
          name: exam.name,
          date: exam.date,
          color: exam.color,
          daysRemaining,
          isCritical,
        };
      });

      setExams(examsWithCountdown);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load exams:', error);
      setLoading(false);
    }
  };

  /**
   * Schedule notifications for all exams (7 days before)
   * Requirement 63.2: Schedule local notifications for exam countdowns
   */
  const scheduleExamNotifications = async () => {
    try {
      const examData = await databaseManager.query<{
        id: string;
        name: 'CSE321' | 'CSE341' | 'CSE422' | 'CSE423';
        date: string;
      }>('SELECT id, name, date FROM exams');

      for (const exam of examData) {
        const examDate = new Date(exam.date);
        await notificationService.scheduleExamCountdownNotification(
          exam.name,
          examDate,
          exam.id
        );
      }

      console.log('Exam countdown notifications scheduled for all exams');
    } catch (error) {
      console.error('Failed to schedule exam notifications:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading exams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Requirement 20.1: Display 4 widgets */}
      <View style={styles.grid}>
        {exams.map(exam => (
          <View
            key={exam.id}
            style={[
              styles.examCard,
              {
                // Requirement 21.1: Switch border to alert color when critical
                borderColor: exam.isCritical ? '#FF2A42' : exam.color,
                borderWidth: exam.isCritical ? 2 : 1,
              },
            ]}
          >
            {/* Exam name with color indicator */}
            <View style={styles.examHeader}>
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: exam.color },
                ]}
              />
              <Text style={styles.examName}>{exam.name}</Text>
            </View>

            {/* Days remaining - Requirement 20.3 */}
            <View style={styles.countdownContainer}>
              <Text
                style={[
                  styles.daysNumber,
                  { color: exam.isCritical ? '#FF2A42' : exam.color },
                ]}
              >
                {exam.daysRemaining}
              </Text>
              <Text style={styles.daysLabel}>
                {exam.daysRemaining === 1 ? 'DAY' : 'DAYS'}
              </Text>
            </View>

            {/* Critical alert indicator */}
            {exam.isCritical && exam.daysRemaining >= 0 && (
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalText}>⚠ CRITICAL</Text>
              </View>
            )}

            {/* Exam date */}
            <Text style={styles.examDate}>
              {new Date(exam.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingText: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  examCard: {
    width: '48%',
    backgroundColor: '#0D0D0D', // surface color
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  examName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  daysNumber: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 52,
  },
  daysLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  criticalBadge: {
    backgroundColor: '#FF2A4220',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF2A42',
    alignSelf: 'center',
    marginBottom: 8,
  },
  criticalText: {
    color: '#FF2A42',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  examDate: {
    color: '#666666',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
