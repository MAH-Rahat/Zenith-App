import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashcardEngine } from '../components/FlashcardEngine';
import { BugGrimoire } from '../components/BugGrimoire';
import { PomodoroEnforcer } from '../components/PomodoroEnforcer';

type TabType = 'bugs' | 'flashcards' | 'pomodoro' | 'exams';

export const ActivityScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('bugs');

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
        >
          <Text style={[styles.tabText, activeTab === 'bugs' && styles.tabTextActive]}>BUGS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'flashcards' && styles.tabActive]}
          onPress={() => setActiveTab('flashcards')}
        >
          <Text style={[styles.tabText, activeTab === 'flashcards' && styles.tabTextActive]}>CARDS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pomodoro' && styles.tabActive]}
          onPress={() => setActiveTab('pomodoro')}
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
    backgroundColor: '#000000',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
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
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  tabActive: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  tabText: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#000000',
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
    color: '#333333',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#1a1a1a',
    textAlign: 'center',
  },
});
