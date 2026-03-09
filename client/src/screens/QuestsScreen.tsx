import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { questSystem, Quest } from '../services/QuestSystem';
import { aiEngine, MicroStep } from '../services/AIEngine';
import { animationController } from '../services/AnimationController';
import { useTransitMode } from '../contexts/TransitModeContext';
import { colors } from '../theme/colors';

export const QuestsScreen: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [fogModeVisible, setFogModeVisible] = useState(false);
  const [newQuestDescription, setNewQuestDescription] = useState('');
  const [newQuestEnergyType, setNewQuestEnergyType] = useState<'high' | 'medium' | 'low'>('medium');
  const [fogTaskDescription, setFogTaskDescription] = useState('');
  const [fogLoading, setFogLoading] = useState(false);
  const [microSteps, setMicroSteps] = useState<MicroStep[]>([]);
  const [showMicroSteps, setShowMicroSteps] = useState(false);
  const [highEnergyCollapsed, setHighEnergyCollapsed] = useState(false);
  
  // Get Transit Mode state
  // Requirement 22.3: Collapse high-energy quests while Transit Mode is active
  const { isTransitModeActive } = useTransitMode();
  
  // Auto-collapse high-energy quests when Transit Mode activates
  useEffect(() => {
    if (isTransitModeActive) {
      setHighEnergyCollapsed(true);
    }
  }, [isTransitModeActive]);

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async (): Promise<void> => {
    try {
      setLoading(true);
      const activeQuests = await questSystem.getActiveQuests();
      setQuests(activeQuests);
    } catch (error) {
      console.error('Failed to load quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const addQuest = async (): Promise<void> => {
    if (!newQuestDescription.trim()) return;

    try {
      // Check if Atomic Task Enforcer should activate
      if (questSystem.requiresMicroSteps(newQuestDescription)) {
        alert('Task too large! Please break it down into 3 micro-steps or use Fog Mode.');
        return;
      }

      await questSystem.createQuest(
        newQuestDescription.trim(),
        newQuestEnergyType,
        newQuestEnergyType === 'high' ? 20 : 10
      );

      await loadQuests();
      setModalVisible(false);
      setNewQuestDescription('');
    } catch (error) {
      console.error('Failed to add quest:', error);
      alert('Failed to create quest');
    }
  };

  const activateFogMode = async (): Promise<void> => {
    if (!fogTaskDescription.trim()) return;

    try {
      setFogLoading(true);
      const steps = await aiEngine.breakdownTask(fogTaskDescription);
      setMicroSteps(steps);
      setShowMicroSteps(true);
    } catch (error) {
      console.error('Fog Mode failed:', error);
      const errorMsg = aiEngine.getLastError() || 'Failed to break down task';
      
      // Requirement 25.8: Display error and allow manual task creation as fallback
      alert(`${errorMsg}\n\nYou can close this dialog and use the + ADD button to create tasks manually.`);
      
      // Keep the modal open so user can try again or close to use manual creation
    } finally {
      setFogLoading(false);
    }
  };

  const saveMicroSteps = async (): Promise<void> => {
    try {
      // Create parent quest
      const parentId = await questSystem.createQuest(
        fogTaskDescription,
        'high',
        60 // 20 EXP per micro-step
      );

      // Attach micro-steps
      await questSystem.attachMicroSteps(parentId, microSteps);

      await loadQuests();
      setFogModeVisible(false);
      setFogTaskDescription('');
      setMicroSteps([]);
      setShowMicroSteps(false);
    } catch (error) {
      console.error('Failed to save micro-steps:', error);
      alert('Failed to save micro-steps');
    }
  };

  const completeQuest = async (questId: string): Promise<void> => {
    try {
      await questSystem.completeQuest(questId);
      await loadQuests();
      animationController.triggerHapticFeedback();
    } catch (error) {
      console.error('Failed to complete quest:', error);
    }
  };

  const deleteQuest = async (questId: string): Promise<void> => {
    try {
      await questSystem.deleteQuest(questId);
      await loadQuests();
    } catch (error) {
      console.error('Failed to delete quest:', error);
    }
  };

  const renderQuest = (quest: Quest) => {
    // Requirement 69.5: Energy categorization colors
    const energyColors = {
      high: colors.growth,    // #00FF66 - High energy
      medium: colors.active,  // #00E5FF - Medium energy  
      low: colors.caution,    // #FFB800 - Low energy
    };
    
    const energyLabels = {
      high: 'HIGH ENERGY',
      medium: 'MEDIUM ENERGY',
      low: 'LOW ENERGY',
    };
    
    const energyColor = energyColors[quest.energyLevel] || colors.active;
    const energyLabel = energyLabels[quest.energyLevel] || 'MEDIUM ENERGY';

    return (
      <TouchableOpacity
        key={quest.id}
        style={styles.questItem}
        onPress={() => !quest.isComplete && completeQuest(quest.id)}
        onLongPress={() => deleteQuest(quest.id)}
        disabled={quest.isComplete}
      >
        <View style={[styles.checkbox, quest.isComplete && styles.checkboxComplete]}>
          {quest.isComplete && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.questContent}>
          <Text style={[styles.questText, quest.isComplete && styles.questTextComplete]}>
            {quest.description}
          </Text>
          <View style={styles.questMeta}>
            <View style={[styles.energyBadge, { borderColor: energyColor }]}>
              <Text style={[styles.energyBadgeText, { color: energyColor }]}>{energyLabel}</Text>
            </View>
            <Text style={styles.expText}>+{quest.expValue} EXP</Text>
          </View>
        </View>
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
          <Text style={styles.title}>QUEST LOG</Text>
          <Text style={styles.subtitle}>ENERGY-BASED TASK SYSTEM</Text>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ACTIVE QUESTS</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+ ADD</Text>
            </TouchableOpacity>
          </View>
          
          {/* High Energy Quests Section */}
          {/* Requirement 69.4: Collapse high-energy quests while Transit Mode is active */}
          <View style={styles.energySection}>
            <TouchableOpacity
              style={styles.energySectionHeader}
              onPress={() => setHighEnergyCollapsed(!highEnergyCollapsed)}
            >
              <Text style={[styles.energySectionTitle, { color: colors.growth }]}>
                {highEnergyCollapsed ? '▶' : '▼'} HIGH ENERGY
              </Text>
              <Text style={styles.energyCount}>
                {quests.filter(q => q.energyLevel === 'high' && !q.isComplete).length}
              </Text>
            </TouchableOpacity>
            {!highEnergyCollapsed && (
              <View style={styles.questList}>
                {quests.filter(q => q.energyLevel === 'high').length > 0 ? (
                  quests.filter(q => q.energyLevel === 'high').map(renderQuest)
                ) : (
                  <Text style={styles.emptySubtext}>No high energy quests</Text>
                )}
              </View>
            )}
          </View>
          
          {/* Medium Energy Quests Section */}
          <View style={styles.energySection}>
            <View style={styles.energySectionHeader}>
              <Text style={[styles.energySectionTitle, { color: colors.active }]}>MEDIUM ENERGY</Text>
              <Text style={styles.energyCount}>
                {quests.filter(q => q.energyLevel === 'medium' && !q.isComplete).length}
              </Text>
            </View>
            <View style={styles.questList}>
              {quests.filter(q => q.energyLevel === 'medium').length > 0 ? (
                quests.filter(q => q.energyLevel === 'medium').map(renderQuest)
              ) : (
                <Text style={styles.emptySubtext}>No medium energy quests</Text>
              )}
            </View>
          </View>
          
          {/* Low Energy Quests Section */}
          <View style={styles.energySection}>
            <View style={styles.energySectionHeader}>
              <Text style={[styles.energySectionTitle, { color: colors.caution }]}>LOW ENERGY</Text>
              <Text style={styles.energyCount}>
                {quests.filter(q => q.energyLevel === 'low' && !q.isComplete).length}
              </Text>
            </View>
            <View style={styles.questList}>
              {quests.filter(q => q.energyLevel === 'low').length > 0 ? (
                quests.filter(q => q.energyLevel === 'low').map(renderQuest)
              ) : (
                <Text style={styles.emptySubtext}>No low energy quests</Text>
              )}
            </View>
          </View>
          
          {quests.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>NO ACTIVE QUESTS</Text>
              <Text style={styles.emptySubtext}>Tap + ADD or use FOG MODE</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fog Mode FAB - Requirement 68.4 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFogModeVisible(true)}
      >
        <Text style={styles.fabText}>⚡</Text>
      </TouchableOpacity>

      {/* Add Quest Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Quest</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Quest description"
              placeholderTextColor="#666"
              value={newQuestDescription}
              onChangeText={setNewQuestDescription}
              multiline
            />

            <View style={styles.energySelector}>
              <TouchableOpacity
                style={[styles.energyOption, newQuestEnergyType === 'high' && styles.energyOptionActive]}
                onPress={() => setNewQuestEnergyType('high')}
              >
                <Text style={[styles.energyOptionText, newQuestEnergyType === 'high' && styles.energyOptionTextActive]}>
                  HIGH
                </Text>
                <Text style={styles.energyHint}>Deep work</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.energyOption, newQuestEnergyType === 'medium' && styles.energyOptionActive]}
                onPress={() => setNewQuestEnergyType('medium')}
              >
                <Text style={[styles.energyOptionText, newQuestEnergyType === 'medium' && styles.energyOptionTextActive]}>
                  MEDIUM
                </Text>
                <Text style={styles.energyHint}>Study</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.energyOption, newQuestEnergyType === 'low' && styles.energyOptionActive]}
                onPress={() => setNewQuestEnergyType('low')}
              >
                <Text style={[styles.energyOptionText, newQuestEnergyType === 'low' && styles.energyOptionTextActive]}>
                  LOW
                </Text>
                <Text style={styles.energyHint}>Light tasks</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addQuest}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fog Mode Modal */}
      <Modal
        visible={fogModeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFogModeVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚡ FOG MODE</Text>
            <Text style={styles.modalSubtitle}>AI-powered task breakdown</Text>
            
            {!showMicroSteps ? (
              <>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your overwhelming task..."
                  placeholderTextColor="#666"
                  value={fogTaskDescription}
                  onChangeText={setFogTaskDescription}
                  multiline
                  numberOfLines={4}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setFogModeVisible(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={activateFogMode}
                    disabled={fogLoading}
                  >
                    {fogLoading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.buttonText}>Break Down</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.microStepsList}>
                  {microSteps.map((step, index) => (
                    <View key={index} style={styles.microStepItem}>
                      <Text style={styles.microStepNumber}>Step {step.step}</Text>
                      <Text style={styles.microStepText}>{step.description}</Text>
                      <Text style={styles.microStepTime}>~{step.estimatedMinutes} min</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowMicroSteps(false);
                      setMicroSteps([]);
                    }}
                  >
                    <Text style={styles.buttonText}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={saveMicroSteps}
                  >
                    <Text style={styles.buttonText}>Save Quests</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    padding: 20,
    paddingTop: 50,
    paddingBottom: 100, // Space for FAB
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: colors.active,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.active,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.void,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  questList: {
    gap: 12,
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxComplete: {
    backgroundColor: colors.growth,
    borderColor: colors.growth,
  },
  checkmark: {
    color: colors.void,
    fontSize: 14,
    fontWeight: '900',
  },
  questContent: {
    flex: 1,
  },
  questText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 8,
  },
  questTextComplete: {
    textDecorationLine: 'line-through',
    color: colors.disabled,
  },
  questMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  energyBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  energyBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  expText: {
    fontSize: 11,
    color: colors.growth,
    fontWeight: '700',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.disabled,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  emptySubtext: {
    color: colors.border,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 1,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.void,
    borderRadius: 16,
    padding: 16,
    color: colors.text,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  energySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  energyOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 44,
  },
  energyOptionActive: {
    borderColor: colors.active,
    backgroundColor: colors.surfaceRaised,
  },
  energyOptionText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  energyOptionTextActive: {
    color: colors.active,
  },
  energyHint: {
    fontSize: 9,
    color: colors.disabled,
  },
  microStepsList: {
    gap: 12,
    marginBottom: 20,
  },
  microStepItem: {
    backgroundColor: colors.void,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  microStepNumber: {
    fontSize: 10,
    color: colors.active,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  microStepText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  microStepTime: {
    fontSize: 11,
    color: colors.textSecondary,
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
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.active,
  },
  buttonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  energySection: {
    marginBottom: 24,
  },
  energySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    minHeight: 44,
  },
  energySectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1.5,
  },
  energyCount: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.active,
    fontFamily: 'monospace',
  },
  // FAB with glassmorphism effect - Requirement 68.4
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.active,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.active,
    // Glassmorphism effect
    opacity: 0.95,
  },
  fabText: {
    fontSize: 32,
    color: colors.void,
  },
});

