/**
 * QuestSystem.tsx
 * 
 * Quest management component with energy categorization, two-column UI,
 * and integration with EXPSystem for quest completion rewards.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 69.1, 69.2, 69.3, 69.5
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { questSystem, Quest } from '../services/QuestSystem';
import { theme } from '../theme';

interface QuestSystemProps {
  onQuestComplete?: (questId: string, expValue: number) => void;
}

export const QuestSystem: React.FC<QuestSystemProps> = ({ onQuestComplete }) => {
  const [mainQuests, setMainQuests] = useState<Quest[]>([]);
  const [sideQuests, setSideQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newQuestDescription, setNewQuestDescription] = useState('');
  const [newQuestEXP, setNewQuestEXP] = useState('20');
  const [newQuestEnergy, setNewQuestEnergy] = useState<'high' | 'medium' | 'low'>('medium');
  
  // Atomic Task Enforcer state
  const [showAtomicEnforcer, setShowAtomicEnforcer] = useState(false);
  const [microStep1, setMicroStep1] = useState('');
  const [microStep2, setMicroStep2] = useState('');
  const [microStep3, setMicroStep3] = useState('');
  const [atomicTaskDescription, setAtomicTaskDescription] = useState('');

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    try {
      setLoading(true);
      const main = await questSystem.getQuestsByType('main');
      const side = await questSystem.getQuestsByType('side');
      setMainQuests(main);
      setSideQuests(side);
    } catch (error) {
      console.error('Failed to load quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteQuest = async (questId: string, expValue: number) => {
    try {
      await questSystem.completeQuest(questId);
      await loadQuests();
      onQuestComplete?.(questId, expValue);
    } catch (error) {
      console.error('Failed to complete quest:', error);
    }
  };

  const handleAddSideQuest = async () => {
    if (!newQuestDescription.trim()) {
      return;
    }

    // Atomic Task Enforcer: Check if description exceeds 50 characters
    if (newQuestDescription.length > 50) {
      setAtomicTaskDescription(newQuestDescription);
      setNewQuestDescription('');
      setShowModal(false);
      setShowAtomicEnforcer(true);
      return;
    }

    try {
      const expValue = parseInt(newQuestEXP) || 20;
      await questSystem.addSideQuest(newQuestDescription, newQuestEnergy, expValue);
      setNewQuestDescription('');
      setNewQuestEXP('20');
      setNewQuestEnergy('medium');
      setShowModal(false);
      await loadQuests();
    } catch (error) {
      console.error('Failed to add side quest:', error);
    }
  };

  const handleCreateMicroStepQuests = async () => {
    // Validate all 3 micro-steps are provided and minimum 5 characters each
    const steps = [microStep1.trim(), microStep2.trim(), microStep3.trim()];
    
    if (steps.some(step => step.length < 5)) {
      // Validation failed - don't create quests
      return;
    }

    try {
      const expValue = parseInt(newQuestEXP) || 20;
      
      // Create 3 separate quests from micro-steps
      for (const step of steps) {
        await questSystem.addSideQuest(step, newQuestEnergy, expValue);
      }

      // Reset state
      setMicroStep1('');
      setMicroStep2('');
      setMicroStep3('');
      setAtomicTaskDescription('');
      setNewQuestEXP('20');
      setNewQuestEnergy('medium');
      setShowAtomicEnforcer(false);
      await loadQuests();
    } catch (error) {
      console.error('Failed to create micro-step quests:', error);
    }
  };

  const isAtomicEnforcerValid = (): boolean => {
    return (
      microStep1.trim().length >= 5 &&
      microStep2.trim().length >= 5 &&
      microStep3.trim().length >= 5
    );
  };

  const getEnergyColor = (energyLevel: 'high' | 'medium' | 'low'): string => {
    switch (energyLevel) {
      case 'high':
        return theme.colors.growth; // #00FF66
      case 'medium':
        return theme.colors.active; // #00E5FF
      case 'low':
        return theme.colors.caution; // #FFB800
    }
  };

  const groupQuestsByEnergy = (quests: Quest[]) => {
    return {
      high: quests.filter(q => q.energyLevel === 'high'),
      medium: quests.filter(q => q.energyLevel === 'medium'),
      low: quests.filter(q => q.energyLevel === 'low'),
    };
  };

  const renderQuestItem = (quest: Quest) => (
    <TouchableOpacity
      key={quest.id}
      style={styles.questItem}
      onPress={() => handleCompleteQuest(quest.id, quest.expValue)}
    >
      <View style={[styles.checkbox, quest.isComplete && styles.checkboxChecked]}>
        {quest.isComplete && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.questContent}>
        <Text style={[styles.questText, quest.isComplete && styles.questTextComplete]}>
          {quest.description}
        </Text>
        <View style={styles.questMeta}>
          <View style={[styles.energyBadge, { borderColor: getEnergyColor(quest.energyLevel) }]}>
            <Text style={[styles.energyText, { color: getEnergyColor(quest.energyLevel) }]}>
              {quest.energyLevel.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.expText}>+{quest.expValue} EXP</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderQuestColumn = (title: string, quests: Quest[]) => {
    const grouped = groupQuestsByEnergy(quests);

    return (
      <View style={styles.column}>
        <Text style={styles.columnTitle}>{title}</Text>
        
        {grouped.high.length > 0 && (
          <View style={styles.energyGroup}>
            <Text style={[styles.energyGroupTitle, { color: theme.colors.growth }]}>
              High Energy
            </Text>
            {grouped.high.map(renderQuestItem)}
          </View>
        )}

        {grouped.medium.length > 0 && (
          <View style={styles.energyGroup}>
            <Text style={[styles.energyGroupTitle, { color: theme.colors.active }]}>
              Medium Energy
            </Text>
            {grouped.medium.map(renderQuestItem)}
          </View>
        )}

        {grouped.low.length > 0 && (
          <View style={styles.energyGroup}>
            <Text style={[styles.energyGroupTitle, { color: theme.colors.caution }]}>
              Low Energy
            </Text>
            {grouped.low.map(renderQuestItem)}
          </View>
        )}

        {quests.length === 0 && (
          <Text style={styles.emptyText}>No quests</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.active} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.columnsContainer}>
        {renderQuestColumn('Main Quest (Academia)', mainQuests)}
        
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>Side Quests (Custom)</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          
          {renderQuestColumn('', sideQuests).props.children.slice(1)}
        </View>
      </View>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Side Quest</Text>

            <TextInput
              style={styles.input}
              placeholder="Quest description"
              placeholderTextColor={theme.colors.void}
              value={newQuestDescription}
              onChangeText={setNewQuestDescription}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="EXP value"
              placeholderTextColor={theme.colors.void}
              value={newQuestEXP}
              onChangeText={setNewQuestEXP}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Energy Level</Text>
            <View style={styles.energySelector}>
              {(['high', 'medium', 'low'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.energyOption,
                    { borderColor: getEnergyColor(level) },
                    newQuestEnergy === level && styles.energyOptionSelected,
                  ]}
                  onPress={() => setNewQuestEnergy(level)}
                >
                  <Text
                    style={[
                      styles.energyOptionText,
                      { color: getEnergyColor(level) },
                    ]}
                  >
                    {level.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddSideQuest}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Atomic Task Enforcer Modal */}
      <Modal
        visible={showAtomicEnforcer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAtomicEnforcer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Break Down Task</Text>
            
            <Text style={styles.atomicWarning}>
              Task too complex ({atomicTaskDescription.length} chars). Break it into 3 micro-steps (min 5 chars each):
            </Text>

            <Text style={styles.atomicOriginalTask}>"{atomicTaskDescription}"</Text>

            <Text style={styles.label}>Micro-step 1 {microStep1.trim().length >= 5 ? '✓' : `(${microStep1.trim().length}/5)`}</Text>
            <TextInput
              style={[
                styles.input,
                microStep1.trim().length >= 5 && styles.inputValid,
              ]}
              placeholder="First micro-step (min 5 characters)"
              placeholderTextColor={theme.colors.void}
              value={microStep1}
              onChangeText={setMicroStep1}
              multiline
            />

            <Text style={styles.label}>Micro-step 2 {microStep2.trim().length >= 5 ? '✓' : `(${microStep2.trim().length}/5)`}</Text>
            <TextInput
              style={[
                styles.input,
                microStep2.trim().length >= 5 && styles.inputValid,
              ]}
              placeholder="Second micro-step (min 5 characters)"
              placeholderTextColor={theme.colors.void}
              value={microStep2}
              onChangeText={setMicroStep2}
              multiline
            />

            <Text style={styles.label}>Micro-step 3 {microStep3.trim().length >= 5 ? '✓' : `(${microStep3.trim().length}/5)`}</Text>
            <TextInput
              style={[
                styles.input,
                microStep3.trim().length >= 5 && styles.inputValid,
              ]}
              placeholder="Third micro-step (min 5 characters)"
              placeholderTextColor={theme.colors.void}
              value={microStep3}
              onChangeText={setMicroStep3}
              multiline
            />

            <Text style={styles.label}>Energy Level</Text>
            <View style={styles.energySelector}>
              {(['high', 'medium', 'low'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.energyOption,
                    { borderColor: getEnergyColor(level) },
                    newQuestEnergy === level && styles.energyOptionSelected,
                  ]}
                  onPress={() => setNewQuestEnergy(level)}
                >
                  <Text
                    style={[
                      styles.energyOptionText,
                      { color: getEnergyColor(level) },
                    ]}
                  >
                    {level.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAtomicEnforcer(false);
                  setMicroStep1('');
                  setMicroStep2('');
                  setMicroStep3('');
                  setAtomicTaskDescription('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  !isAtomicEnforcerValid() && styles.buttonDisabled,
                ]}
                onPress={handleCreateMicroStepQuests}
                disabled={!isAtomicEnforcerValid()}
              >
                <Text style={styles.buttonText}>Create 3 Quests</Text>
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
    backgroundColor: theme.colors.void,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.void,
  },
  columnsContainer: {
    flexDirection: 'row',
    flex: 1,
    padding: 16,
    gap: 12,
  },
  column: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  columnTitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.active,
    marginBottom: 16,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.active,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.void,
  },
  energyGroup: {
    marginBottom: 16,
  },
  energyGroupTitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.growth,
    borderColor: theme.colors.growth,
  },
  checkmark: {
    color: theme.colors.void,
    fontSize: 14,
    fontWeight: '600',
  },
  questContent: {
    flex: 1,
  },
  questText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  questTextComplete: {
    textDecorationLine: 'line-through',
    color: theme.colors.void,
  },
  questMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  energyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  energyText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: '600',
  },
  expText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: theme.colors.growth,
  },
  emptyText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: theme.colors.void,
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
  },
  modalTitle: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.active,
    marginBottom: 20,
  },
  label: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  energySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  energyOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  energyOptionSelected: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  energyOptionText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  confirmButton: {
    backgroundColor: theme.colors.active,
  },
  buttonText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  atomicWarning: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: theme.colors.caution,
    marginBottom: 12,
    lineHeight: 20,
  },
  atomicOriginalTask: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: theme.colors.void,
    fontStyle: 'italic',
    marginBottom: 20,
    padding: 12,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputValid: {
    borderColor: theme.colors.growth,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
