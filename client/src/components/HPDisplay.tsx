/**
 * HPDisplay Component
 * 
 * Displays current HP with color-coded indicator and progress bar.
 * 
 * Requirements:
 * - 8.7: Display current HP on Player Dashboard with color-coded indicator
 * - 8.1: Initialize user HP at 100 on first launch
 * - 8.5: HP shall not reduce below 0
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { hpSystem } from '../services/HPSystem';
import { colors } from '../theme/colors';

interface HPDisplayProps {
  onHPChange?: (newHP: number) => void;
}

export const HPDisplay: React.FC<HPDisplayProps> = ({ onHPChange }) => {
  const [currentHP, setCurrentHP] = useState(100);

  useEffect(() => {
    loadHP();

    // Subscribe to HP changes
    const unsubscribe = hpSystem.addListener((hp) => {
      setCurrentHP(hp);
      onHPChange?.(hp);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadHP = async () => {
    try {
      const hp = await hpSystem.getCurrentHP();
      setCurrentHP(hp);
    } catch (error) {
      console.error('Failed to load HP:', error);
    }
  };

  // Determine color based on HP level
  const getHPColor = (): string => {
    if (currentHP > 66) return colors.growth; // Green for healthy
    if (currentHP > 33) return colors.caution; // Yellow for warning
    return colors.alert; // Red for critical
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>HEALTH POINTS</Text>
      <Text style={[styles.hpValue, { color: getHPColor() }]}>
        {currentHP}
      </Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${currentHP}%`,
              backgroundColor: getHPColor(),
            },
          ]}
        />
      </View>
      <Text style={styles.subtext}>
        {currentHP === 0 ? 'CRITICAL STATE' : `${currentHP}% Health`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  hpValue: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  subtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
