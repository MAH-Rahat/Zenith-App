import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';

export const CountdownTimer: React.FC = () => {
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    calculateDaysRemaining();

    // Update on app state change
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Update at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimer = setTimeout(() => {
      calculateDaysRemaining();
      // Set up daily interval
      const dailyInterval = setInterval(calculateDaysRemaining, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => {
      subscription.remove();
      clearTimeout(midnightTimer);
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      calculateDaysRemaining();
    }
  };

  const calculateDaysRemaining = (): void => {
    const now = new Date();
    const endOf2026 = new Date('2026-12-31T23:59:59');

    // Validate date is reasonable
    if (now.getFullYear() < 2024 || now.getFullYear() > 2030) {
      console.warn('System date appears invalid');
      setDaysRemaining(0);
      return;
    }

    if (now > endOf2026) {
      setDaysRemaining(0);
      return;
    }

    const diffTime = endOf2026.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysRemaining(Math.max(0, diffDays));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Days Remaining in 2026</Text>
      <Text style={styles.countdown}>{daysRemaining}</Text>
      <Text style={styles.subtitle}>Daily Quests to Hit Your Goals</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    marginVertical: 0,
    marginHorizontal: 0,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    paddingVertical: 32,
  },
  label: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 12,
    letterSpacing: 2,
    fontWeight: '700',
  },
  countdown: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FF0000',
    marginVertical: 8,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 11,
    color: '#666666',
    marginTop: 8,
    letterSpacing: 1,
  },
});
