import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { CountdownTimer } from '../components/CountdownTimer';
import { ExamCountdown } from '../components/ExamCountdown';
import { expSystem } from '../services/EXPSystem';
import { hpSystem } from '../services/HPSystem';
import { skillTree } from '../services/SkillTree';
import { useTransitMode } from '../contexts/TransitModeContext';

export const HomeScreen: React.FC = () => {
  const [totalEXP, setTotalEXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentRank, setCurrentRank] = useState('Script Novice');
  const [currentHP, setCurrentHP] = useState(100);
  const [overallProgress, setOverallProgress] = useState(0);
  
  // Get Transit Mode state
  // Requirement 22.8: Display "TRANSIT MODE ACTIVE" badge in caution color (#FFB800)
  const { isTransitModeActive } = useTransitMode();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const exp = await expSystem.getTotalEXP();
      const level = await expSystem.getCurrentLevel();
      const rank = await expSystem.getCurrentRank();
      const hp = await hpSystem.getCurrentHP();
      
      // Calculate overall progress
      const allNodes = await skillTree.getAllNodes();
      const completedNodes = allNodes.filter(node => node.completionPercentage === 100).length;
      const progress = allNodes.length > 0 ? (completedNodes / allNodes.length) * 100 : 0;

      setTotalEXP(exp);
      setCurrentLevel(level);
      setCurrentRank(rank);
      setCurrentHP(hp);
      setOverallProgress(progress);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

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
        <Text style={styles.tagline}>FULL STACK AI ENGINEER PROTOCOL</Text>
        
        {/* Transit Mode Badge */}
        {/* Requirement 22.8: Display "TRANSIT MODE ACTIVE" badge in caution color (#FFB800) */}
        {isTransitModeActive && (
          <View style={styles.transitModeBadge}>
            <Text style={styles.transitModeBadgeText}>⚡ TRANSIT MODE ACTIVE</Text>
          </View>
        )}
      </View>
      
      {/* Bento Grid */}
      <View style={styles.bentoGrid}>
        {/* Large Countdown Card */}
        <View style={styles.bentoLarge}>
          <CountdownTimer />
        </View>
        
        {/* Identity Block - Rank and Level */}
        <View style={styles.bentoRow}>
          <View style={styles.bentoSmall}>
            <Text style={styles.bentoLabel}>RANK</Text>
            <Text style={styles.bentoValue}>{currentRank.toUpperCase()}</Text>
            <Text style={styles.bentoSubtext}>Level {currentLevel}</Text>
          </View>
          
          <View style={styles.bentoSmall}>
            <Text style={styles.bentoLabel}>TOTAL EXP</Text>
            <Text style={styles.bentoValueNeon}>{totalEXP}</Text>
            <Text style={styles.bentoSubtext}>{totalEXP % 100}/100 to next level</Text>
          </View>
        </View>

        {/* HP and Progress */}
        <View style={styles.bentoRow}>
          <View style={styles.bentoSmall}>
            <Text style={styles.bentoLabel}>HEALTH POINTS</Text>
            <Text style={[styles.bentoValueNeon, { color: currentHP > 50 ? '#00ff00' : '#FF0000' }]}>
              {currentHP}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${currentHP}%`, backgroundColor: currentHP > 50 ? '#00ff00' : '#FF0000' }]} />
            </View>
          </View>
          
          <View style={styles.bentoSmall}>
            <Text style={styles.bentoLabel}>ROADMAP</Text>
            <Text style={styles.bentoValueNeon}>{overallProgress.toFixed(0)}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
            </View>
          </View>
        </View>
        
        {/* Mission Brief Card */}
        <View style={styles.bentoMedium}>
          <View style={styles.glassHeader}>
            <Text style={styles.bentoTitle}>⚡ MISSION BRIEF</Text>
          </View>
          <Text style={styles.bentoDescription}>
            Master the complete AI engineering stack from MERN foundations through Docker, Python AI frameworks, to advanced ML with TensorFlow and PyTorch.
          </Text>
        </View>
        
        {/* System Status Card */}
        <View style={styles.bentoMedium}>
          <View style={styles.glassHeader}>
            <Text style={styles.bentoTitle}>🔥 SYSTEM STATUS</Text>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>SENTINEL</Text>
              <View style={styles.statusBadgeActive}>
                <Text style={styles.statusBadgeText}>ACTIVE</Text>
              </View>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>RESET</Text>
              <Text style={styles.statusValue}>00:00 UTC</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>ALERT</Text>
              <Text style={styles.statusValue}>21:00</Text>
            </View>
          </View>
        </View>

        {/* Exam Countdown Widgets */}
        <View style={styles.bentoLarge}>
          <View style={styles.glassHeader}>
            <Text style={styles.bentoTitle}>📚 EXAM COUNTDOWN</Text>
          </View>
          <ExamCountdown 
            onExamCritical={(examName, daysRemaining) => {
              console.log(`Exam ${examName} is critical: ${daysRemaining} days remaining`);
              // TODO: Trigger push notification and auto-generate study quests
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  containerTransitMode: {
    // Requirement 22.7: Shift surface color to surface-raised (#161616) during Transit Mode
    backgroundColor: '#161616',
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
    color: '#FF0000',
    letterSpacing: 8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 10,
    color: '#666666',
    letterSpacing: 2,
    fontWeight: '700',
  },
  transitModeBadge: {
    // Requirement 22.8: Display "TRANSIT MODE ACTIVE" badge in caution color (#FFB800)
    backgroundColor: '#FFB80020',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#FFB800',
    marginTop: 16,
  },
  transitModeBadgeText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  bentoGrid: {
    gap: 16,
  },
  bentoLarge: {
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bentoSmall: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  bentoMedium: {
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  bentoLabel: {
    fontSize: 10,
    color: '#666666',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  bentoValue: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 12,
  },
  bentoValueNeon: {
    fontSize: 28,
    color: '#FF0000',
    fontWeight: '900',
    marginBottom: 4,
  },
  bentoSubtext: {
    fontSize: 11,
    color: '#666666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF0000',
  },
  glassHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  bentoTitle: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 1,
  },
  bentoDescription: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 20,
  },
  statusGrid: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: '#666666',
    letterSpacing: 1,
    fontWeight: '700',
  },
  statusValue: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  statusBadgeActive: {
    backgroundColor: '#00ff0010',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  statusBadgeText: {
    color: '#00ff00',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
