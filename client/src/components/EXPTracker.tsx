/**
 * EXPTracker.tsx
 * 
 * Dashboard component displaying user progression stats with smooth animations.
 * Integrates with EXPSystem and uses React Native Reanimated 3 for 60fps animations.
 * 
 * Requirements: 7.5, 9.4, 9.5, 71.1, 77.1, 77.2
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { expSystem } from '../services/EXPSystem';

// Neon Brutalist Design System Colors
const COLORS = {
  void: '#000000',
  surface: '#0D0D0D',
  surfaceRaised: '#161616',
  border: '#1F1F1F',
  growth: '#00FF66',
  alert: '#FF2A42',
  active: '#00E5FF',
  caution: '#FFB800',
  disabled: '#888888',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
};

interface EXPTrackerProps {
  onEXPChange?: (newTotal: number, dailyTotal: number, level: number, rank: string) => void;
  onLevelUp?: (newLevel: number, newRank: string) => void;
}

export const EXPTracker: React.FC<EXPTrackerProps> = ({ onEXPChange, onLevelUp }) => {
  const [totalEXP, setTotalEXP] = useState(0);
  const [dailyEXP, setDailyEXP] = useState(0);
  const [level, setLevel] = useState(0);
  const [rank, setRank] = useState('Script Novice');
  const [expChange, setExpChange] = useState<number | null>(null);

  // Animated values using Reanimated 3
  const progressWidth = useSharedValue(0);
  const expChangeOpacity = useSharedValue(0);
  const expChangeScale = useSharedValue(0.5);
  const expChangeTranslateY = useSharedValue(0);
  const levelUpScale = useSharedValue(1);
  const levelUpOpacity = useSharedValue(1);

  useEffect(() => {
    loadUserProfile();

    // Subscribe to EXP changes from EXPSystem
    const unsubscribe = expSystem.addListener((data) => {
      handleEXPChange(data);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const loadUserProfile = async (): Promise<void> => {
    try {
      const profile = await expSystem.getUserProfile();
      
      if (profile) {
        setTotalEXP(profile.totalEXP);
        setDailyEXP(profile.dailyEXP);
        setLevel(profile.level);
        setRank(profile.rank);

        // Calculate and animate progress bar
        const progress = expSystem.getLevelProgress(profile.totalEXP);
        progressWidth.value = withTiming(progress, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const handleEXPChange = (data: {
    totalEXP: number;
    dailyEXP: number;
    level: number;
    rank: string;
    leveledUp: boolean;
    rankChanged: boolean;
  }): void => {
    const oldLevel = level;
    const oldRank = rank;
    const expDifference = data.totalEXP - totalEXP;

    // Update state
    setTotalEXP(data.totalEXP);
    setDailyEXP(data.dailyEXP);
    setLevel(data.level);
    setRank(data.rank);

    // Show EXP change indicator
    if (expDifference !== 0) {
      setExpChange(expDifference);
      animateEXPChange();

      // Hide EXP change indicator after animation
      setTimeout(() => {
        setExpChange(null);
      }, 2000);
    }

    // Animate progress bar
    const progress = expSystem.getLevelProgress(data.totalEXP);
    progressWidth.value = withSpring(progress, {
      damping: 15,
      stiffness: 100,
    });

    // Trigger level-up animation if level changed
    if (data.leveledUp) {
      animateLevelUp();
      onLevelUp?.(data.level, data.rank);
    }

    // Notify parent component
    onEXPChange?.(data.totalEXP, data.dailyEXP, data.level, data.rank);
  };

  const updateEXPDisplay = async (amount: number): Promise<void> => {
    try {
      const profile = await expSystem.getUserProfile();
      
      if (profile) {
        const oldLevel = level;
        const oldRank = rank;

        setTotalEXP(profile.totalEXP);
        setDailyEXP(profile.dailyEXP);
        setLevel(profile.level);
        setRank(profile.rank);

        // Show EXP change indicator
        setExpChange(amount);
        animateEXPChange();

        // Animate progress bar
        const progress = expSystem.getLevelProgress(profile.totalEXP);
        progressWidth.value = withSpring(progress, {
          damping: 15,
          stiffness: 100,
        });

        // Trigger level-up animation if level changed
        if (profile.level > oldLevel) {
          animateLevelUp();
          onLevelUp?.(profile.level, profile.rank);
        }

        // Notify parent component
        onEXPChange?.(profile.totalEXP, profile.dailyEXP, profile.level, profile.rank);

        // Hide EXP change indicator after animation
        setTimeout(() => {
          setExpChange(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to update EXP display:', error);
    }
  };

  const animateEXPChange = (): void => {
    // Reset values
    expChangeOpacity.value = 0;
    expChangeScale.value = 0.5;
    expChangeTranslateY.value = 0;

    // Animate in and up
    expChangeOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1400 }),
      withTiming(0, { duration: 400 })
    );

    expChangeScale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
    });

    expChangeTranslateY.value = withTiming(-30, {
      duration: 2000,
      easing: Easing.out(Easing.cubic),
    });
  };

  const animateLevelUp = (): void => {
    // Pulse animation for level-up
    levelUpScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );

    levelUpOpacity.value = withSequence(
      withTiming(0.5, { duration: 150 }),
      withTiming(1, { duration: 150 }),
      withTiming(0.5, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
  };

  // Animated styles
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const expChangeStyle = useAnimatedStyle(() => ({
    opacity: expChangeOpacity.value,
    transform: [
      { scale: expChangeScale.value },
      { translateY: expChangeTranslateY.value },
    ],
  }));

  const levelUpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelUpScale.value }],
    opacity: levelUpOpacity.value,
  }));

  const expToNextLevel = expSystem.getEXPForNextLevel(level);
  const currentLevelEXP = level * 100;
  const progressEXP = totalEXP - currentLevelEXP;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>EXP TRACKER</Text>
        <Animated.View style={levelUpStyle}>
          <Text style={styles.rank}>{rank}</Text>
        </Animated.View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>LEVEL</Text>
          <Animated.Text style={[styles.statValue, levelUpStyle]}>
            {level}
          </Animated.Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>TOTAL EXP</Text>
          <Text style={styles.statValue}>{totalEXP}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>DAILY EXP</Text>
          <Text style={[styles.statValue, styles.dailyEXP]}>{dailyEXP}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {progressEXP} / {expToNextLevel - currentLevelEXP} EXP
          </Text>
          <Text style={styles.progressLabel}>LEVEL {level + 1}</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, progressBarStyle]} />
        </View>
      </View>

      {/* EXP Change Indicator */}
      {expChange !== null && (
        <Animated.View style={[styles.expChangeContainer, expChangeStyle]}>
          <Text
            style={[
              styles.expChangeText,
              expChange > 0 ? styles.expPositive : styles.expNegative,
            ]}
          >
            {expChange > 0 ? '+' : ''}{expChange} EXP
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

// Export method for external EXP updates
export const updateEXPTrackerDisplay = async (amount: number): Promise<void> => {
  // This will be called after EXP is awarded via expSystem
  // The component will refresh via loadUserProfile or updateEXPDisplay
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  rank: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.active,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: 'JetBrains Mono',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  dailyEXP: {
    color: COLORS.growth,
  },
  progressSection: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.growth,
  },
  expChangeContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
  },
  expChangeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    fontWeight: '700',
  },
  expPositive: {
    color: COLORS.growth,
    borderColor: COLORS.growth,
  },
  expNegative: {
    color: COLORS.alert,
    borderColor: COLORS.alert,
  },
});
