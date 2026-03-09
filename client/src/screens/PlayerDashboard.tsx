import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CountdownTimer } from '../components/CountdownTimer';
import { EXPTracker } from '../components/EXPTracker';
import { ContributionGrid } from '../components/ContributionGrid';
import { DailyQuestSystem } from '../components/DailyQuestSystem';
import { SkillTree } from '../components/SkillTree';
import { AnalyticsGraphs } from '../components/AnalyticsGraphs';
import { animationController } from '../services/AnimationController';
import { isNothingPhone as detectNothingPhone } from '../utils/deviceDetection';

export const PlayerDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<7 | 30 | 60 | 90>(30);
  const [isNothingPhone, setIsNothingPhone] = useState(false);
  const expTrackerRef = useRef<any>(null);

  useEffect(() => {
    // Detect device on mount
    setIsNothingPhone(detectNothingPhone());
  }, []);

  const handleQuestComplete = (questId: string, expValue: number) => {
    // Award EXP
    console.log(`Quest ${questId} completed, awarding ${expValue} EXP`);
    
    // Trigger haptic feedback
    animationController.triggerHapticFeedback();
    
    // Mark day as active in contribution grid
    // This will be handled via the onEXPChange callback
  };

  const handleSkillComplete = (skillId: string) => {
    console.log(`Skill ${skillId} completed`);
    
    // Trigger unlock animation
    animationController.playSkillUnlockAnimation();
    
    // Trigger haptic feedback
    animationController.triggerHapticFeedback();
  };

  const handleEXPChange = (newTotal: number, dailyTotal: number) => {
    console.log(`EXP updated: Total ${newTotal}, Daily ${dailyTotal}`);
    
    // Mark today as active if we have any EXP
    if (dailyTotal > 0) {
      // This will be handled by the ContributionGrid component
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <CountdownTimer />
      
      <EXPTracker onEXPChange={handleEXPChange} />
      
      <AnalyticsGraphs />
      
      <ContributionGrid
        timeRange={timeRange}
        onTimeRangeChange={(range) => setTimeRange(range as 7 | 30 | 60 | 90)}
        isNothingPhone={isNothingPhone}
      />
      
      <DailyQuestSystem onQuestComplete={handleQuestComplete} />
      
      <SkillTree onSkillComplete={handleSkillComplete} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    padding: 16,
  },
});
