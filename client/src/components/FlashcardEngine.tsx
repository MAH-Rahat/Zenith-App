import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { flashcardEngine, Flashcard, SUBJECT_CODES } from '../services/FlashcardEngine';

export const FlashcardEngine: React.FC = () => {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [dueCount, setDueCount] = useState(0);
  
  // CRUD Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [subject, setSubject] = useState(SUBJECT_CODES[0]);

  useEffect(() => {
    loadData();
  }, [selectedSubjects]);

  const loadData = async () => {
    try {
      const [due, counts, dueTotal] = await Promise.all([
        selectedSubjects.length > 0
          ? flashcardEngine.getDueCardsBySubjects(selectedSubjects)
          : flashcardEngine.getDueCards(),
        flashcardEngine.getCardCountBySubject(),
        flashcardEngine.getDueCardCount(),
      ]);

      setDueCards(due);
      setCardCounts(counts);
      setDueCount(dueTotal);

      if (due.length > 0 && !currentCard) {
        setCurrentCard(due[0]);
      } else if (due.length === 0) {
        setCurrentCard(null);
      }
    } catch (error) {
      console.error('Failed to load flashcard data:', error);
    }
  };

  const toggleSubject = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const handleReview = async (correct: boolean) => {
    if (!currentCard) return;

    try {
      if (correct) {
        await flashcardEngine.reviewCardCorrect(currentCard.id);
      } else {
        await flashcardEngine.reviewCardIncorrect(currentCard.id);
      }

      await loadData();
      setShowAnswer(false);

      const nextDue =
        selectedSubjects.length > 0
          ? await flashcardEngine.getDueCardsBySubjects(selectedSubjects)
          : await flashcardEngine.getDueCards();

      setCurrentCard(nextDue.length > 0 ? nextDue[0] : null);
    } catch (error) {
      console.error('Failed to review card:', error);
      Alert.alert('Error', 'Failed to review flashcard');
    }
  };

  const openCreateModal = () => {
    setEditingCard(null);
    setQuestion('');
    setAnswer('');
    setSubject(SUBJECT_CODES[0]);
    setModalVisible(true);
  };

  const openEditModal = (card: Flashcard) => {
    setEditingCard(card);
    setQuestion(card.question);
    setAnswer(card.answer);
    setSubject(card.subject);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Validation Error', 'Question and answer are required');
      return;
    }

    try {
      if (editingCard) {
        await flashcardEngine.updateCard(editingCard.id, {
          question: question.trim(),
          answer: answer.trim(),
          subject,
        });
      } else {
        await flashcardEngine.createCard(question.trim(), answer.trim(), subject);
      }

      await loadData();
      setModalVisible(false);
    } catch (error) {
      console.error('Failed to save flashcard:', error);
      Alert.alert('Error', 'Failed to save flashcard');
    }
  };

  const handleDelete = async (cardId: string) => {
    Alert.alert('Delete Flashcard', 'Are you sure you want to delete this flashcard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await flashcardEngine.deleteCard(cardId);
            await loadData();
            if (currentCard?.id === cardId) {
              setCurrentCard(null);
            }
          } catch (error) {
            console.error('Failed to delete flashcard:', error);
            Alert.alert('Error', 'Failed to delete flashcard');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header with due count */}
      <View style={styles.header}>
        <Text style={styles.dueCount}>{dueCount} cards due</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>+ ADD</Text>
        </TouchableOpacity>
      </View>

      {/* Subject Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>FILTER BY SUBJECT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {SUBJECT_CODES.filter((s) => s !== 'Other').map((subj) => (
            <TouchableOpacity
              key={subj}
              style={[
                styles.filterChip,
                selectedSubjects.includes(subj) && styles.filterChipActive,
              ]}
              onPress={() => toggleSubject(subj)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSubjects.includes(subj) && styles.filterChipTextActive,
                ]}
              >
                {subj}
              </Text>
              <Text style={styles.filterChipCount}>({cardCounts[subj] || 0})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Flashcard Display */}
      {currentCard ? (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardSubject}>{currentCard.subject}</Text>
              <Text style={styles.cardBox}>BOX {currentCard.boxNumber}</Text>
            </View>

            <Text style={styles.cardLabel}>QUESTION</Text>
            <Text style={styles.cardText}>{currentCard.question}</Text>

            {showAnswer && (
              <>
                <View style={styles.divider} />
                <Text style={styles.cardLabel}>ANSWER</Text>
                <Text style={styles.cardText}>{currentCard.answer}</Text>
              </>
            )}
          </View>

          {!showAnswer ? (
            <TouchableOpacity style={styles.revealButton} onPress={handleReveal}>
              <Text style={styles.revealButtonText}>REVEAL ANSWER</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.reviewButtons}>
              <TouchableOpacity
                style={[styles.reviewButton, styles.incorrectButton]}
                onPress={() => handleReview(false)}
              >
                <Text style={styles.reviewButtonText}>INCORRECT</Text>
                <Text style={styles.reviewButtonSubtext}>Back to Box 1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reviewButton, styles.correctButton]}
                onPress={() => handleReview(true)}
              >
                <Text style={styles.reviewButtonText}>CORRECT</Text>
                <Text style={styles.reviewButtonSubtext}>
                  {currentCard.boxNumber < 5 ? `Move to Box ${currentCard.boxNumber + 1}` : 'Stay in Box 5'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(currentCard)}
          >
            <Text style={styles.editButtonText}>EDIT CARD</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>NO CARDS DUE</Text>
          <Text style={styles.emptySubtext}>
            {selectedSubjects.length > 0
              ? 'No cards due for selected subjects. Try selecting different subjects or add new cards.'
              : 'All caught up! Add more cards or come back later.'}
          </Text>
        </View>
      )}

      {/* CRUD Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCard ? 'Edit Flashcard' : 'Add Flashcard'}
            </Text>

            <Text style={styles.inputLabel}>Question</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter question"
              placeholderTextColor="#666"
              value={question}
              onChangeText={setQuestion}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Answer</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter answer"
              placeholderTextColor="#666"
              value={answer}
              onChangeText={setAnswer}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Subject</Text>
            <View style={styles.subjectSelector}>
              {SUBJECT_CODES.filter((s) => s !== 'Other').map((subj) => (
                <TouchableOpacity
                  key={subj}
                  style={[
                    styles.subjectOption,
                    subject === subj && styles.subjectOptionActive,
                  ]}
                  onPress={() => setSubject(subj)}
                >
                  <Text
                    style={[
                      styles.subjectOptionText,
                      subject === subj && styles.subjectOptionTextActive,
                    ]}
                  >
                    {subj}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              {editingCard && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => {
                    setModalVisible(false);
                    handleDelete(editingCard.id);
                  }}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>{editingCard ? 'Save' : 'Add'}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dueCount: {
    fontSize: 14,
    color: '#00E5FF',
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#00FF66',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  filterChipActive: {
    backgroundColor: '#00E5FF20',
    borderColor: '#00E5FF',
  },
  filterChipText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '700',
    marginRight: 6,
  },
  filterChipTextActive: {
    color: '#00E5FF',
  },
  filterChipCount: {
    fontSize: 10,
    color: '#444444',
    fontWeight: '700',
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    minHeight: 300,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardSubject: {
    fontSize: 12,
    color: '#00E5FF',
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardBox: {
    fontSize: 10,
    color: '#FFB800',
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginVertical: 20,
  },
  revealButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  revealButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  incorrectButton: {
    backgroundColor: '#FF2A42',
  },
  correctButton: {
    backgroundColor: '#00FF66',
  },
  reviewButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  reviewButtonSubtext: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.7,
  },
  editButton: {
    backgroundColor: '#161616',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  editButtonText: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#0D0D0D',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 20,
    letterSpacing: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 16,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  subjectSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  subjectOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  subjectOptionActive: {
    backgroundColor: '#00E5FF20',
    borderColor: '#00E5FF',
  },
  subjectOptionText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subjectOptionTextActive: {
    color: '#00E5FF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  deleteButton: {
    backgroundColor: '#FF2A42',
  },
  confirmButton: {
    backgroundColor: '#00FF66',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
