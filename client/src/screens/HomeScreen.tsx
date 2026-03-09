import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BentoGrid, BentoCard, BentoRow } from '../components/BentoGrid';
import { CountdownTimer } from '../components/CountdownTimer';
import { EXPTracker } from '../components/EXPTracker';
import { HPDisplay } from '../components/HPDisplay';
import { ContributionGrid } from '../components/ContributionGrid';
import { ExamCountdown } from '../components/ExamCountdown';
import { AgentFeedCard } from '../components/AgentFeedCard';
import { GraduationWarRoom } from '../components/GraduationWarRoom';
import { useTransitMode } from '../contexts/TransitModeContext';
import { colors } from '../theme/colors';
import { notificationService } from '../services/NotificationService';
import { useFocusEffect } from '@react-navigation/native';

/**
 * HomeScreen - Player Dashboard
 * 
 * Main dashboard screen using Bento Grid layout.
 * 
 * Requirements:
 * - 68.3: Display Bento dashboard with heatmap, EXP, HP, countdowns, agent feed
 * - 5.1-5.7: Use Bento Grid layout system
 * - 22.7-22.8: Transit Mode UI changes
 * - 37.1: Graduation War Room button
 */
export const HomeScreen: React.FC = () => {
  const [isWarRoomVisible, setIsWarRoomVisible] = useState(false);
  
  // Get Transit Mode state
  // Requirement 22.8: Display "TRANSIT MODE ACTIVE" badge in caution color (#FFB800)
  const { isTransitModeActive } = useTransitMode();

  // Clear notifications when screen is focused
  // Requirement 63.6: Clear notifications when user views relevant content
  useFocusEffect(
    React.useCallback(() => {
      // Clear exam countdown and transit mode notifications when Home screen is viewed
      notificationService.clearNotificationsByType('exam_countdown');
      notificationService.clearNotificationsByType('transit_mode');
      
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  return (
    <ScrollView 
      style={[
        styles.container,
        // Requirement 22.7: Shift surface color to surface-raised (#161616) during Transit Mode
        isTransitModeActive && styles.containerTransitMode
      ]} 
      contentContainerStyle={styles.content}
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.appName}>ZENITH</Text>
        <Text style={styles.tagline}>DEVELOPER OPERATING SYSTEM</Text>
        
        {/* Transit Mode Badge */}
        {/* Requirement 22.8: Display "TRANSIT MODE ACTIVE" badge in caution color (#FFB800) */}
        {isTransitModeActive && (
          <View style={styles.transitModeBadge}>
            <Text style={styles.transitModeBadgeText}>⚡ TRANSIT MODE ACTIVE</Text>
          </View>
        )}
      </View>
      
      {/* Bento Grid Layout - Requirement 68.3 */}
      <BentoGrid gap={16}>
        {/* Large Countdown Card - Requirement 10.1-10.4 */}
        <BentoCard span={12}>
          <CountdownTimer />
        </BentoCard>
        
        {/* EXP Tracker and HP Display Row - Requirement 68.3 */}
        <BentoRow gap={16}>
          <BentoCard span={6}>
            <EXPTracker />
          </BentoCard>
          
          <BentoCard span={6}>
            <HPDisplay />
          </BentoCard>
        </BentoRow>

        {/* Contribution Grid (90-day heatmap) - Requirement 68.3 */}
        <BentoCard span={12}>
          <ContributionGrid 
            onCellTap={(date, dailyEXP, quests) => {
              console.log(`Cell tapped: ${date}, EXP: ${dailyEXP}, Quests: ${quests.length}`);
            }}
          />
        </BentoCard>

        {/* Exam Countdown Widgets (4 courses) - Requirement 68.3 */}
        <BentoCard span={12}>
          <ExamCountdown 
            onExamCritical={(examName, daysRemaining) => {
              console.log(`Exam ${examName} is critical: ${daysRemaining} days remaining`);
              // TODO: Trigger push notification and auto-generate study quests
            }}
          />
        </BentoCard>

        {/* Agent Feed Card - Requirement 68.3 */}
        <BentoCard span={12}>
          <AgentFeedCard maxMessages={3} />
        </BentoCard>

        {/* Graduation War Room Button - Requirement 68.3, 37.1 */}
        <TouchableOpacity
          style={styles.warRoomButton}
          onPress={() => setIsWarRoomVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.warRoomButtonIcon}>🎯</Text>
          <Text style={styles.warRoomButtonText}>GRADUATION WAR ROOM</Text>
          <Text style={styles.warRoomButtonSubtext}>Career Readiness Tracking</Text>
        </TouchableOpacity>
      </BentoGrid>

      {/* Graduation War Room Modal */}
      <GraduationWarRoom
        visible={isWarRoomVisible}
        onClose={() => setIsWarRoomVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void, // Requirement 3.3: void for screen backgrounds
  },
  containerTransitMode: {
    // Requirement 22.7: Shift surface color to surface-raised during Transit Mode
    backgroundColor: colors.surfaceRaised,
  },
  content: {
    padding: 20,
    paddingTop: 50,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.active, // Requirement 3.9: active for interactive elements
    letterSpacing: 8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  transitModeBadge: {
    // Requirement 22.8: Display "TRANSIT MODE ACTIVE" badge in caution color
    backgroundColor: `${colors.caution}20`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.caution, // Requirement 3.10: caution for attention states
    marginTop: 16,
  },
  transitModeBadgeText: {
    color: colors.caution,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  warRoomButton: {
    backgroundColor: colors.surface, // Requirement 3.4: surface for card backgrounds
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.active, // Requirement 3.9: active for interactive elements
    alignItems: 'center',
    marginTop: 8,
  },
  warRoomButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warRoomButtonText: {
    fontSize: 16,
    color: colors.active, // Requirement 3.9: active for interactive elements
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  warRoomButtonSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});
