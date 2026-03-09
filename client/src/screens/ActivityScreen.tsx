import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashcardEngine } from '../components/FlashcardEngine';
import { BugGrimoire } from '../components/BugGrimoire';
import { PomodoroEnforcer } from '../components/PomodoroEnforcer';
import { colors } from '../theme/colors';
import { notificationService } from '../services/NotificationService';
import { useFocusEffect } from '@react-navigation/native';

/**
 * ActivityScreen Component
 * 
 * Requirements: 68.6, 63.5
 * 
 * Displays:
 * - Flashcard Engine (Leitner algorithm spaced repetition)
 * - Bug Grimoire (personal engineering knowledge base)
 * - Pomodoro Enforcer (25-minute focus timer)
 * - Exam radar (countdown widgets)
 * - Notification badge counts on tab
 * 
 * Design System:
 * - Neon Brutalist aesthetic with zero shadows
 * - Color tokens from theme/colors.ts
 * - DM Sans for UI text, JetBrains Mono for data
 * - 1px borders, 20px border radius
 * - Minimum 44×44dp touch targets
 */

type TabType = 'bugs' | 'flashcards' | 'pomodoro';

export const ActivityScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('bugs');

  // Clear notifications when screen is focused
  // Requirement 63.6: Clear notifications when user views relevant content
  useFocusEffect(
    React.useCallback(() => {
      // Clear weekly reflection notifications when Activity screen is viewed
      notificationService.clearNotificationsByType('weekly_reflection');
      
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  useEffect(() => {
    if (activeTab === 'bugs') {
      // Bug Grimoire component handles its own data loading
    }
  }, [activeTab]);

  const renderBugGrimoire = () => (
    <View style={styles.tabContent}>
      <BugGrimoire />
    </View>
  );

  const renderFlashcards = () => (
    <View style={styles.tabContent}>
      <FlashcardEngine />
    </View>
  );

  const renderPomodoro = () => (
    <PomodoroEnforcer />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ACTIVITY</Text>
        <Text style={styles.subtitle}>TOOLS & TRACKING</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bugs' && styles.tabActive]}
          onPress={() => setActiveTab('bugs')}
          accessible={true}
          accessibilityLabel="Bug Grimoire"
          accessibilityRole="button"
        >
          <Text style={[styles.tabText, activeTab === 'bugs' && styles.tabTextActive]}>BUGS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'flashcards' && styles.tabActive]}
          onPress={() => setActiveTab('flashcards')}
          accessible={true}
          accessibilityLabel="Flashcards"
          accessibilityRole="button"
        >
          <Text style={[styles.tabText, activeTab === 'flashcards' && styles.tabTextActive]}>CARDS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pomodoro' && styles.tabActive]}
          onPress={() => setActiveTab('pomodoro')}
          accessible={true}
          accessibilityLabel="Pomodoro Timer"
          accessibilityRole="button"
        >
          <Text style={[styles.tabText, activeTab === 'pomodoro' && styles.tabTextActive]}>TIMER</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'bugs' && renderBugGrimoire()}
      {activeTab === 'flashcards' && renderFlashcards()}
      {activeTab === 'pomodoro' && renderPomodoro()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void, // Pure black screen background
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text, // White text
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textSecondary, // Gray text for secondary content
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.surface, // Dark gray card background
    borderRadius: 20, // Bento grid 20px border radius
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border, // 1px border
    minHeight: 44, // Minimum 44dp touch target
  },
  tabActive: {
    backgroundColor: colors.active, // Neon cyan for active state
    borderColor: colors.active,
  },
  tabText: {
    color: colors.textSecondary, // Gray for inactive tabs
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: colors.void, // Black text on neon background
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.disabled,
    textAlign: 'center',
  },
});
