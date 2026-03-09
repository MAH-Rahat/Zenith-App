/**
 * PhaseView.tsx
 * 
 * Individual phase component for lazy loading.
 * Renders skill nodes and connections for a single phase.
 * 
 * Requirements: 73.1, 73.2, 73.3
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { PhaseDefinition, SkillDefinition } from '../config/SkillTreePhases';

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
  voidGray: '#888888',
};

// Node dimensions
const NODE_SIZE = 80;
const NODE_SPACING_X = 120;
const NODE_SPACING_Y = 140;
const LINE_WIDTH = 2;

interface SkillNodeState {
  id: string;
  name: string;
  phase: number;
  level: number;
  isUnlocked: boolean;
  isComplete: boolean;
  proofOfWork?: string;
  completedAt?: string;
}

interface PhaseViewProps {
  phase: PhaseDefinition;
  skillStates: Map<string, SkillNodeState>;
  isUnlocked: boolean;
  completion: number;
  isAnimating: boolean;
  unlockAnimation: any;
  onSkillPress: (skillId: string) => void;
}

export const PhaseView: React.FC<PhaseViewProps> = ({
  phase,
  skillStates,
  isUnlocked,
  completion,
  isAnimating,
  unlockAnimation,
  onSkillPress,
}) => {
  const renderSkillNode = (skill: SkillDefinition, index: number): JSX.Element => {
    const skillState = skillStates.get(skill.id);
    const isSkillUnlocked = skillState?.isUnlocked || false;
    const isComplete = skillState?.isComplete || false;
    
    // Calculate position for circular layout
    const x = (index % 3) * NODE_SPACING_X;
    const y = Math.floor(index / 3) * NODE_SPACING_Y;
    
    return (
      <TouchableOpacity
        key={skill.id}
        style={[
          styles.skillNode,
          {
            left: x,
            top: y,
            borderColor: isComplete ? COLORS.growth : isSkillUnlocked ? COLORS.active : COLORS.border,
            backgroundColor: isComplete ? COLORS.surfaceRaised : COLORS.surface,
            opacity: isSkillUnlocked ? 1 : 0.4,
          },
        ]}
        onPress={() => isSkillUnlocked && onSkillPress(skill.id)}
        disabled={!isSkillUnlocked}
      >
        <Text
          style={[
            styles.skillName,
            { color: isComplete ? COLORS.growth : isSkillUnlocked ? COLORS.active : COLORS.voidGray },
          ]}
          numberOfLines={2}
        >
          {skill.name}
        </Text>
        {isComplete && (
          <View style={[styles.completionIndicator, { backgroundColor: COLORS.growth }]} />
        )}
        {!isSkillUnlocked && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderConnections = (skills: SkillDefinition[]): JSX.Element[] => {
    const connections: JSX.Element[] = [];
    
    // Connect nodes horizontally in rows
    for (let i = 0; i < skills.length - 1; i++) {
      const currentRow = Math.floor(i / 3);
      const nextRow = Math.floor((i + 1) / 3);
      
      // Only connect nodes in the same row
      if (currentRow === nextRow) {
        const x1 = (i % 3) * NODE_SPACING_X + NODE_SIZE;
        const y1 = currentRow * NODE_SPACING_Y + NODE_SIZE / 2;
        const x2 = ((i + 1) % 3) * NODE_SPACING_X;
        
        const skill1 = skillStates.get(skills[i].id);
        const skill2 = skillStates.get(skills[i + 1].id);
        const bothUnlocked = skill1?.isUnlocked && skill2?.isUnlocked;
        
        connections.push(
          <View
            key={`h-${i}`}
            style={[
              styles.connectionLine,
              {
                left: x1,
                top: y1 - LINE_WIDTH / 2,
                width: x2 - x1,
                backgroundColor: bothUnlocked ? COLORS.active : COLORS.border,
              },
            ]}
          />
        );
      }
    }
    
    // Connect nodes vertically between rows
    for (let i = 0; i < skills.length - 3; i++) {
      const col = i % 3;
      const nextRowIndex = i + 3;
      
      if (nextRowIndex < skills.length) {
        const x = col * NODE_SPACING_X + NODE_SIZE / 2;
        const y1 = Math.floor(i / 3) * NODE_SPACING_Y + NODE_SIZE;
        const y2 = Math.floor(nextRowIndex / 3) * NODE_SPACING_Y;
        
        const skill1 = skillStates.get(skills[i].id);
        const skill2 = skillStates.get(skills[nextRowIndex].id);
        const bothUnlocked = skill1?.isUnlocked && skill2?.isUnlocked;
        
        connections.push(
          <View
            key={`v-${i}`}
            style={[
              styles.connectionLine,
              {
                left: x - LINE_WIDTH / 2,
                top: y1,
                width: LINE_WIDTH,
                height: y2 - y1,
                backgroundColor: bothUnlocked ? COLORS.active : COLORS.border,
              },
            ]}
          />
        );
      }
    }
    
    return connections;
  };

  // Calculate animation styles only if Animated is available
  const hasAnimation = typeof Animated !== 'undefined' && Animated.Value && typeof unlockAnimation?.interpolate === 'function';
  
  const animatedScale = hasAnimation ? unlockAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  }) : 1;
  
  const animatedOpacity = hasAnimation ? unlockAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.7, 1],
  }) : 1;
  
  const containerStyle = isAnimating && hasAnimation
    ? [
        styles.phaseContainer,
        {
          transform: [{ scale: animatedScale }],
          opacity: animatedOpacity,
          borderColor: COLORS.growth,
        },
      ]
    : styles.phaseContainer;
  
  const ContainerComponent = hasAnimation ? Animated.View : View;
  
  return (
    <ContainerComponent style={containerStyle}>
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseName}>
          Phase {phase.id}: {phase.name}
        </Text>
        <Text style={styles.phaseCompletion}>
          {Math.round(completion)}% Complete
        </Text>
      </View>
      
      {!isUnlocked && (
        <Text style={styles.unlockMessage}>{phase.unlockMessage}</Text>
      )}
      
      {isAnimating && (
        <Text style={styles.unlockNotification}>🎉 Phase Unlocked!</Text>
      )}
      
      <View style={styles.nodesContainer}>
        {phase.skills.map((skill, index) => renderSkillNode(skill, index))}
        {renderConnections(phase.skills)}
      </View>
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  phaseContainer: {
    marginBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phaseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.active,
  },
  phaseCompletion: {
    fontSize: 14,
    color: COLORS.growth,
  },
  unlockMessage: {
    fontSize: 12,
    color: COLORS.caution,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  unlockNotification: {
    fontSize: 14,
    color: COLORS.growth,
    marginBottom: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nodesContainer: {
    position: 'relative',
    height: 400,
    marginTop: 16,
  },
  skillNode: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  skillName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  completionIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 20,
  },
  connectionLine: {
    position: 'absolute',
    height: LINE_WIDTH,
  },
});
