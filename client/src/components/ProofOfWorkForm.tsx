/**
 * ProofOfWorkForm.tsx
 * 
 * Proof-of-work submission form for skill tree nodes.
 * Accepts GitHub URL OR text summary (minimum 20 characters).
 * Validates GitHub URL format and summary text length.
 * 
 * Requirements: 14.3, 14.4, 19.1, 19.2, 19.3
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

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

interface ProofOfWorkFormProps {
  visible: boolean;
  skillName: string;
  existingProof?: string;
  onSubmit: (proofOfWork: string) => void;
  onCancel: () => void;
}

export const ProofOfWorkForm: React.FC<ProofOfWorkFormProps> = ({
  visible,
  skillName,
  existingProof,
  onSubmit,
  onCancel,
}) => {
  const [inputType, setInputType] = useState<'github' | 'summary'>('github');
  const [githubUrl, setGithubUrl] = useState(existingProof && existingProof.includes('github.com') ? existingProof : '');
  const [summary, setSummary] = useState(existingProof && !existingProof.includes('github.com') ? existingProof : '');
  const [error, setError] = useState<string>('');

  const validateGitHubUrl = (url: string): boolean => {
    // Validate GitHub URL format matches github.com pattern
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/.+/i;
    return githubPattern.test(url.trim());
  };

  const validateSummary = (text: string): boolean => {
    // Validate summary text minimum 20 characters
    return text.trim().length >= 20;
  };

  const handleSubmit = (): void => {
    setError('');

    if (inputType === 'github') {
      if (!githubUrl.trim()) {
        setError('GitHub URL is required');
        return;
      }
      if (!validateGitHubUrl(githubUrl)) {
        setError('Invalid GitHub URL format. Must match github.com pattern');
        return;
      }
      onSubmit(githubUrl.trim());
    } else {
      if (!summary.trim()) {
        setError('Summary text is required');
        return;
      }
      if (!validateSummary(summary)) {
        setError('Summary must be at least 20 characters');
        return;
      }
      onSubmit(summary.trim());
    }

    // Reset form
    setGithubUrl('');
    setSummary('');
    setError('');
  };

  const handleCancel = (): void => {
    setError('');
    onCancel();
  };

  const switchInputType = (type: 'github' | 'summary'): void => {
    setInputType(type);
    setError('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Proof of Work</Text>
            <Text style={styles.skillName}>{skillName}</Text>

            {/* Input Type Selector */}
            <View style={styles.inputTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.inputTypeButton,
                  inputType === 'github' && styles.inputTypeButtonActive,
                ]}
                onPress={() => switchInputType('github')}
              >
                <Text
                  style={[
                    styles.inputTypeButtonText,
                    inputType === 'github' && styles.inputTypeButtonTextActive,
                  ]}
                >
                  GitHub URL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.inputTypeButton,
                  inputType === 'summary' && styles.inputTypeButtonActive,
                ]}
                onPress={() => switchInputType('summary')}
              >
                <Text
                  style={[
                    styles.inputTypeButtonText,
                    inputType === 'summary' && styles.inputTypeButtonTextActive,
                  ]}
                >
                  Text Summary
                </Text>
              </TouchableOpacity>
            </View>

            {/* GitHub URL Input */}
            {inputType === 'github' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>GitHub Repository URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={githubUrl}
                  onChangeText={setGithubUrl}
                  placeholder="https://github.com/username/repo"
                  placeholderTextColor={COLORS.voidGray}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Text style={styles.inputHint}>
                  Must be a valid GitHub URL (github.com)
                </Text>
              </View>
            )}

            {/* Summary Text Input */}
            {inputType === 'summary' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Summary (min 20 characters)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={summary}
                  onChangeText={setSummary}
                  placeholder="Describe what you built or learned..."
                  placeholderTextColor={COLORS.voidGray}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.inputHint}>
                  {summary.trim().length}/20 characters minimum
                </Text>
              </View>
            )}

            {/* Error Message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.active,
    marginBottom: 8,
  },
  skillName: {
    fontSize: 16,
    color: COLORS.growth,
    marginBottom: 24,
  },
  inputTypeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surfaceRaised,
    alignItems: 'center',
  },
  inputTypeButtonActive: {
    backgroundColor: COLORS.active,
  },
  inputTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.voidGray,
  },
  inputTypeButtonTextActive: {
    color: COLORS.void,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.active,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    minHeight: 48,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.voidGray,
    marginTop: 6,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.alert,
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.voidGray,
  },
  submitButton: {
    backgroundColor: COLORS.growth,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.void,
  },
});
