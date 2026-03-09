import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { databaseManager } from '../services/DatabaseManager';

interface Exam {
  id: string;
  name: 'CSE321' | 'CSE341' | 'CSE422' | 'CSE423';
  date: string;
  color: string;
}

interface ExamDateEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
}

/**
 * ExamDateEditor Component
 * 
 * Allows editing exam dates in Settings
 * 
 * Requirements:
 * - 20.6: Allow editing exam dates in Settings
 * - Persist changes to exams table
 */
export const ExamDateEditor: React.FC<ExamDateEditorProps> = ({ visible, onClose, onSave }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadExams();
    }
  }, [visible]);

  /**
   * Load exams from database
   */
  const loadExams = async () => {
    try {
      setLoading(true);
      const examData = await databaseManager.query<Exam>(
        'SELECT * FROM exams ORDER BY name'
      );
      setExams(examData);
    } catch (error) {
      console.error('Failed to load exams:', error);
      Alert.alert('Error', 'Failed to load exam dates');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open date picker for an exam
   */
  const openDatePicker = (exam: Exam) => {
    setSelectedExam(exam);
    setTempDate(new Date(exam.date));
    setShowDatePicker(true);
  };

  /**
   * Handle date change from picker
   */
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate && selectedExam) {
      setTempDate(selectedDate);
      
      if (Platform.OS === 'android') {
        // On Android, save immediately after selection
        saveExamDate(selectedExam.id, selectedDate);
      }
    }
  };

  /**
   * Save exam date to database
   * Requirement 20.6: Persist changes to exams table
   */
  const saveExamDate = async (examId: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      await databaseManager.update(
        'exams',
        { date: dateStr },
        'id = ?',
        [examId]
      );

      // Reload exams
      await loadExams();
      
      Alert.alert('Success', 'Exam date updated successfully');
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Failed to save exam date:', error);
      Alert.alert('Error', 'Failed to update exam date');
    }
  };

  /**
   * Confirm date change (iOS only)
   */
  const confirmDateChange = () => {
    if (selectedExam) {
      saveExamDate(selectedExam.id, tempDate);
    }
    setShowDatePicker(false);
    setSelectedExam(null);
  };

  /**
   * Cancel date change (iOS only)
   */
  const cancelDateChange = () => {
    setShowDatePicker(false);
    setSelectedExam(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Exam Dates</Text>
          <Text style={styles.modalSubtitle}>
            Update exam dates for countdown widgets
          </Text>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <View style={styles.examList}>
              {exams.map(exam => (
                <TouchableOpacity
                  key={exam.id}
                  style={styles.examItem}
                  onPress={() => openDatePicker(exam)}
                >
                  <View style={styles.examInfo}>
                    <View style={styles.examHeader}>
                      <View
                        style={[
                          styles.colorIndicator,
                          { backgroundColor: exam.color },
                        ]}
                      />
                      <Text style={styles.examName}>{exam.name}</Text>
                    </View>
                    <Text style={styles.examDate}>
                      {new Date(exam.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Date Picker */}
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
              
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity
                    style={[styles.datePickerButton, styles.cancelButton]}
                    onPress={cancelDateChange}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePickerButton, styles.confirmButton]}
                    onPress={confirmDateChange}
                  >
                    <Text style={styles.buttonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>CLOSE</Text>
          </TouchableOpacity>
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
    width: '85%',
    maxHeight: '80%',
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
    lineHeight: 18,
  },
  loadingText: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  examList: {
    marginBottom: 20,
  },
  examItem: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examInfo: {
    flex: 1,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  examName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  examDate: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  editIcon: {
    fontSize: 20,
    marginLeft: 12,
  },
  datePickerContainer: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  datePickerButton: {
    flex: 1,
    padding: 12,
    borderRadius: 9999,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1a1a1a',
  },
  confirmButton: {
    backgroundColor: '#00E5FF',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeButton: {
    backgroundColor: '#FF0000',
    padding: 16,
    borderRadius: 9999,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
