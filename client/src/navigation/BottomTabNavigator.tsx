/**
 * Bottom Tab Navigator
 * 
 * Requirements: 63.5, 68.1, 68.2, 68.8, 68.9
 * 
 * Displays bottom tab bar with exactly 5 tabs:
 * - HOME: Bento dashboard with heatmap, EXP, HP, countdowns, agent feed
 * - QUESTS: Daily quest list, Fog Mode FAB, energy categorization
 * - SKILLS: Circuit board, phase progress, proof-of-work submissions
 * - ACTIVITY: Flashcards, Bug Grimoire, Pomodoro, exam radar
 * - SETTINGS: API key management, Transit Mode override, export/import, PoW Compiler
 * 
 * Design:
 * - Active tab: #00E5FF (colors.active)
 * - Unselected tabs: #1F1F1F (colors.border)
 * - Background: #000000 (colors.void)
 * - Zero shadows (Neon Brutalist design rule)
 * - 1px border on top
 * - Minimum 44×44dp touch targets for accessibility
 * - Badge count on Activity tab for due flashcards (Requirement 63.5)
 */

import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, Text } from 'react-native';
import { colors } from '../theme/colors';
import { HomeScreen } from '../screens/HomeScreen';
import { QuestsScreen } from '../screens/QuestsScreen';
import { SkillsScreen } from '../screens/SkillsScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { databaseManager } from '../services/DatabaseManager';

const Tab = createBottomTabNavigator();

/**
 * Custom tab bar label component
 * Uses DM Sans font (professional typography requirement)
 */
const TabLabel = ({ focused, label }: { focused: boolean; label: string }) => (
  <Text
    style={[
      styles.tabLabel,
      { color: focused ? colors.active : colors.border }
    ]}
  >
    {label}
  </Text>
);

/**
 * Custom tab bar indicator (dot above label)
 */
const TabIndicator = ({ focused }: { focused: boolean }) => (
  <View
    style={[
      styles.tabIndicator,
      { backgroundColor: focused ? colors.active : 'transparent' }
    ]}
  />
);

/**
 * Badge component for Activity tab
 * Requirement 63.5: Display notification badge counts on Activity tab
 */
const ActivityBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

/**
 * Bottom Tab Navigator Component
 * 
 * Requirement 68.1: Display bottom tab bar with exactly 5 tabs
 * Requirement 68.2: Tabs labeled: HOME, QUESTS, SKILLS, ACTIVITY, SETTINGS
 * Requirement 68.8: Use active color (#00E5FF) for selected tab
 * Requirement 68.9: Use border color (#1F1F1F) for unselected tabs
 * Requirement 63.5: Display notification badge counts on Activity tab
 */
export const BottomTabNavigator = () => {
  const [activityBadgeCount, setActivityBadgeCount] = useState(0);

  useEffect(() => {
    // Load initial badge count
    loadActivityBadgeCount();

    // Update badge count every 5 minutes
    const interval = setInterval(() => {
      loadActivityBadgeCount();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  /**
   * Load badge count for Activity tab (due flashcards)
   * Requirement 63.5: Display notification badge counts on Activity tab
   */
  const loadActivityBadgeCount = async () => {
    try {
      await databaseManager.init();
      
      // Count due flashcards (cards where nextReviewDate <= today)
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const todayStr = today.toISOString();

      const result = await databaseManager.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM flashcards WHERE nextReviewDate <= ?',
        [todayStr]
      );

      const count = result.length > 0 ? result[0].count : 0;
      setActivityBadgeCount(count);
    } catch (error) {
      console.error('Failed to load activity badge count:', error);
      setActivityBadgeCount(0);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.border,
        tabBarShowLabel: false, // We use custom labels
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabContent}>
              <TabIndicator focused={focused} />
              <TabLabel focused={focused} label="HOME" />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Quests"
        component={QuestsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabContent}>
              <TabIndicator focused={focused} />
              <TabLabel focused={focused} label="QUESTS" />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Skills"
        component={SkillsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabContent}>
              <TabIndicator focused={focused} />
              <TabLabel focused={focused} label="SKILLS" />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabContent}>
              <TabIndicator focused={focused} />
              <View style={styles.labelWithBadge}>
                <TabLabel focused={focused} label="ACTIVITY" />
                <ActivityBadge count={activityBadgeCount} />
              </View>
            </View>
          ),
        }}
        listeners={{
          focus: () => {
            // Refresh badge count when Activity tab is focused
            // Requirement 63.6: Clear notifications when user views relevant content
            loadActivityBadgeCount();
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabContent}>
              <TabIndicator focused={focused} />
              <TabLabel focused={focused} label="SETTINGS" />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.void, // Requirement: void (#000000) for tab bar background
    borderTopColor: colors.border, // Requirement: 1px border
    borderTopWidth: 1,
    height: 70, // Ensures minimum 44×44dp touch targets
    paddingBottom: 10,
    paddingTop: 10,
    elevation: 0, // Zero shadow design rule
    shadowOpacity: 0, // Zero shadow design rule
  },
  tabItem: {
    paddingVertical: 8,
    minHeight: 44, // Accessibility: minimum 44×44dp touch target
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44, // Accessibility: minimum 44×44dp touch target
    minWidth: 44, // Accessibility: minimum 44×44dp touch target
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    // DM Sans font will be applied via font loader
  },
  labelWithBadge: {
    position: 'relative',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -16,
    backgroundColor: colors.alert, // #FF2A42
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.void,
  },
  badgeText: {
    color: colors.void,
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
