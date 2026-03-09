import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { skillTree, SkillNode, Phase } from '../services/SkillTree';
import { animationController } from '../services/AnimationController';
import { useTransitMode } from '../contexts/TransitModeContext';
import { colors } from '../theme/colors';

export const SkillsScreen: React.FC = () => {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [proofOfWork, setProofOfWork] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  
  // Get Transit Mode state
  // Requirement 22.4: Lock Skill Tree with "Available after Transit Mode" message
  const { isTransitModeActive } = useTransitMode();

  useEffect(() => {
    loadSkillTree();
  }, []);

  const loadSkillTree = async (): Promise<void> => {
    try {
      setLoading(true);
      const [allPhases, allNodes] = await Promise.all([
        skillTree.getAllPhases(),
        skillTree.getAllNodes()
      ]);
      setPhases(allPhases);
      setNodes(allNodes);
    } catch (error) {
      console.error('Failed to load skill tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNodeModal = (node: SkillNode): void => {
    // Requirement 22.4: Lock Skill Tree during Transit Mode
    if (isTransitModeActive) {
      alert('Available after Transit Mode');
      return;
    }
    
    if (node.isLocked || node.completionPercentage === 100) {
      return;
    }
    setSelectedNode(node);
    setProofOfWork(node.proofOfWork || '');
    setModalVisible(true);
  };

  const completeNode = async (): Promise<void> => {
    if (!selectedNode || !proofOfWork.trim()) {
      alert('Please provide proof of work (GitHub link or summary)');
      return;
    }

    try {
      await skillTree.completeNode(selectedNode.id, proofOfWork.trim());
      await loadSkillTree();
      setModalVisible(false);
      setSelectedNode(null);
      setProofOfWork('');
      animationController.triggerHapticFeedback();
    } catch (error) {
      console.error('Failed to complete node:', error);
      alert('Failed to complete skill node');
    }
  };

  const getNodesByPhase = (phaseNumber: number): SkillNode[] => {
    return nodes.filter(node => node.phase === phaseNumber);
  };

  const renderSkillNode = (node: SkillNode): React.ReactElement => {
    let backgroundColor = colors.surface;
    let borderColor = colors.border;
    let textColor = colors.disabled;
    
    if (node.completionPercentage === 100) {
      backgroundColor = colors.surface;
      borderColor = colors.growth;
      textColor = colors.growth;
    } else if (!node.isLocked) {
      backgroundColor = colors.surface;
      borderColor = colors.active;
      textColor = colors.text;
    }

    return (
      <TouchableOpacity
        key={node.id}
        style={[styles.skillNode, { backgroundColor, borderColor }]}
        onPress={() => openNodeModal(node)}
        disabled={node.isLocked || node.completionPercentage === 100}
      >
        <Text style={[styles.skillName, { color: textColor }]}>
          {node.name}
        </Text>
        {node.completionPercentage === 100 && <Text style={styles.checkmark}>✓</Text>}
        {node.isLocked && <Text style={styles.lockIcon}>🔒</Text>}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.active} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>SKILL TREE</Text>
          <Text style={styles.subtitle}>4-PHASE CAREER ROADMAP</Text>
        </View>
        
        {phases.map(phase => {
          const phaseNodes = getNodesByPhase(phase.number);
          
          return (
            <View key={phase.number} style={styles.phaseContainer}>
              <View style={styles.phaseHeader}>
                <View style={styles.phaseTitleRow}>
                  <Text style={styles.phaseNumber}>PHASE {phase.number}</Text>
                  <Text style={styles.phaseName}>{phase.name}</Text>
                </View>
                <View style={styles.phaseMetaRow}>
                  <Text style={styles.phaseProgress}>{phase.completionPercentage}% Complete</Text>
                  {phase.isLocked ? (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedBadgeText}>🔒 {phase.unlockCondition}</Text>
                    </View>
                  ) : (
                    <View style={styles.unlockedBadge}>
                      <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.skillsGrid}>
                {phaseNodes.map(node => renderSkillNode(node))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Node Completion Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedNode?.name}</Text>
            <Text style={styles.modalSubtitle}>Phase {selectedNode?.phase}</Text>
            
            <Text style={styles.inputLabel}>Proof of Work</Text>
            <Text style={styles.inputHint}>
              Provide a GitHub link or one-sentence summary of what you learned
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="GitHub link or summary..."
              placeholderTextColor="#666"
              value={proofOfWork}
              onChangeText={setProofOfWork}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedNode(null);
                  setProofOfWork('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={completeNode}
                disabled={!proofOfWork.trim()}
              >
                <Text style={styles.buttonText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.void,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
    fontWeight: '600',
  },
  phaseContainer: {
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  phaseHeader: {
    marginBottom: 16,
  },
  phaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  phaseNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.active,
    letterSpacing: 1,
  },
  phaseName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  phaseMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseProgress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  unlockedBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.growth,
  },
  unlockedBadgeText: {
    fontSize: 10,
    color: colors.growth,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lockedBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockedBadgeText: {
    fontSize: 10,
    color: colors.disabled,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillNode: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 100,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkmark: {
    fontSize: 16,
    marginTop: 4,
  },
  lockIcon: {
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.active,
    borderWidth: 1,
    borderColor: colors.active,
  },
  buttonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
