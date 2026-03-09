import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { skillTree } from '../services/SkillTree';
import { databaseManager } from '../services/DatabaseManager';

interface GraduationWarRoomProps {
  visible: boolean;
  onClose: () => void;
}

interface ScoreBreakdown {
  portfolioProjects: number;
  skillsUnlockedPercent: number;
  githubCommitStreak: number;
  monthlyIncomeBDT: number;
}

interface VelocityProjection {
  projectedReadiness: number;
  currentVelocity: number;
  requiredVelocity: number;
  actionItems: ActionItem[];
}

interface ActionItem {
  action: string;
  impact: number;
  priority: 'high' | 'medium' | 'low';
}

const GRADUATION_DATE = new Date('2026-12-31');

/**
 * GraduationWarRoom Component
 * 
 * Full-screen modal displaying career readiness tracking with:
 * - Days remaining until graduation
 * - Graduation readiness score (0-100%)
 * - Score breakdown with progress bars
 * - Velocity projection if score < 70%
 * 
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6
 */
export const GraduationWarRoom: React.FC<GraduationWarRoomProps> = ({
  visible,
  onClose,
}) => {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [readinessScore, setReadinessScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown>({
    portfolioProjects: 0,
    skillsUnlockedPercent: 0,
    githubCommitStreak: 0,
    monthlyIncomeBDT: 0,
  });
  const [velocityProjection, setVelocityProjection] = useState<VelocityProjection | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      loadData();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      // Calculate days remaining
      const today = new Date();
      const diffTime = GRADUATION_DATE.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays);

      // Get portfolio projects count
      const projects = await databaseManager.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM quests 
         WHERE type = 'main' 
         AND isComplete = 1 
         AND description LIKE '%project%'`
      );
      const portfolioCount = projects[0]?.count || 0;

      // Get skills unlocked percentage
      const allNodes = await skillTree.getAllNodes();
      const completedNodes = allNodes.filter(node => node.completionPercentage === 100);
      const skillsPercent = allNodes.length > 0 
        ? (completedNodes.length / allNodes.length) * 100 
        : 0;

      // Get GitHub commit streak (placeholder - will be implemented with GitHub integration)
      const githubStreak = 0;

      // Get monthly income (placeholder - will be implemented with BROKER agent)
      const monthlyIncome = 0;

      const breakdown: ScoreBreakdown = {
        portfolioProjects: portfolioCount,
        skillsUnlockedPercent: skillsPercent,
        githubCommitStreak: githubStreak,
        monthlyIncomeBDT: monthlyIncome,
      };

      setScoreBreakdown(breakdown);

      // Calculate readiness score
      const score = calculateReadinessScore(breakdown);
      setReadinessScore(score);

      // Calculate velocity projection if score < 70%
      if (score < 70) {
        const projection = await calculateVelocityProjection(score, diffDays);
        setVelocityProjection(projection);
      } else {
        setVelocityProjection(null);
      }
    } catch (error) {
      console.error('Failed to load graduation war room data:', error);
    }
  };

  /**
   * Calculate graduation readiness score
   * 
   * Weighted formula:
   * - Portfolio projects: 35% (normalized to 5 projects = 100%)
   * - Skills unlocked: 30% (percentage of all skill nodes)
   * - GitHub commit streak: 20% (normalized to 30 days = 100%)
   * - Monthly income BDT: 15% (normalized to 50,000 BDT = 100%)
   * 
   * Requirement: 37.4
   */
  const calculateReadinessScore = (breakdown: ScoreBreakdown): number => {
    const weights = {
      portfolioProjects: 0.35,
      skillsUnlockedPercent: 0.30,
      githubCommitStreak: 0.20,
      monthlyIncomeBDT: 0.15,
    };

    const normalizedPortfolio = Math.min(breakdown.portfolioProjects / 5, 1) * 100;
    const normalizedSkills = breakdown.skillsUnlockedPercent;
    const normalizedStreak = Math.min(breakdown.githubCommitStreak / 30, 1) * 100;
    const normalizedIncome = Math.min(breakdown.monthlyIncomeBDT / 50000, 1) * 100;

    const score =
      normalizedPortfolio * weights.portfolioProjects +
      normalizedSkills * weights.skillsUnlockedPercent +
      normalizedStreak * weights.githubCommitStreak +
      normalizedIncome * weights.monthlyIncomeBDT;

    return Math.round(score);
  };

  /**
   * Calculate velocity projection
   * 
   * Projects readiness at graduation based on current weekly velocity
   * Requirements: 37.7, 38.1, 38.2
   */
  const calculateVelocityProjection = async (
    currentScore: number,
    daysRemaining: number
  ): Promise<VelocityProjection> => {
    try {
      const weeksRemaining = Math.floor(daysRemaining / 7);

      // Get weekly skill completions (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSkills = await skillTree.getCompletedNodes(
        sevenDaysAgo.toISOString(),
        new Date().toISOString()
      );
      const weeklySkillCompletions = recentSkills.length;

      // Get weekly project completions (last 7 days)
      const recentProjects = await databaseManager.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM quests 
         WHERE type = 'main' 
         AND isComplete = 1 
         AND description LIKE '%project%'
         AND completedAt >= ?`,
        [sevenDaysAgo.toISOString()]
      );
      const weeklyProjectCompletions = recentProjects[0]?.count || 0;

      // Calculate velocity (skill completions * 2 + project completions * 5)
      const currentVelocity = weeklySkillCompletions * 2 + weeklyProjectCompletions * 5;

      // Project readiness at graduation
      const projectedReadiness = Math.min(
        currentScore + currentVelocity * weeksRemaining,
        100
      );

      // Calculate required velocity to reach 70%
      const requiredVelocity = weeksRemaining > 0 
        ? (70 - currentScore) / weeksRemaining 
        : 0;

      // Generate action items
      const actionItems = generateActionItems(currentScore, scoreBreakdown);

      return {
        projectedReadiness,
        currentVelocity,
        requiredVelocity,
        actionItems,
      };
    } catch (error) {
      console.error('Failed to calculate velocity projection:', error);
      return {
        projectedReadiness: currentScore,
        currentVelocity: 0,
        requiredVelocity: 0,
        actionItems: [],
      };
    }
  };

  /**
   * Generate prioritized action items to improve readiness score
   * Requirements: 38.3, 38.4, 38.5
   */
  const generateActionItems = (
    currentScore: number,
    breakdown: ScoreBreakdown
  ): ActionItem[] => {
    const items: ActionItem[] = [];

    // Portfolio projects (35% weight)
    if (breakdown.portfolioProjects < 5) {
      const projectsNeeded = 5 - breakdown.portfolioProjects;
      items.push({
        action: `Ship ${projectsNeeded} more portfolio project${projectsNeeded > 1 ? 's' : ''} with live demos`,
        impact: 35,
        priority: 'high',
      });
    }

    // Skills unlocked (30% weight)
    if (breakdown.skillsUnlockedPercent < 100) {
      const skillsRemaining = Math.round((100 - breakdown.skillsUnlockedPercent) / 5);
      items.push({
        action: `Complete ${skillsRemaining} more skill nodes with proof-of-work`,
        impact: 30,
        priority: 'high',
      });
    }

    // GitHub commit streak (20% weight)
    if (breakdown.githubCommitStreak < 30) {
      items.push({
        action: 'Build 30-day GitHub commit streak with daily contributions',
        impact: 20,
        priority: 'medium',
      });
    }

    // Monthly income (15% weight)
    if (breakdown.monthlyIncomeBDT < 50000) {
      const incomeNeeded = 50000 - breakdown.monthlyIncomeBDT;
      items.push({
        action: `Increase monthly income by ৳${incomeNeeded.toLocaleString()} through freelancing or tutoring`,
        impact: 15,
        priority: 'medium',
      });
    }

    // Sort by impact (descending)
    return items.sort((a, b) => b.impact - a.impact);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return '#00FF66'; // growth color
    if (score >= 50) return '#FFB800'; // caution color
    return '#FF2A42'; // alert color
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>GRADUATION WAR ROOM</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Days Remaining - Requirement 37.3 */}
            <View style={styles.daysCard}>
              <Text style={styles.daysLabel}>DAYS UNTIL GRADUATION</Text>
              <Text style={styles.daysValue}>{daysRemaining}</Text>
              <Text style={styles.daysDate}>
                December 31, 2026
              </Text>
            </View>

            {/* Readiness Score - Requirements 37.4, 37.5 */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>GRADUATION READINESS</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(readinessScore) }]}>
                {readinessScore}%
              </Text>
              <View style={styles.scoreBar}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${readinessScore}%`,
                      backgroundColor: getScoreColor(readinessScore),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Score Breakdown - Requirement 37.6 */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>SCORE BREAKDOWN</Text>

              {/* Portfolio Projects */}
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownLabel}>Portfolio Projects</Text>
                  <Text style={styles.breakdownValue}>
                    {scoreBreakdown.portfolioProjects}/5
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min((scoreBreakdown.portfolioProjects / 5) * 100, 100)}%`,
                        backgroundColor: '#00E5FF',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownWeight}>35% weight</Text>
              </View>

              {/* Skills Unlocked */}
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownLabel}>Skills Unlocked</Text>
                  <Text style={styles.breakdownValue}>
                    {scoreBreakdown.skillsUnlockedPercent.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${scoreBreakdown.skillsUnlockedPercent}%`,
                        backgroundColor: '#00E5FF',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownWeight}>30% weight</Text>
              </View>

              {/* GitHub Commit Streak */}
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownLabel}>GitHub Commit Streak</Text>
                  <Text style={styles.breakdownValue}>
                    {scoreBreakdown.githubCommitStreak} days
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min((scoreBreakdown.githubCommitStreak / 30) * 100, 100)}%`,
                        backgroundColor: '#00E5FF',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownWeight}>20% weight</Text>
              </View>

              {/* Monthly Income */}
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownLabel}>Monthly Income (BDT)</Text>
                  <Text style={styles.breakdownValue}>
                    ৳{scoreBreakdown.monthlyIncomeBDT.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min((scoreBreakdown.monthlyIncomeBDT / 50000) * 100, 100)}%`,
                        backgroundColor: '#00E5FF',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownWeight}>15% weight</Text>
              </View>
            </View>

            {/* Velocity Projection - Requirements 37.7, 37.8, 38.1, 38.2, 38.3 */}
            {velocityProjection && readinessScore < 70 && (
              <View style={styles.projectionCard}>
                <View style={styles.warningHeader}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>VELOCITY PROJECTION</Text>
                </View>

                <Text style={styles.projectionMessage}>
                  At current velocity, you will graduate at{' '}
                  <Text style={styles.projectionValue}>
                    {velocityProjection.projectedReadiness}%
                  </Text>{' '}
                  career-ready. Here is what changes that.
                </Text>

                <View style={styles.velocityStats}>
                  <View style={styles.velocityStat}>
                    <Text style={styles.velocityLabel}>Current Velocity</Text>
                    <Text style={styles.velocityValue}>
                      {velocityProjection.currentVelocity.toFixed(1)}/week
                    </Text>
                  </View>
                  <View style={styles.velocityStat}>
                    <Text style={styles.velocityLabel}>Required Velocity</Text>
                    <Text style={styles.velocityValue}>
                      {velocityProjection.requiredVelocity.toFixed(1)}/week
                    </Text>
                  </View>
                </View>

                {/* Action Items - Requirements 38.4, 38.5 */}
                <View style={styles.actionItemsSection}>
                  <Text style={styles.actionItemsTitle}>PRIORITY ACTIONS</Text>
                  {velocityProjection.actionItems.map((item, index) => (
                    <View key={index} style={styles.actionItem}>
                      <View style={styles.actionItemHeader}>
                        <View
                          style={[
                            styles.priorityBadge,
                            item.priority === 'high' && styles.priorityHigh,
                            item.priority === 'medium' && styles.priorityMedium,
                          ]}
                        >
                          <Text style={styles.priorityText}>
                            {item.priority.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.impactText}>+{item.impact}% impact</Text>
                      </View>
                      <Text style={styles.actionText}>{item.action}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#888888',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  daysCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  daysLabel: {
    fontSize: 11,
    color: '#888888',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 12,
  },
  daysValue: {
    fontSize: 72,
    fontWeight: '900',
    color: '#00E5FF',
    marginBottom: 8,
  },
  daysDate: {
    fontSize: 14,
    color: '#888888',
  },
  scoreCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#888888',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '900',
    marginBottom: 16,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#161616',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
  },
  breakdownCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 24,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 20,
  },
  breakdownItem: {
    marginBottom: 20,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#00E5FF',
    fontWeight: '700',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#161616',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  breakdownWeight: {
    fontSize: 10,
    color: '#666666',
    fontStyle: 'italic',
  },
  projectionCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF2A42',
    padding: 24,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  warningTitle: {
    fontSize: 14,
    color: '#FF2A42',
    fontWeight: '700',
    letterSpacing: 1,
  },
  projectionMessage: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 20,
  },
  projectionValue: {
    fontSize: 16,
    color: '#FF2A42',
    fontWeight: '900',
  },
  velocityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1F1F1F',
  },
  velocityStat: {
    flex: 1,
    alignItems: 'center',
  },
  velocityLabel: {
    fontSize: 11,
    color: '#888888',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 8,
  },
  velocityValue: {
    fontSize: 20,
    color: '#00E5FF',
    fontWeight: '900',
  },
  actionItemsSection: {
    marginTop: 8,
  },
  actionItemsTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  actionItem: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  actionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityHigh: {
    backgroundColor: '#FF2A4220',
    borderColor: '#FF2A42',
  },
  priorityMedium: {
    backgroundColor: '#FFB80020',
    borderColor: '#FFB800',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  impactText: {
    fontSize: 11,
    color: '#00FF66',
    fontWeight: '700',
  },
  actionText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 20,
  },
});
