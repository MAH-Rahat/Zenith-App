import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator, Switch } from 'react-native';
import { aiEngine } from '../services/AIEngine';
import { databaseManager } from '../services/DatabaseManager';
import { proofOfWorkCompiler } from '../services/ProofOfWorkCompiler';
import { gameRulesManager, EXPRuleKey } from '../services/GameRulesManager';
import { transitModeService } from '../services/TransitModeService';
import { ExamDateEditor } from '../components/ExamDateEditor';
import { PoWCompiler } from '../components/PoWCompiler';
import { Clipboard } from 'react-native';
import { colors } from '../theme/colors';

/**
 * SettingsScreen Component
 * 
 * Requirements: 68.7, 2.7, 24.1, 36.1, 60.4, 61.6
 * 
 * Displays:
 * - API key management (Gemini, GitHub) - Req 60.4, 61.6
 * - Transit Mode toggle - Req 24.1
 * - Backup export/import buttons - Req 2.7
 * - PoW Compiler access - Req 36.1
 * - Exam date editor
 * - EXP_RULES editor (for testing)
 * 
 * Design System:
 * - Neon Brutalist aesthetic with zero shadows
 * - Color tokens from theme/colors.ts
 * - DM Sans for UI text, JetBrains Mono for data
 * - 1px borders, 20px border radius
 * - Minimum 44×44dp touch targets
 */

export const SettingsScreen: React.FC = () => {
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [powCompilerVisible, setPowCompilerVisible] = useState(false);
  const [expRulesModalVisible, setExpRulesModalVisible] = useState(false);
  const [examDateEditorVisible, setExamDateEditorVisible] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [transitModeEnabled, setTransitModeEnabled] = useState(true);
  const [expRules, setExpRules] = useState<Record<EXPRuleKey, number>>({
    academic_task: 10,
    coding_quest: 20,
    project_deployed: 100,
    pomodoro_success: 20,
    pomodoro_failure: -5,
  });
  const [editingRules, setEditingRules] = useState<Record<EXPRuleKey, string>>({
    academic_task: '10',
    coding_quest: '20',
    project_deployed: '100',
    pomodoro_success: '20',
    pomodoro_failure: '-5',
  });

  useEffect(() => {
    loadMaskedKey();
    loadExpRules();
    loadTransitModeSettings();
  }, []);

  const loadMaskedKey = async () => {
    const masked = await aiEngine.getMaskedApiKey();
    setMaskedKey(masked || 'Not configured');
  };

  const loadExpRules = async () => {
    try {
      await gameRulesManager.loadCustomRules();
      const rules = gameRulesManager.getAllRules();
      setExpRules(rules);
      setEditingRules({
        academic_task: rules.academic_task.toString(),
        coding_quest: rules.coding_quest.toString(),
        project_deployed: rules.project_deployed.toString(),
        pomodoro_success: rules.pomodoro_success.toString(),
        pomodoro_failure: rules.pomodoro_failure.toString(),
      });
    } catch (error) {
      console.error('Failed to load EXP rules:', error);
    }
  };

  const loadTransitModeSettings = async () => {
    try {
      const isDisabled = transitModeService.isManuallyDisabled();
      setTransitModeEnabled(!isDisabled);
    } catch (error) {
      console.error('Failed to load Transit Mode settings:', error);
    }
  };

  const toggleTransitMode = async (value: boolean) => {
    try {
      setTransitModeEnabled(value);
      // Requirement 24.2, 24.3, 24.4: Manual override for Transit Mode
      await transitModeService.setManualOverride(!value);
      Alert.alert(
        'Transit Mode Updated',
        value 
          ? 'Transit Mode will activate automatically from 5-10 PM'
          : 'Transit Mode automatic activation disabled'
      );
    } catch (error) {
      console.error('Failed to toggle Transit Mode:', error);
      Alert.alert('Error', 'Failed to update Transit Mode setting');
      // Revert on error
      setTransitModeEnabled(!value);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    try {
      setValidating(true);
      await aiEngine.setApiKey(apiKey.trim());
      
      const isValid = await aiEngine.validateApiKey();
      if (isValid) {
        Alert.alert('Success', 'API key saved and validated');
        await loadMaskedKey();
        setApiKeyModalVisible(false);
        setApiKey('');
      } else {
        const error = aiEngine.getLastError();
        Alert.alert('Invalid Key', error || 'API key validation failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setValidating(false);
    }
  };

  const exportData = async () => {
    try {
      const jsonData = await databaseManager.export();
      // In a real app, you'd save this to a file
      Alert.alert('Export Ready', `Data exported: ${(jsonData.length / 1024).toFixed(2)} KB`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const openExpRulesEditor = () => {
    setExpRulesModalVisible(true);
  };

  const saveExpRules = async () => {
    try {
      // Validate all inputs
      const keys: EXPRuleKey[] = ['academic_task', 'coding_quest', 'project_deployed', 'pomodoro_success', 'pomodoro_failure'];
      
      for (const key of keys) {
        const value = parseInt(editingRules[key], 10);
        if (isNaN(value)) {
          Alert.alert('Invalid Input', `Please enter a valid number for ${gameRulesManager.getRuleLabel(key)}`);
          return;
        }
      }

      // Save all rules
      for (const key of keys) {
        const value = parseInt(editingRules[key], 10);
        await gameRulesManager.setCustomRule(key, value);
      }

      // Reload rules
      await loadExpRules();
      
      Alert.alert('Success', 'EXP rules saved successfully');
      setExpRulesModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save EXP rules');
    }
  };

  const resetExpRules = async () => {
    Alert.alert(
      'Reset EXP Rules',
      'Are you sure you want to reset all EXP rules to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await gameRulesManager.resetAllRules();
              await loadExpRules();
              Alert.alert('Success', 'EXP rules reset to defaults');
              setExpRulesModalVisible(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to reset EXP rules');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>SETTINGS</Text>
        <Text style={styles.subtitle}>CONFIGURATION & TOOLS</Text>
      </View>

      {/* AI Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI CONFIGURATION</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Gemini API Key</Text>
            <Text style={styles.settingValue}>{maskedKey}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => setApiKeyModalVisible(true)}
            accessible={true}
            accessibilityLabel="Configure Gemini API Key"
            accessibilityRole="button"
          >
            <Text style={styles.settingButtonText}>CONFIGURE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Game Balance (Testing) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GAME BALANCE (TESTING)</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>EXP Rules</Text>
            <Text style={styles.settingValue}>
              Academic: {expRules.academic_task} | Coding: {expRules.coding_quest} | Project: {expRules.project_deployed}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={openExpRulesEditor}
            accessible={true}
            accessibilityLabel="Edit EXP Rules"
            accessibilityRole="button"
          >
            <Text style={styles.settingButtonText}>EDIT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transit Mode */}
      {/* Requirement 24.1: Display Transit Mode toggle in Settings tab */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TRANSIT MODE</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Activate (5-10 PM)</Text>
            <Text style={styles.settingValue}>
              {transitModeEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Switch
            value={transitModeEnabled}
            onValueChange={toggleTransitMode}
            trackColor={{ false: colors.border, true: colors.caution }}
            thumbColor={transitModeEnabled ? colors.text : colors.textSecondary}
          />
        </View>
      </View>

      {/* Exam Dates */}
      {/* Requirement 20.6: Allow editing exam dates in Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EXAM DATES</Text>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setExamDateEditorVisible(true)}
          accessible={true}
          accessibilityLabel="Edit Exam Dates"
          accessibilityRole="button"
        >
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Edit Exam Dates</Text>
            <Text style={styles.actionDescription}>
              Update countdown widget dates for CSE321, CSE341, CSE422, CSE423
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PROGRESS REPORTS</Text>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setPowCompilerVisible(true)}
          accessible={true}
          accessibilityLabel="Generate Progress Report"
          accessibilityRole="button"
        >
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Generate Progress Report</Text>
            <Text style={styles.actionDescription}>
              Export completed skill nodes as Markdown
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
        
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={exportData}
          accessible={true}
          accessibilityLabel="Export Data"
          accessibilityRole="button"
        >
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Export Data</Text>
            <Text style={styles.actionDescription}>
              Backup all data as JSON
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>2.0.0 (Phase 2)</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Database</Text>
          <Text style={styles.infoValue}>SQLite (Offline-First)</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>AI Engine</Text>
          <Text style={styles.infoValue}>Google Gemini API</Text>
        </View>
      </View>

      {/* API Key Modal */}
      <Modal visible={apiKeyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure API Key</Text>
            <Text style={styles.modalSubtitle}>
              Enter your Google Gemini API key for Fog Mode
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="API Key"
              placeholderTextColor="#666"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoCapitalize="none"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setApiKeyModalVisible(false);
                  setApiKey('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveApiKey}
                disabled={validating}
              >
                {validating ? (
                  <ActivityIndicator color={colors.void} />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exam Date Editor Modal */}
      <ExamDateEditor
        visible={examDateEditorVisible}
        onClose={() => setExamDateEditorVisible(false)}
        onSave={() => {
          // Optionally refresh exam data in parent components
          console.log('Exam dates updated');
        }}
      />

      {/* PoW Compiler Modal */}
      {/* Requirement 36.1: PoW_Compiler accessible from Settings tab */}
      <PoWCompiler
        visible={powCompilerVisible}
        onClose={() => setPowCompilerVisible(false)}
      />

      {/* EXP Rules Editor Modal */}
      <Modal visible={expRulesModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit EXP Rules</Text>
            <Text style={styles.modalSubtitle}>
              Customize EXP rewards for testing and balancing
            </Text>
            
            <ScrollView style={styles.rulesContainer}>
              {/* Academic Task */}
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>Academic Task</Text>
                <TextInput
                  style={styles.ruleInput}
                  value={editingRules.academic_task}
                  onChangeText={(text) => setEditingRules({ ...editingRules, academic_task: text })}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Coding Quest */}
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>Coding Quest</Text>
                <TextInput
                  style={styles.ruleInput}
                  value={editingRules.coding_quest}
                  onChangeText={(text) => setEditingRules({ ...editingRules, coding_quest: text })}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Project Deployed */}
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>Project Deployed</Text>
                <TextInput
                  style={styles.ruleInput}
                  value={editingRules.project_deployed}
                  onChangeText={(text) => setEditingRules({ ...editingRules, project_deployed: text })}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Pomodoro Success */}
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>Pomodoro Success</Text>
                <TextInput
                  style={styles.ruleInput}
                  value={editingRules.pomodoro_success}
                  onChangeText={(text) => setEditingRules({ ...editingRules, pomodoro_success: text })}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Pomodoro Failure */}
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>Pomodoro Failure (Penalty)</Text>
                <TextInput
                  style={styles.ruleInput}
                  value={editingRules.pomodoro_failure}
                  onChangeText={(text) => setEditingRules({ ...editingRules, pomodoro_failure: text })}
                  keyboardType="numeric"
                  placeholder="-5"
                  placeholderTextColor="#666"
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setExpRulesModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.resetButton]}
                onPress={resetExpRules}
              >
                <Text style={styles.buttonText}>Reset</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveExpRules}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void, // Pure black screen background
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
    color: colors.text, // White text
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textSecondary, // Gray text for secondary content
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  settingCard: {
    backgroundColor: colors.surface, // Dark gray card background
    borderRadius: 20, // Bento grid 20px border radius
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border, // 1px border
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44, // Minimum 44dp touch target
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  settingButton: {
    backgroundColor: colors.active, // Neon cyan for interactive elements
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    minHeight: 44, // Minimum 44dp touch target
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingButtonText: {
    color: colors.void, // Black text on neon background
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 44,
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  actionArrow: {
    fontSize: 24,
    color: colors.active, // Neon cyan for interactive indicator
    fontWeight: '900',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
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
  reportModal: {
    height: '80%',
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
    lineHeight: 18,
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
  },
  reportPreview: {
    flex: 1,
    backgroundColor: colors.void,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 20,
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
    minHeight: 44, // Minimum 44dp touch target
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButton: {
    backgroundColor: colors.caution, // Neon yellow for caution action
  },
  confirmButton: {
    backgroundColor: colors.active, // Neon cyan for primary action
  },
  buttonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rulesContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  ruleItem: {
    marginBottom: 16,
  },
  ruleLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  ruleInput: {
    backgroundColor: colors.void,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
