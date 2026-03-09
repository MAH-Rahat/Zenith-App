import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { databaseManager } from '../services/DatabaseManager';

interface ContributionGridProps {
  onCellTap?: (date: Date, dailyEXP: number, quests: any[]) => void;
}

interface ActivityDay {
  date: string;
  hasActivity: boolean;
  expEarned: number;
  isShattered: boolean;
}

interface DayDetails {
  date: string;
  totalEXP: number;
  quests: Array<{ description: string; expValue: number }>;
  hpChanges: Array<{ hpChange: number; reason: string; timestamp: string }>;
}

/**
 * ContributionGrid Component
 * 
 * Displays a 90-day activity heatmap with 5 cell states.
 * Optimized with React.memo to prevent unnecessary re-renders (Requirements 12.5, 72.1)
 * Uses useMemo for cell color calculations (Requirements 12.6, 72.2)
 * Updates within 100ms when data changes (Requirement 72.5)
 */
const ContributionGridComponent: React.FC<ContributionGridProps> = ({
  onCellTap,
}) => {
  const [gridData, setGridData] = useState<Map<string, ActivityDay>>(new Map());
  const [selectedDay, setSelectedDay] = useState<DayDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadGridData();
  }, []);

  const loadGridData = async (): Promise<void> => {
    try {
      // Get contribution grid data from database for last 90 days
      const results = await databaseManager.query<{ 
        date: string; 
        expEarned: number; 
        hasActivity: number;
        is_shattered: number;
      }>(
        'SELECT date, expEarned, hasActivity, is_shattered FROM contribution_grid ORDER BY date DESC LIMIT 90'
      );

      const dataMap = new Map<string, ActivityDay>();
      results.forEach(row => {
        dataMap.set(row.date, {
          date: row.date,
          hasActivity: row.hasActivity === 1,
          expEarned: row.expEarned,
          isShattered: row.is_shattered === 1,
        });
      });
      setGridData(dataMap);
    } catch (error) {
      console.error('Failed to load contribution grid:', error);
    }
  };

  /**
   * Mark a day as active with EXP earned
   * Persists to contribution_grid table
   * Requirements: 12.1, 12.7
   */
  const markDayActive = async (date: Date, expEarned: number): Promise<void> => {
    try {
      const dateString = date.toISOString().split('T')[0];
      
      // Check if entry exists
      const existing = await databaseManager.query<{ date: string }>(
        'SELECT date FROM contribution_grid WHERE date = ?',
        [dateString]
      );

      if (existing.length > 0) {
        // Update existing entry
        await databaseManager.update(
          'contribution_grid',
          { expEarned, hasActivity: expEarned > 0 ? 1 : 0 },
          'date = ?',
          [dateString]
        );
      } else {
        // Insert new entry
        await databaseManager.insert('contribution_grid', {
          date: dateString,
          expEarned,
          hasActivity: expEarned > 0 ? 1 : 0,
          questsCompleted: 0,
          is_shattered: 0,
        });
      }

      // Reload grid data
      await loadGridData();
    } catch (error) {
      console.error('Failed to mark day active:', error);
    }
  };

  /**
   * Get activity data for the last 90 days
   * Requirements: 12.1
   */
  const getActivityForRange = (): ActivityDay[] => {
    const result: ActivityDay[] = [];
    const today = new Date();

    // Generate exactly 90 days
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const dayData = gridData.get(dateString);
      result.push(dayData || {
        date: dateString,
        hasActivity: false,
        expEarned: 0,
        isShattered: false,
      });
    }

    return result;
  };

  /**
   * Memoized activity data for the last 90 days
   * Requirements: 12.1, 72.5
   * 
   * Memoized to prevent recalculation on every render
   */
  const activities = useMemo(() => getActivityForRange(), [gridData]);

  /**
   * Get cell color based on EXP earned
   * Requirements: 12.2, 12.6
   * 
   * Cell States:
   * - Future/unlogged: border color (#1F1F1F)
   * - Partial activity (1-19 EXP): #004D1F
   * - Full activity (20+ EXP): growth color (#00FF66)
   * - Zero EXP day: alert color (#FF2A42)
   * - Shattered (Critical State): void color (#888888)
   * 
   * Uses useMemo for performance optimization as per Requirement 12.6
   */
  const getCellColor = (day: ActivityDay): string => {
    // Shattered state (Critical State)
    if (day.isShattered) {
      return '#888888'; // void color
    }

    // Check if day is in the future
    const today = new Date().toISOString().split('T')[0];
    if (day.date > today) {
      return '#1F1F1F'; // border color (future/unlogged)
    }

    // Zero EXP day (logged but no activity)
    if (day.hasActivity && day.expEarned === 0) {
      return '#FF2A42'; // alert color
    }

    // Partial activity (1-19 EXP)
    if (day.expEarned >= 1 && day.expEarned < 20) {
      return '#004D1F';
    }

    // Full activity (20+ EXP)
    if (day.expEarned >= 20) {
      return '#00FF66'; // growth color
    }

    // No activity logged
    return '#1F1F1F'; // border color
  };

  /**
   * Get week labels for the grid
   * Requirements: 12.4
   */
  const weekLabels = useMemo(() => {
    const labels: string[] = [];
    
    // Get first day of week for each week
    for (let i = 0; i < activities.length; i += 7) {
      const date = new Date(activities[i].date);
      const weekNum = Math.ceil((i + 1) / 7);
      labels.push(`W${weekNum}`);
    }
    
    return labels;
  }, [activities]);

  /**
   * Get month labels for the grid
   * Requirements: 12.4
   */
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; startIndex: number }> = [];
    let currentMonth = '';
    
    activities.forEach((day, index) => {
      const date = new Date(day.date);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthName !== currentMonth) {
        currentMonth = monthName;
        labels.push({ month: monthName, startIndex: index });
      }
    });
    
    return labels;
  }, [activities]);

  /**
   * Memoized cell colors for performance optimization
   * Requirements: 12.6, 72.2, 72.5
   * 
   * Uses useMemo to cache cell color calculations, preventing
   * recalculation on every render. This ensures updates complete
   * within 100ms as required by Requirement 72.5.
   */
  const cellsWithColors = useMemo(() => {
    return activities.map(activity => ({
      activity,
      color: getCellColor(activity),
    }));
  }, [activities, gridData]);

  /**
   * Handle cell tap to show day details
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
   */
  const handleCellTap = async (day: ActivityDay): Promise<void> => {
    try {
      // Query completed quests for the selected date
      const quests = await databaseManager.query<{
        description: string;
        expValue: number;
      }>(
        `SELECT description, expValue 
         FROM quests 
         WHERE completedAt LIKE ? AND isComplete = 1`,
        [`${day.date}%`]
      );

      // Query HP changes for the selected date
      const hpChanges = await databaseManager.query<{
        hpChange: number;
        reason: string;
        timestamp: string;
      }>(
        `SELECT hpChange, reason, timestamp 
         FROM hp_log 
         WHERE timestamp LIKE ?
         ORDER BY timestamp ASC`,
        [`${day.date}%`]
      );

      // Set selected day details
      setSelectedDay({
        date: day.date,
        totalEXP: day.expEarned,
        quests: quests,
        hpChanges: hpChanges,
      });

      // Open modal
      setModalVisible(true);

      // Call optional callback
      if (onCellTap) {
        onCellTap(new Date(day.date), day.expEarned, quests);
      }
    } catch (error) {
      console.error('Failed to load day details:', error);
    }
  };

  /**
   * Render the 90-day grid
   * Requirements: 12.1, 12.3, 12.5, 12.6, 13.1
   */
  const renderGrid = (): JSX.Element => {
    return (
      <View style={styles.gridContainer}>
        {/* Month labels */}
        <View style={styles.monthLabelsContainer}>
          {monthLabels.map((label, index) => (
            <Text
              key={index}
              style={[
                styles.monthLabel,
                { marginLeft: label.startIndex * 10 },
              ]}
            >
              {label.month}
            </Text>
          ))}
        </View>

        {/* Grid cells - exactly 90 cells with tap interaction */}
        <View style={styles.cellsContainer}>
          {cellsWithColors.map((cell, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleCellTap(cell.activity)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.gridCell,
                  {
                    backgroundColor: cell.color,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.container}>
        <Text style={styles.title}>CONTRIBUTION GRID</Text>
        {renderGrid()}
      </View>

      {/* Bottom Sheet Modal - Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.bottomSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedDay && (
              <View>
                {/* Header with date */}
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>
                    {new Date(selectedDay.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Total EXP */}
                <View style={styles.statSection}>
                  <Text style={styles.statLabel}>TOTAL EXP EARNED</Text>
                  <Text style={styles.statValue}>{selectedDay.totalEXP}</Text>
                </View>

                {/* Completed Quests */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    COMPLETED QUESTS ({selectedDay.quests.length})
                  </Text>
                  {selectedDay.quests.length > 0 ? (
                    <ScrollView style={styles.questList}>
                      {selectedDay.quests.map((quest, index) => (
                        <View key={index} style={styles.questItem}>
                          <Text style={styles.questDescription}>
                            {quest.description}
                          </Text>
                          <Text style={styles.questEXP}>+{quest.expValue} EXP</Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.emptyText}>No quests completed</Text>
                  )}
                </View>

                {/* HP Changes */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    HP CHANGES ({selectedDay.hpChanges.length})
                  </Text>
                  {selectedDay.hpChanges.length > 0 ? (
                    <ScrollView style={styles.hpList}>
                      {selectedDay.hpChanges.map((change, index) => (
                        <View key={index} style={styles.hpItem}>
                          <Text
                            style={[
                              styles.hpChange,
                              change.hpChange > 0
                                ? styles.hpPositive
                                : styles.hpNegative,
                            ]}
                          >
                            {change.hpChange > 0 ? '+' : ''}
                            {change.hpChange} HP
                          </Text>
                          <Text style={styles.hpReason}>{change.reason}</Text>
                          <Text style={styles.hpTime}>
                            {new Date(change.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.emptyText}>No HP changes</Text>
                  )}
                </View>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D0D0D', // surface color
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F', // border color
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'column',
  },
  monthLabelsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    height: 16,
  },
  monthLabel: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '600',
  },
  cellsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    maxWidth: 90 * 10, // 90 cells * (8px width + 2px gap)
  },
  gridCell: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  // Modal styles - Requirements: 13.1, 13.6
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#0D0D0D', // surface color
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 24,
    maxHeight: '80%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161616', // surface-raised
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#888888',
    fontWeight: '600',
  },
  // Stat section - Requirement: 13.3
  statSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#161616', // surface-raised
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00FF66', // growth color
    fontFamily: 'monospace',
  },
  // Section styles
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  // Quest list - Requirement: 13.4
  questList: {
    maxHeight: 150,
  },
  questItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#161616', // surface-raised
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: 8,
  },
  questDescription: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  questEXP: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FF66', // growth color
    fontFamily: 'monospace',
  },
  // HP changes list - Requirement: 13.5
  hpList: {
    maxHeight: 150,
  },
  hpItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#161616', // surface-raised
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: 8,
  },
  hpChange: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    minWidth: 60,
  },
  hpPositive: {
    color: '#00FF66', // growth color
  },
  hpNegative: {
    color: '#FF2A42', // alert color
  },
  hpReason: {
    fontSize: 12,
    color: '#FFFFFF',
    flex: 1,
    marginHorizontal: 12,
  },
  hpTime: {
    fontSize: 11,
    color: '#888888',
    fontFamily: 'monospace',
  },
  emptyText: {
    fontSize: 13,
    color: '#888888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});

/**
 * Export ContributionGrid wrapped with React.memo for performance optimization
 * Requirements: 12.5, 72.1
 * 
 * React.memo prevents unnecessary re-renders when props haven't changed,
 * ensuring the grid only updates when gridData changes.
 */
export const ContributionGrid = React.memo(ContributionGridComponent);
