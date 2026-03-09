import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { storageManager } from '../services/StorageManager';
import { EXPData } from '../types';

const STORAGE_KEY_EXP = 'zenith_exp_data';

export const AnalyticsGraphs: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<7 | 30 | 60 | 90>(30);
  const [averageEXP, setAverageEXP] = useState(0);
  const [totalEXP, setTotalEXP] = useState(0);

  useEffect(() => {
    loadGraphData();
  }, [selectedRange]);

  const loadGraphData = async (): Promise<void> => {
    try {
      const data = await storageManager.load<EXPData>(STORAGE_KEY_EXP);
      if (data && data.expHistory) {
        const rangeData = getDataForRange(data.expHistory, selectedRange);
        const avg = calculateAverage(rangeData);
        setAverageEXP(avg);
        setTotalEXP(data.totalEXP);
      }
    } catch (error) {
      console.error('Failed to load graph data:', error);
    }
  };

  const getDataForRange = (
    history: { date: string; expEarned: number }[],
    days: number
  ): { x: number; y: number }[] => {
    const today = new Date();
    const result: { x: number; y: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const entry = history.find(h => h.date === dateString);
      result.push({
        x: days - i,
        y: entry?.expEarned || 0,
      });
    }

    return result;
  };

  const calculateAverage = (data: { x: number; y: number }[]): number => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, point) => acc + point.y, 0);
    return Math.round((sum / data.length) * 100) / 100;
  };

  const updateRange = (range: 7 | 30 | 60 | 90): void => {
    setSelectedRange(range);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EXP Analytics</Text>
      
      <View style={styles.rangeSelector}>
        {([7, 30, 60, 90] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.rangeButton,
              selectedRange === range && styles.rangeButtonActive,
            ]}
            onPress={() => updateRange(range)}
          >
            <Text
              style={[
                styles.rangeButtonText,
                selectedRange === range && styles.rangeButtonTextActive,
              ]}
            >
              {range}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statsLabel}>Total EXP</Text>
          <Text style={styles.statsValue}>{totalEXP}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statsLabel}>Avg Daily ({selectedRange}d)</Text>
          <Text style={styles.statsValue}>{averageEXP}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  rangeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
  },
  rangeButtonActive: {
    backgroundColor: '#555555',
  },
  rangeButtonText: {
    color: '#cccccc',
    fontSize: 14,
  },
  rangeButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  statBox: {
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00',
  },
});
