import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WeeklyReflectionProps, WeeklyReflection as WeeklyReflectionType } from '../types';
import { databaseManager } from '../services/DatabaseManager';
import { apiClient } from '../services/apiClient';

/**
 * WeeklyReflection Component
 * 
 * Requirements: 39.1, 39.2, 39.3, 39.4
 * 
 * Displays exactly 5 structured questions for weekly reflection:
 * 1. What did you accomplish this week?
 * 2. What tasks did you avoid?
 * 3. What did you learn?
 * 4. What challenges did you face?
 * 5. What are your priorities for next week?
 * 
 * Submits responses to ARCHITECT agent for analysis
 * Triggered at 20:00 on Sunday
 */
export const WeeklyReflection: React.FC<WeeklyReflectionProps> = ({ onSubmit, onClose }) => {
  const [accomplishments, setAccomplishments] = useState('');
  const [avoidedTasks, setAvoidedTasks] = useState('');
  const [learning, setLearning] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextWeekPriorities, setNextWeekPriorities] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Calculate week start and end dates (Sunday to Saturday)
   */
  const getWeekDates = () => {
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
  };

  /**
   * Calculate EXP delta from previous week
   * Requirements: 39.6
   */
  const calculateExpDelta = async (): Promise<number> => {
    try {
      const { weekStart, weekEnd } = getWeekDates();
      
      // Get current week EXP
      const currentWeekQuests = await databaseManager.query<{ expValue: number }>(
        `SELECT expValue FROM quests 
         WHERE isComplete = 1 
         AND completedAt >= ? 
         AND completedAt <= ?`,
        [weekStart, weekEnd]
      );
      
      const currentWeekExp = currentWeekQuests.reduce((sum, q) => sum + q.expValue, 0);
      
      // Get previous week EXP
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      
      const prevWeekEnd = new Date(weekEnd);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
      
      const prevWeekQuests = await databaseManager.query<{ expValue: number }>(
        `SELECT expValue FROM quests 
         WHERE isComplete = 1 
         AND completedAt >= ? 
         AND completedAt <= ?`,
        [prevWeekStart.toISOString(), prevWeekEnd.toISOString()]
      );
      
      const prevWeekExp = prevWeekQuests.reduce((sum, q) => sum + q.expValue, 0);
      
      return currentWeekExp - prevWeekExp;
    } catch (error) {
      console.error('Failed to calculate EXP delta:', error);
      return 0;
    }
  };

  /**
   * Submit reflection to ARCHITECT agent
   * Requirements: 39.4, 39.5, 39.6, 39.7
   */
  const handleSubmit = async () => {
    // Validate all fields are filled
    if (!accomplishments.trim() || !avoidedTasks.trim() || !learning.trim() || 
        !challenges.trim() || !nextWeekPriorities.trim()) {
      Alert.alert('Incomplete Reflection', 'Please answer all 5 questions before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { weekStart, weekEnd } = getWeekDates();
      const expDelta = await calculateExpDelta();

      // Submit to ARCHITECT agent for analysis
      const architectResponse = await apiClient.post('/api/agents/architect/weekly-reflection', {
        accomplishments,
        avoided_tasks: avoidedTasks,
        learning,
        challenges,
        next_week_priorities: nextWeekPriorities,
        exp_delta: expDelta,
      });

      const architectReport = architectResponse.data.report;

      // Persist reflection and report to database
      const reflectionId = `reflection_${Date.now()}`;
      const now = new Date().toISOString();

      await databaseManager.insert('weekly_reflections', {
        id: reflectionId,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        accomplishments,
        avoided_tasks: avoidedTasks,
        learning,
        challenges,
        next_week_priorities: nextWeekPriorities,
        architect_report: JSON.stringify(architectReport),
        exp_delta: expDelta,
        createdAt: now,
        updatedAt: now,
      });

      const reflection: WeeklyReflectionType = {
        id: reflectionId,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        accomplishments,
        avoided_tasks: avoidedTasks,
        learning,
        challenges,
        next_week_priorities: nextWeekPriorities,
        architect_report: JSON.stringify(architectReport),
        exp_delta: expDelta,
        createdAt: now,
        updatedAt: now,
      };

      // Show success message with ARCHITECT report
      Alert.alert(
        'Weekly Growth Report',
        `${architectReport.what_shipped}\n\n${architectReport.what_avoided}\n\nEXP Delta: ${expDelta > 0 ? '+' : ''}${expDelta}\n\nHard Truth: ${architectReport.hard_truth}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSubmit?.(reflection);
              onClose?.();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit weekly reflection:', error);
      Alert.alert(
        'Submission Failed',
        'Failed to generate Weekly Growth Report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <View className="flex-1 bg-void">
        {/* Header */}
        <View className="px-4 pt-12 pb-4 border-b border-border">
          <Text className="text-2xl font-bold text-white mb-2">Weekly Reflection</Text>
          <Text className="text-sm text-void-text">
            Answer all 5 questions to receive your Weekly Growth Report from ARCHITECT
          </Text>
        </View>

        <ScrollView className="flex-1 px-4 py-6">
          {/* Question 1: Accomplishments */}
          <View className="mb-6">
            <Text className="text-white font-semibold mb-2">
              1. What did you accomplish this week?
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-lg p-4 text-white min-h-[100px]"
              placeholder="List your wins, completed projects, skills learned..."
              placeholderTextColor="#888888"
              multiline
              value={accomplishments}
              onChangeText={setAccomplishments}
              editable={!isSubmitting}
            />
          </View>

          {/* Question 2: Avoided Tasks */}
          <View className="mb-6">
            <Text className="text-white font-semibold mb-2">
              2. What tasks did you avoid?
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-lg p-4 text-white min-h-[100px]"
              placeholder="Be honest about what you procrastinated on..."
              placeholderTextColor="#888888"
              multiline
              value={avoidedTasks}
              onChangeText={setAvoidedTasks}
              editable={!isSubmitting}
            />
          </View>

          {/* Question 3: Learning */}
          <View className="mb-6">
            <Text className="text-white font-semibold mb-2">
              3. What did you learn?
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-lg p-4 text-white min-h-[100px]"
              placeholder="New concepts, technologies, insights..."
              placeholderTextColor="#888888"
              multiline
              value={learning}
              onChangeText={setLearning}
              editable={!isSubmitting}
            />
          </View>

          {/* Question 4: Challenges */}
          <View className="mb-6">
            <Text className="text-white font-semibold mb-2">
              4. What challenges did you face?
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-lg p-4 text-white min-h-[100px]"
              placeholder="Technical blockers, time management issues, etc..."
              placeholderTextColor="#888888"
              multiline
              value={challenges}
              onChangeText={setChallenges}
              editable={!isSubmitting}
            />
          </View>

          {/* Question 5: Next Week Priorities */}
          <View className="mb-6">
            <Text className="text-white font-semibold mb-2">
              5. What are your priorities for next week?
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-lg p-4 text-white min-h-[100px]"
              placeholder="Top 3-5 goals for the upcoming week..."
              placeholderTextColor="#888888"
              multiline
              value={nextWeekPriorities}
              onChangeText={setNextWeekPriorities}
              editable={!isSubmitting}
            />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="px-4 pb-8 pt-4 border-t border-border">
          <TouchableOpacity
            className="bg-active border border-active rounded-lg py-4 mb-3"
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-center font-semibold">
                Submit to ARCHITECT
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-surface border border-border rounded-lg py-4"
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text className="text-void-text text-center font-semibold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
