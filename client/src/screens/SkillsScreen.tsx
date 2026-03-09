import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { skillTree, SkillNode, Phase } from '../services/SkillTree';
import { animationController } from '../services/AnimationController';
import { useTransitMode } from '../contexts/TransitModeContext';

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
    let backgroundColor = '#0a0a0a';
    let borderColor = '#1a1a1a';
    let textColor = '#333333';
    
    if (node.completionPercentage === 100) {
      backgroundColor = '#00ff0010';
      borderColor = '#00ff00';
      textColor = '#00ff00';
    } else if (!node.isLocked) {
      backgroundColor = '#0a0a0a';
      borderColor = '#00E5FF';
      textColor = '#ffffff';
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
        <ActivityIndicator size="large" color="#FF0000" />
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
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 50,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  phaseContainer: {
    marginBottom: 32,
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
    fontWeight: '900',
    color: '#FF0000',
    letterSpacing: 1,
  },
  phaseName: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  phaseMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseProgress: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '700',
  },
  unlockedBadge: {
    backgroundColor: '#00ff0010',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  unlockedBadgeText: {
    fontSize: 9,
    color: '#00ff00',
    fontWeight: '900',
    letterSpacing: 1,
  },
  lockedBadge: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#333333',
  },
  lockedBadgeText: {
    fontSize: 9,
    color: '#333333',
    fontWeight: '900',
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
    borderRadius: 24,
    borderWidth: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  skillName: {
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 1,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputHint: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 16,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
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
    borderRadius: 9999,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1a1a1a',
  },
  confirmButton: {
    backgroundColor: '#FF0000',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
