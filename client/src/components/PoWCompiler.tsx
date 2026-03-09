import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { proofOfWorkCompiler } from '../services/ProofOfWorkCompiler';

interface PoWCompilerProps {
  visible: boolean;
  onClose: () => void;
}

type DateRangePreset = 'last30' | 'last60' | 'last90' | 'custom';

export const PoWCompiler: React.FC<PoWCompilerProps> = ({ visible, onClose }) => {
  const [selectedRange, setSelectedRange] = useState<DateRangePreset>('last30');
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const generateReport = async () => {
    try {
      setGeneratingReport(true);

      let startDate: Date;
      const endDate = new Date();

      // Requirement 36.2: Default to past 30 days filter
      // Requirement 36.3: Allow selecting custom date ranges
      switch (selectedRange) {
        case 'last30':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'last60':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 60);
          break;
        case 'last90':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
      }

      // Requirement 36.4: Query completed skill_nodes within date range
      const report = await proofOfWorkCompiler.generateReport(
        startDate.toISOString(),
        endDate.toISOString()
      );

      setReportMarkdown(report.markdown);
      setShowReport(true);
    } catch (error) {
      console.error('Failed to generate report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      // Requirement 36.9: Copy Markdown to device clipboard on button tap
      await proofOfWorkCompiler.copyToClipboard(reportMarkdown);
      Alert.alert('Success', 'Report copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleClose = () => {
    setShowReport(false);
    setReportMarkdown('');
    setSelectedRange('last30');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {!showReport ? (
            <>
              <Text style={styles.modalTitle}>Proof-of-Work Compiler</Text>
              <Text style={styles.modalSubtitle}>
                Generate a Markdown report of completed skill nodes
              </Text>

              {/* Date Range Selection */}
              {/* Requirement 36.2: Default to past 30 days filter */}
              {/* Requirement 36.3: Allow selecting custom date ranges */}
              <View style={styles.rangeSelector}>
                <Text style={styles.rangeSelectorLabel}>Select Date Range:</Text>

                <TouchableOpacity
                  style={[
                    styles.rangeButton,
                    selectedRange === 'last30' && styles.rangeButtonActive,
                  ]}
                  onPress={() => setSelectedRange('last30')}
                >
                  <Text
                    style={[
                      styles.rangeButtonText,
                      selectedRange === 'last30' && styles.rangeButtonTextActive,
                    ]}
                  >
                    Last 30 Days
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rangeButton,
                    selectedRange === 'last60' && styles.rangeButtonActive,
                  ]}
                  onPress={() => setSelectedRange('last60')}
                >
                  <Text
                    style={[
                      styles.rangeButtonText,
                      selectedRange === 'last60' && styles.rangeButtonTextActive,
                    ]}
                  >
                    Last 60 Days
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rangeButton,
                    selectedRange === 'last90' && styles.rangeButtonActive,
                  ]}
                  onPress={() => setSelectedRange('last90')}
                >
                  <Text
                    style={[
                      styles.rangeButtonText,
                      selectedRange === 'last90' && styles.rangeButtonTextActive,
                    ]}
                  >
                    Last 90 Days
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleClose}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={generateReport}
                  disabled={generatingReport}
                >
                  {generatingReport ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.buttonText}>Generate</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>Progress Report</Text>
              <Text style={styles.modalSubtitle}>
                Completed skill nodes for the selected period
              </Text>

              {/* Report Preview */}
              {/* Requirement 36.6: Format output as Markdown with headers, bullet lists, and GitHub links */}
              <ScrollView style={styles.reportPreview}>
                <Text style={styles.reportText}>{reportMarkdown}</Text>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowReport(false)}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>

                {/* Requirement 36.8: Display copy-to-clipboard button */}
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={copyToClipboard}
                >
                  <Text style={styles.buttonText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 24,
    lineHeight: 18,
  },
  rangeSelector: {
    marginBottom: 24,
  },
  rangeSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  rangeButton: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  rangeButtonActive: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  rangeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  rangeButtonTextActive: {
    color: '#000000',
  },
  reportPreview: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  reportText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  },
  cancelButton: {
    backgroundColor: '#1F1F1F',
  },
  confirmButton: {
    backgroundColor: '#00E5FF',
  },
  buttonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
