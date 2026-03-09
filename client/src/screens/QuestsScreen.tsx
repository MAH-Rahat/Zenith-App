import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { questSystem, Quest } from '../services/QuestSystem';
import { aiEngine, MicroStep } from '../services/AIEngine';
import { animationController } from '../services/AnimationController';
import { useTransitMode } from '../contexts/TransitModeContext';

export const QuestsScreen: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [fogModeVisible, setFogModeVisible] = useState(false);
  const [newQuestDescription, setNewQuestDescription] = useState('');
  const [newQuestEnergyType, setNewQuestEnergyType] = useState<'high' | 'low'>('high');
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
    const energyColor = quest.energyType === 'high' ? '#FF0000' : '#00E5FF';
    const energyLabel = quest.energyType === 'high' ? 'HIGH ENERGY' : 'LOW ENERGY';

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
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.fogButton}
                onPress={() => setFogModeVisible(true)}
              >
                <Text style={styles.fogButtonText}>⚡ FOG MODE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.addButtonText}>+ ADD</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* High Energy Quests Section */}
          {/* Requirement 22.3: Collapse high-energy quests while Transit Mode is active */}
          <View style={styles.energySection}>
            <TouchableOpacity
              style={styles.energySectionHeader}
              onPress={() => setHighEnergyCollapsed(!highEnergyCollapsed)}
            >
              <Text style={styles.energySectionTitle}>
                {highEnergyCollapsed ? '▶' : '▼'} HIGH ENERGY
              </Text>
              <Text style={styles.energyCount}>
                {quests.filter(q => q.energyType === 'high' && !q.isComplete).length}
              </Text>
            </TouchableOpacity>
            {!highEnergyCollapsed && (
              <View style={styles.questList}>
                {quests.filter(q => q.energyType === 'high').length > 0 ? (
                  quests.filter(q => q.energyType === 'high').map(renderQuest)
                ) : (
                  <Text style={styles.emptySubtext}>No high energy quests</Text>
                )}
              </View>
            )}
          </View>
          
          {/* Low Energy Quests Section */}
          <View style={styles.energySection}>
            <View style={styles.energySectionHeader}>
              <Text style={styles.energySectionTitle}>LOW ENERGY</Text>
              <Text style={styles.energyCount}>
                {quests.filter(q => q.energyType === 'low' && !q.isComplete).length}
              </Text>
            </View>
            <View style={styles.questList}>
              {quests.filter(q => q.energyType === 'low').length > 0 ? (
                quests.filter(q => q.energyType === 'low').map(renderQuest)
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
                  HIGH ENERGY
                </Text>
                <Text style={styles.energyHint}>Pre-5 PM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.energyOption, newQuestEnergyType === 'low' && styles.energyOptionActive]}
                onPress={() => setNewQuestEnergyType('low')}
              >
                <Text style={[styles.energyOptionText, newQuestEnergyType === 'low' && styles.energyOptionTextActive]}>
                  LOW ENERGY
                </Text>
                <Text style={styles.energyHint}>Post-10 PM</Text>
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
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  fogButton: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  fogButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  addButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  addButtonText: {
    color: '#000000',
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
    padding: 20,
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 12,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxComplete: {
    backgroundColor: '#00ff00',
    borderColor: '#00ff00',
  },
  checkmark: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  questContent: {
    flex: 1,
  },
  questText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 8,
  },
  questTextComplete: {
    textDecorationLine: 'line-through',
    color: '#333333',
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
    color: '#00ff00',
    fontWeight: '700',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#1a1a1a',
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
  energySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  energyOption: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    alignItems: 'center',
  },
  energyOptionActive: {
    borderColor: '#FF0000',
    backgroundColor: '#FF000010',
  },
  energyOptionText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#666666',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  energyOptionTextActive: {
    color: '#FF0000',
  },
  energyHint: {
    fontSize: 9,
    color: '#333333',
  },
  microStepsList: {
    gap: 12,
    marginBottom: 20,
  },
  microStepItem: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  microStepNumber: {
    fontSize: 10,
    color: '#00E5FF',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  microStepText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 8,
  },
  microStepTime: {
    fontSize: 11,
    color: '#666666',
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
  energySection: {
    marginBottom: 24,
  },
  energySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginBottom: 12,
  },
  energySectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  energyCount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FF0000',
    fontFamily: 'monospace',
  },
});

