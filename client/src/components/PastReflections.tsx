import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { weeklyReflectionService } from '../services/WeeklyReflectionService';
import { WeeklyReflection } from '../types';

/**
 * PastReflections Component
 * 
 * Requirements: 39.8, 90.1, 90.2, 90.3, 90.4, 90.5
 * 
 * Displays chronological list of past 52 weeks of reflections
 * Allows reviewing past reflections
 * Calculates growth metrics across 52 weeks
 * Exports all reflections to Markdown
 */
export const PastReflections: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [reflections, setReflections] = useState<any[]>([]);
  const [selectedReflection, setSelectedReflection] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalReflections: 0,
    averageExpDelta: 0,
    totalExpGrowth: 0,
    consistencyScore: 0,
  });

  useEffect(() => {
    loadReflections();
  }, []);

  /**
   * Load all reflections and calculate metrics
   * Requirements: 90.1, 90.2, 90.4
   */
  const loadReflections = async () => {
    setIsLoading(true);
    try {
      const allReflections = await weeklyReflectionService.getAllReflections();
      const growthMetrics = await weeklyReflectionService.calculateGrowthMetrics();
      
      setReflections(allReflections);
      setMetrics(growthMetrics);
    } catch (error) {
      console.error('Failed to load reflections:', error);
      Alert.alert('Error', 'Failed to load past reflections');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export all reflections to Markdown
   * Requirement 90.5: Export all reflections as Markdown
   */
  const handleExport = async () => {
    try {
      const markdown = await weeklyReflectionService.exportToMarkdown();
      
      // Share the markdown content
      await Share.share({
        message: markdown,
        title: 'Weekly Reflections Export',
      });
    } catch (error) {
      console.error('Failed to export reflections:', error);
      Alert.alert('Export Failed', 'Unable to export reflections to Markdown');
    }
  };

  /**
   * Render reflection detail modal
   * Requirement 90.3: Allow reviewing past reflections
   */
  const renderReflectionDetail = () => {
    if (!selectedReflection) return null;

    const weekStart = new Date(selectedReflection.week_start_date).toLocaleDateString();
    const weekEnd = new Date(selectedReflection.week_end_date).toLocaleDateString();
    
    let architectReport = null;
    if (selectedReflection.architect_report) {
      try {
        architectReport = JSON.parse(selectedReflection.architect_report);
      } catch (e) {
        console.error('Failed to parse ARCHITECT report:', e);
      }
    }

    return (
      <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
        <View className="flex-1 bg-void">
          {/* Header */}
          <View className="px-4 pt-12 pb-4 border-b border-border">
            <Text className="text-2xl font-bold text-white mb-2">
              Week of {weekStart} - {weekEnd}
            </Text>
            <Text className="text-sm text-active">
              EXP Delta: {selectedReflection.exp_delta > 0 ? '+' : ''}{selectedReflection.exp_delta}
            </Text>
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            {/* Accomplishments */}
            <View className="mb-6">
              <Text className="text-white font-semibold mb-2">Accomplishments</Text>
              <View className="bg-surface border border-border rounded-lg p-4">
                <Text className="text-white">{selectedReflection.accomplishments}</Text>
              </View>
            </View>

            {/* Avoided Tasks */}
            <View className="mb-6">
              <Text className="text-white font-semibold mb-2">Avoided Tasks</Text>
              <View className="bg-surface border border-border rounded-lg p-4">
                <Text className="text-white">{selectedReflection.avoided_tasks}</Text>
              </View>
            </View>

            {/* Learning */}
            <View className="mb-6">
              <Text className="text-white font-semibold mb-2">Learning</Text>
              <View className="bg-surface border border-border rounded-lg p-4">
                <Text className="text-white">{selectedReflection.learning}</Text>
              </View>
            </View>

            {/* Challenges */}
            <View className="mb-6">
              <Text className="text-white font-semibold mb-2">Challenges</Text>
              <View className="bg-surface border border-border rounded-lg p-4">
                <Text className="text-white">{selectedReflection.challenges}</Text>
              </View>
            </View>

            {/* Next Week Priorities */}
            <View className="mb-6">
              <Text className="text-white font-semibold mb-2">Next Week Priorities</Text>
              <View className="bg-surface border border-border rounded-lg p-4">
                <Text className="text-white">{selectedReflection.next_week_priorities}</Text>
              </View>
            </View>

            {/* ARCHITECT Report */}
            {architectReport && (
              <View className="mb-6">
                <Text className="text-white font-semibold mb-2">ARCHITECT Weekly Growth Report</Text>
                <View className="bg-surface-raised border border-active rounded-lg p-4">
                  <Text className="text-white mb-3">
                    <Text className="font-semibold">What Shipped: </Text>
                    {architectReport.what_shipped}
                  </Text>
                  <Text className="text-white mb-3">
                    <Text className="font-semibold">What Avoided: </Text>
                    {architectReport.what_avoided}
                  </Text>
                  <Text className="text-alert font-semibold">
                    Hard Truth: {architectReport.hard_truth}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Close Button */}
          <View className="px-4 pb-8 pt-4 border-t border-border">
            <TouchableOpacity
              className="bg-surface border border-border rounded-lg py-4"
              onPress={() => setSelectedReflection(null)}
            >
              <Text className="text-white text-center font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
        <View className="flex-1 bg-void items-center justify-center">
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text className="text-white mt-4">Loading reflections...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <View className="flex-1 bg-void">
        {/* Header */}
        <View className="px-4 pt-12 pb-4 border-b border-border">
          <Text className="text-2xl font-bold text-white mb-2">Past Reflections</Text>
          <Text className="text-sm text-void-text">52-Week Transformation Record</Text>
        </View>

        {/* Growth Metrics */}
        <View className="px-4 py-4 bg-surface-raised border-b border-border">
          <Text className="text-white font-semibold mb-3">Growth Metrics</Text>
          <View className="flex-row flex-wrap">
            <View className="w-1/2 mb-3">
              <Text className="text-void-text text-xs">Total Reflections</Text>
              <Text className="text-white text-lg font-bold">{metrics.totalReflections}</Text>
            </View>
            <View className="w-1/2 mb-3">
              <Text className="text-void-text text-xs">Avg EXP Delta</Text>
              <Text className="text-white text-lg font-bold">
                {metrics.averageExpDelta > 0 ? '+' : ''}{metrics.averageExpDelta}
              </Text>
            </View>
            <View className="w-1/2 mb-3">
              <Text className="text-void-text text-xs">Total EXP Growth</Text>
              <Text className="text-white text-lg font-bold">
                {metrics.totalExpGrowth > 0 ? '+' : ''}{metrics.totalExpGrowth}
              </Text>
            </View>
            <View className="w-1/2 mb-3">
              <Text className="text-void-text text-xs">Consistency Score</Text>
              <Text className="text-white text-lg font-bold">{metrics.consistencyScore}%</Text>
            </View>
          </View>
        </View>

        {/* Reflections List */}
        <ScrollView className="flex-1 px-4 py-4">
          {reflections.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Text className="text-void-text text-center">
                No reflections yet.{'\n'}Complete your first weekly reflection on Sunday at 20:00.
              </Text>
            </View>
          ) : (
            reflections.map((reflection) => {
              const weekStart = new Date(reflection.week_start_date).toLocaleDateString();
              const weekEnd = new Date(reflection.week_end_date).toLocaleDateString();
              
              return (
                <TouchableOpacity
                  key={reflection.id}
                  className="bg-surface border border-border rounded-lg p-4 mb-3"
                  onPress={() => setSelectedReflection(reflection)}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white font-semibold">
                      {weekStart} - {weekEnd}
                    </Text>
                    <Text
                      className={`font-bold ${
                        reflection.exp_delta > 0
                          ? 'text-growth'
                          : reflection.exp_delta < 0
                          ? 'text-alert'
                          : 'text-void-text'
                      }`}
                    >
                      {reflection.exp_delta > 0 ? '+' : ''}{reflection.exp_delta} EXP
                    </Text>
                  </View>
                  <Text className="text-void-text text-sm" numberOfLines={2}>
                    {reflection.accomplishments}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View className="px-4 pb-8 pt-4 border-t border-border">
          {reflections.length > 0 && (
            <TouchableOpacity
              className="bg-active border border-active rounded-lg py-4 mb-3"
              onPress={handleExport}
            >
              <Text className="text-white text-center font-semibold">
                Export to Markdown
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="bg-surface border border-border rounded-lg py-4"
            onPress={onClose}
          >
            <Text className="text-void-text text-center font-semibold">Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reflection Detail Modal */}
      {selectedReflection && renderReflectionDetail()}
    </Modal>
  );
};
