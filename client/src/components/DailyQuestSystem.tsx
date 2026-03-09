import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { storageManager } from '../services/StorageManager';
import { DailyQuestSystemProps, QuestData, Quest } from '../types';

const STORAGE_KEY_QUESTS = 'zenith_quest_data';

const FALLBACK_MAIN_QUESTS = [
  { description: 'Complete one academic task', expValue: 100 },
  { description: 'Study for 30 minutes', expValue: 150 },
  { description: 'Review course materials', expValue: 100 },
];

export const DailyQuestSystem: React.FC<DailyQuestSystemProps> = ({ onQuestComplete }) => {
  const [mainQuests, setMainQuests] = useState<Quest[]>([]);
  const [sideQuests, setSideQuests] = useState<Quest[]>([]);
  const [lastGenerationDate, setLastGenerationDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newQuestDescription, setNewQuestDescription] = useState('');
  const [newQuestEXP, setNewQuestEXP] = useState('100');

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async (): Promise<void> => {
    try {
      const data = await storageManager.load<QuestData>(STORAGE_KEY_QUESTS);
      const today = new Date().toISOString().split('T')[0];

      if (data && data.lastGenerationDate === today) {
        setMainQuests(data.mainQuests);
        setSideQuests(data.sideQuests);
        setLastGenerationDate(data.lastGenerationDate);
      } else {
        // New day or first launch, generate new quests
        const newMainQuests = generateMainQuests();
        setMainQuests(newMainQuests);
        setSideQuests(data?.sideQuests.filter(q => !q.isComplete) || []);
        setLastGenerationDate(today);
        await persistQuests(newMainQuests, data?.sideQuests.filter(q => !q.isComplete) || [], today);
      }
    } catch (error) {
      console.error('Failed to load quests:', error);
      const newMainQuests = generateMainQuests();
      setMainQuests(newMainQuests);
      setLastGenerationDate(new Date().toISOString().split('T')[0]);
    }
  };

  const generateMainQuests = (): Quest[] => {
    try {
      const today = new Date().toISOString();
      return FALLBACK_MAIN_QUESTS.map((template, index) => ({
        id: `main-${Date.now()}-${index}`,
        description: template.description,
        expValue: template.expValue,
        isComplete: false,
        type: 'main' as const,
        createdAt: today,
      }));
    } catch (error) {
      console.error('Quest generation failed:', error);
      return [];
    }
  };

  const addSideQuest = async (description: string, expValue: number): Promise<void> => {
    if (!description.trim()) return;

    const newQuest: Quest = {
      id: `side-${Date.now()}`,
      description: description.trim(),
      expValue: expValue || 100,
      isComplete: false,
      type: 'side',
      createdAt: new Date().toISOString(),
    };

    const updatedSideQuests = [...sideQuests, newQuest];
    setSideQuests(updatedSideQuests);
    await persistQuests(mainQuests, updatedSideQuests, lastGenerationDate);
    
    setModalVisible(false);
    setNewQuestDescription('');
    setNewQuestEXP('100');
  };

  const completeQuest = async (questId: string): Promise<void> => {
    const updateQuest = (quest: Quest) => {
      if (quest.id === questId) {
        return {
          ...quest,
          isComplete: true,
          completedAt: new Date().toISOString(),
        };
      }
      return quest;
    };

    const updatedMainQuests = mainQuests.map(updateQuest);
    const updatedSideQuests = sideQuests.map(updateQuest);

    setMainQuests(updatedMainQuests);
    setSideQuests(updatedSideQuests);

    const completedQuest = [...updatedMainQuests, ...updatedSideQuests].find(q => q.id === questId);
    if (completedQuest) {
      onQuestComplete(questId, completedQuest.expValue);
    }

    await persistQuests(updatedMainQuests, updatedSideQuests, lastGenerationDate);
  };

  const shouldGenerateNewQuests = (): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return lastGenerationDate !== today;
  };

  const persistQuests = async (main: Quest[], side: Quest[], date: string): Promise<void> => {
    const data: QuestData = {
      mainQuests: main,
      sideQuests: side,
      lastGenerationDate: date,
    };
    await storageManager.save(STORAGE_KEY_QUESTS, data);
  };

  const renderQuest = (quest: Quest) => (
    <TouchableOpacity
      key={quest.id}
      style={styles.questItem}
      onPress={() => !quest.isComplete && completeQuest(quest.id)}
      disabled={quest.isComplete}
    >
      <View style={styles.checkbox}>
        {quest.isComplete && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.questContent}>
        <Text style={[styles.questText, quest.isComplete && styles.questTextComplete]}>
          {quest.description}
        </Text>
        <Text style={styles.expValue}>+{quest.expValue} EXP</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Quests</Text>
      
      <View style={styles.questColumns}>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Main Quest (Academia)</Text>
          <ScrollView style={styles.questList}>
            {mainQuests.map(renderQuest)}
          </ScrollView>
        </View>

        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>Side Quests (Custom)</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.questList}>
            {sideQuests.map(renderQuest)}
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Side Quest</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Quest description"
              placeholderTextColor="#666"
              value={newQuestDescription}
              onChangeText={setNewQuestDescription}
            />
            
            <TextInput
              style={styles.input}
              placeholder="EXP value"
              placeholderTextColor="#666"
              value={newQuestEXP}
              onChangeText={setNewQuestEXP}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => addSideQuest(newQuestDescription, parseInt(newQuestEXP) || 100)}
              >
                <Text style={styles.buttonText}>Add</Text>
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
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  questColumns: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cccccc',
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    backgroundColor: '#333333',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  questList: {
    maxHeight: 300,
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#555555',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
  },
  questContent: {
    flex: 1,
  },
  questText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 4,
  },
  questTextComplete: {
    textDecorationLine: 'line-through',
    color: '#666666',
  },
  expValue: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#555555',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#555555',
  },
  confirmButton: {
    backgroundColor: '#00aa00',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
