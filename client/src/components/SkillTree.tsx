/**
 * SkillTree.tsx
 * 
 * Circuit board visualization of the four-phase skill tree with proof-of-work validation.
 * Renders nodes as circular elements connected by orthogonal lines.
 * Implements lazy loading by phase for performance optimization.
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 73.1, 73.2, 73.3, 73.4, 73.5
 */

import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SKILL_TREE_PHASES, PhaseDefinition, SkillDefinition } from '../config/SkillTreePhases';
import { storageManager } from '../services/StorageManager';
import { SkillTreeProps, SkillNode } from '../types';
import { ProofOfWorkForm } from './ProofOfWorkForm';

// Lazy load PhaseView component for performance
const PhaseView = lazy(() => import('./PhaseView').then(module => ({ default: module.PhaseView })));

const STORAGE_KEY_SKILLS = 'zenith_skill_tree';

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

interface SkillNodeState extends SkillNode {
  phase: number;
}

export const SkillTree: React.FC<SkillTreeProps> = ({ onSkillComplete }) => {
  const [skillStates, setSkillStates] = useState<Map<string, SkillNodeState>>(new Map());
  const [unlockedPhases, setUnlockedPhases] = useState<Set<number>>(new Set([1]));
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1])); // Track expanded phases
  const [animatingPhase, setAnimatingPhase] = useState<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillNodeState | null>(null);
  const [showProofForm, setShowProofForm] = useState(false);
  
  // Initialize animation value safely for test environment
  const unlockAnimation = useRef(
    typeof Animated !== 'undefined' && Animated.Value 
      ? new Animated.Value(0) 
      : { setValue: () => {}, interpolate: () => ({ __getValue: () => 1 }) }
  ).current;

  useEffect(() => {
    loadSkillTree();
  }, []);

  const loadSkillTree = async (): Promise<void> => {
    try {
      const data = await storageManager.load<{ skills: SkillNodeState[] }>(STORAGE_KEY_SKILLS);
      
      if (data && data.skills && data.skills.length > 0) {
        const stateMap = new Map<string, SkillNodeState>();
        data.skills.forEach(skill => {
          stateMap.set(skill.id, skill);
        });
        setSkillStates(stateMap);
        
        // Calculate unlocked phases based on completion
        const unlocked = new Set<number>([1]);
        SKILL_TREE_PHASES.forEach(phase => {
          if (phase.id === 1) return; // Phase 1 always unlocked
          
          const prevPhase = SKILL_TREE_PHASES.find(p => p.id === phase.unlockRequirement.previousPhase);
          if (prevPhase) {
            const completion = calculatePhaseCompletion(prevPhase.id, stateMap);
            const required = phase.unlockRequirement.completionPercentage || 0;
            if (completion >= required) {
              unlocked.add(phase.id);
            }
          }
        });
        setUnlockedPhases(unlocked);
      } else {
        // Initialize with default state
        await initializeSkillTree();
      }
    } catch (error) {
      console.error('Failed to load skill tree:', error);
      await initializeSkillTree();
    }
  };

  const initializeSkillTree = async (): Promise<void> => {
    const stateMap = new Map<string, SkillNodeState>();
    
    SKILL_TREE_PHASES.forEach(phase => {
      phase.skills.forEach(skill => {
        stateMap.set(skill.id, {
          id: skill.id,
          name: skill.name,
          phase: phase.id,
          level: phase.id, // Using phase as level for compatibility
          isUnlocked: phase.id === 1, // Phase 1 unlocked by default
          isComplete: false,
          proofOfWork: undefined,
          completedAt: undefined,
        });
      });
    });
    
    setSkillStates(stateMap);
    setUnlockedPhases(new Set([1]));
    await persistSkillTree(stateMap);
  };

  const calculatePhaseCompletion = (phaseId: number, stateMap: Map<string, SkillNodeState>): number => {
    const phase = SKILL_TREE_PHASES.find(p => p.id === phaseId);
    if (!phase) return 0;
    
    const phaseSkills = Array.from(stateMap.values()).filter(s => s.phase === phaseId);
    if (phaseSkills.length === 0) return 0;
    
    const completedCount = phaseSkills.filter(s => s.isComplete).length;
    return (completedCount / phaseSkills.length) * 100;
  };

  const completeSkill = async (skillId: string): Promise<void> => {
    const skill = skillStates.get(skillId);
    if (!skill || !skill.isUnlocked || skill.isComplete) return;
    
    const updatedStates = new Map(skillStates);
    updatedStates.set(skillId, {
      ...skill,
      isComplete: true,
      completedAt: new Date().toISOString(),
    });
    
    setSkillStates(updatedStates);
    
    // Check if we should unlock next phase
    await checkAndUnlockPhases(updatedStates);
    
    await persistSkillTree(updatedStates);
    onSkillComplete(skillId);
  };

  const handleSkillPress = (skillId: string): void => {
    const skill = skillStates.get(skillId);
    if (!skill) return;
    
    // If skill is complete, show proof-of-work (allow editing)
    // If skill is unlocked but not complete, show proof-of-work submission form
    if (skill.isUnlocked) {
      setSelectedSkill(skill);
      setShowProofForm(true);
    }
  };

  const handleProofSubmit = async (proofOfWork: string): Promise<void> => {
    if (!selectedSkill) return;
    
    const updatedStates = new Map(skillStates);
    updatedStates.set(selectedSkill.id, {
      ...selectedSkill,
      isComplete: true,
      proofOfWork,
      completedAt: new Date().toISOString(),
    });
    
    setSkillStates(updatedStates);
    
    // Check if we should unlock next phase
    await checkAndUnlockPhases(updatedStates);
    
    await persistSkillTree(updatedStates);
    onSkillComplete(selectedSkill.id);
    
    // Close form
    setShowProofForm(false);
    setSelectedSkill(null);
  };

  const handleProofCancel = (): void => {
    setShowProofForm(false);
    setSelectedSkill(null);
  };

  const checkAndUnlockPhases = async (stateMap: Map<string, SkillNodeState>): Promise<void> => {
    const newUnlocked = new Set(unlockedPhases);
    let hasChanges = false;

    // Check Phase 2 unlock (Phase 1 >= 80%)
    if (!newUnlocked.has(2)) {
      const phase1Completion = calculatePhaseCompletion(1, stateMap);
      if (phase1Completion >= 80) {
        newUnlocked.add(2);
        hasChanges = true;
        unlockPhaseSkills(2, stateMap);
        console.log(`Phase 2 unlocked at ${phase1Completion}% Phase 1 completion`);
      }
    }

    // Check Phase 3 unlock (Phase 2 >= 50%)
    if (!newUnlocked.has(3)) {
      const phase2Completion = calculatePhaseCompletion(2, stateMap);
      if (phase2Completion >= 50) {
        newUnlocked.add(3);
        hasChanges = true;
        unlockPhaseSkills(3, stateMap);
        console.log(`Phase 3 unlocked at ${phase2Completion}% Phase 2 completion`);
      }
    }

    // Check Phase 4 unlock (Phase 3 >= 100%)
    if (!newUnlocked.has(4)) {
      const phase3Completion = calculatePhaseCompletion(3, stateMap);
      if (phase3Completion >= 100) {
        newUnlocked.add(4);
        hasChanges = true;
        unlockPhaseSkills(4, stateMap);
        console.log(`Phase 4 unlocked at ${phase3Completion}% Phase 3 completion`);
      }
    }

    if (hasChanges) {
      setUnlockedPhases(newUnlocked);
      // Trigger unlock animation for the newly unlocked phase
      const unlockedPhaseId = Array.from(newUnlocked).find(id => !unlockedPhases.has(id));
      if (unlockedPhaseId) {
        playUnlockAnimation(unlockedPhaseId);
      }
    }
  };

  const playUnlockAnimation = (phaseId: number): void => {
    setAnimatingPhase(phaseId);
    
    // Skip animation in test environment
    if (typeof Animated === 'undefined' || !Animated.Value) {
      setTimeout(() => setAnimatingPhase(null), 100);
      return;
    }
    
    unlockAnimation.setValue(0);
    
    Animated.sequence([
      Animated.timing(unlockAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(unlockAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAnimatingPhase(null);
    });
  };

  const unlockPhaseSkills = (phaseId: number, stateMap: Map<string, SkillNodeState>): void => {
    const phase = SKILL_TREE_PHASES.find(p => p.id === phaseId);
    if (!phase) return;

    phase.skills.forEach(skill => {
      const skillState = stateMap.get(skill.id);
      if (skillState && !skillState.isUnlocked) {
        stateMap.set(skill.id, {
          ...skillState,
          isUnlocked: true,
        });
      }
    });
  };

  const persistSkillTree = async (stateMap: Map<string, SkillNodeState>): Promise<void> => {
    const skills = Array.from(stateMap.values());
    await storageManager.save(STORAGE_KEY_SKILLS, {
      skills,
      lastUpdated: new Date().toISOString(),
    });
  };

  const togglePhaseExpansion = (phaseId: number): void => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const renderPhase = (phase: PhaseDefinition): JSX.Element => {
    const isUnlocked = unlockedPhases.has(phase.id);
    const isExpanded = expandedPhases.has(phase.id);
    const completion = calculatePhaseCompletion(phase.id, skillStates);
    const isAnimating = animatingPhase === phase.id;
    
    return (
      <View key={phase.id} style={styles.phaseWrapper}>
        <TouchableOpacity
          style={styles.phaseHeaderButton}
          onPress={() => togglePhaseExpansion(phase.id)}
        >
          <View style={styles.phaseHeaderContent}>
            <Text style={styles.phaseName}>
              Phase {phase.id}: {phase.name}
            </Text>
            <Text style={styles.phaseCompletion}>
              {Math.round(completion)}% Complete
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        
        {!isUnlocked && (
          <Text style={styles.unlockMessage}>{phase.unlockMessage}</Text>
        )}
        
        {isExpanded && (
          <Suspense fallback={<LoadingIndicator />}>
            <PhaseView
              phase={phase}
              skillStates={skillStates}
              isUnlocked={isUnlocked}
              completion={completion}
              isAnimating={isAnimating}
              unlockAnimation={unlockAnimation}
              onSkillPress={handleSkillPress}
            />
          </Suspense>
        )}
      </View>
    );
  };

  const LoadingIndicator = (): JSX.Element => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.active} />
      <Text style={styles.loadingText}>Loading phase nodes...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Skill Tree</Text>
      <Text style={styles.subtitle}>Circuit Board Progression</Text>
      
      {SKILL_TREE_PHASES.map(phase => renderPhase(phase))}
      
      {/* Proof of Work Form */}
      {selectedSkill && (
        <ProofOfWorkForm
          visible={showProofForm}
          skillName={selectedSkill.name}
          existingProof={selectedSkill.proofOfWork}
          onSubmit={handleProofSubmit}
          onCancel={handleProofCancel}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.void,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.active,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.voidGray,
    marginBottom: 24,
  },
  phaseWrapper: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  phaseHeaderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  phaseHeaderContent: {
    flex: 1,
  },
  phaseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.active,
    marginBottom: 4,
  },
  phaseCompletion: {
    fontSize: 14,
    color: COLORS.growth,
  },
  expandIcon: {
    fontSize: 16,
    color: COLORS.active,
    marginLeft: 12,
  },
  unlockMessage: {
    fontSize: 12,
    color: COLORS.caution,
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.voidGray,
  },
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
  unlockNotification: {
    fontSize: 14,
    color: COLORS.growth,
    marginBottom: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nodesContainer: {
    position: 'relative',
    height: 400, // Adjust based on max nodes per phase
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
