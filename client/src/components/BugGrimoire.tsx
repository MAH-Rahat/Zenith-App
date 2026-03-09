import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { bugGrimoire, BugEntry, AVAILABLE_TAGS } from '../services/BugGrimoire';

export const BugGrimoire: React.FC = () => {
  // State for entries
  const [entries, setEntries] = useState<BugEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  
  // State for modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // State for form
  const [formErrorCode, setFormErrorCode] = useState('');
  const [formSolution, setFormSolution] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  
  // State for selected entry
  const [selectedEntry, setSelectedEntry] = useState<BugEntry | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const allEntries = await bugGrimoire.getAllEntries();
      setEntries(allEntries);
    } catch (error) {
      console.error('Failed to load bug entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter entries based on search query and selected tags
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(entry =>
        entry.errorCode.toLowerCase().includes(query) ||
        entry.solution.toLowerCase().includes(query)
      );
    }

    // Apply tag filter (ALL selected tags must match)
    if (selectedFilterTags.length > 0) {
      result = result.filter(entry =>
        selectedFilterTags.every(tag => entry.tags.includes(tag))
      );
    }

    return result;
  }, [entries, searchQuery, selectedFilterTags]);

  const handleAddEntry = async () => {
    if (!formErrorCode.trim()) {
      Alert.alert('Error', 'Please enter an error code');
      return;
    }
    if (!formSolution.trim()) {
      Alert.alert('Error', 'Please enter a solution');
      return;
    }
    if (formTags.length === 0) {
      Alert.alert('Error', 'Please select at least one tag');
      return;
    }

    try {
      await bugGrimoire.createEntry(formErrorCode.trim(), formSolution.trim(), formTags);
      await loadEntries();
      resetForm();
      setAddModalVisible(false);
    } catch (error) {
      console.error('Failed to add entry:', error);
      Alert.alert('Error', 'Failed to add bug entry');
    }
  };

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return;

    if (!formErrorCode.trim()) {
      Alert.alert('Error', 'Please enter an error code');
      return;
    }
    if (!formSolution.trim()) {
      Alert.alert('Error', 'Please enter a solution');
      return;
    }
    if (formTags.length === 0) {
      Alert.alert('Error', 'Please select at least one tag');
      return;
    }

    try {
      await bugGrimoire.updateEntry(selectedEntry.id, {
        errorCode: formErrorCode.trim(),
        solution: formSolution.trim(),
        tags: formTags
      });
      await loadEntries();
      resetForm();
      setEditModalVisible(false);
      setDetailModalVisible(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Failed to update entry:', error);
      Alert.alert('Error', 'Failed to update bug entry');
    }
  };

  const handleDeleteEntry = () => {
    if (!selectedEntry) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this bug entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bugGrimoire.deleteEntry(selectedEntry.id);
              await loadEntries();
              setDetailModalVisible(false);
              setSelectedEntry(null);
            } catch (error) {
              console.error('Failed to delete entry:', error);
              Alert.alert('Error', 'Failed to delete bug entry');
            }
          }
        }
      ]
    );
  };

  const openDetailView = (entry: BugEntry) => {
    setSelectedEntry(entry);
    setDetailModalVisible(true);
  };

  const openEditView = () => {
    if (!selectedEntry) return;
    setFormErrorCode(selectedEntry.errorCode);
    setFormSolution(selectedEntry.solution);
    setFormTags([...selectedEntry.tags]);
    setDetailModalVisible(false);
    setEditModalVisible(true);
  };

  const resetForm = () => {
    setFormErrorCode('');
    setFormSolution('');
    setFormTags([]);
  };

  const toggleFormTag = (tag: string) => {
    setFormTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleFilterTag = (tag: string) => {
    setSelectedFilterTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const renderEntryForm = (isEdit: boolean) => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>{isEdit ? 'Edit Entry' : 'Add Bug Entry'}</Text>

      <Text style={styles.inputLabel}>Error Code</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., TypeError: Cannot read property 'map'"
        placeholderTextColor="#666"
        value={formErrorCode}
        onChangeText={setFormErrorCode}
      />

      <Text style={styles.inputLabel}>Solution</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe the solution..."
        placeholderTextColor="#666"
        value={formSolution}
        onChangeText={setFormSolution}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.inputLabel}>Tags (select at least one)</Text>
      <View style={styles.tagSelector}>
        {AVAILABLE_TAGS.map(tag => (
          <TouchableOpacity
            key={tag}
            style={[styles.tagOption, formTags.includes(tag) && styles.tagOptionActive]}
            onPress={() => toggleFormTag(tag)}
          >
            <Text style={[styles.tagOptionText, formTags.includes(tag) && styles.tagOptionTextActive]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => {
            resetForm();
            isEdit ? setEditModalVisible(false) : setAddModalVisible(false);
          }}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.confirmButton]}
          onPress={isEdit ? handleUpdateEntry : handleAddEntry}
        >
          <Text style={styles.buttonText}>{isEdit ? 'Update' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by error code or solution..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setAddModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ ADD</Text>
        </TouchableOpacity>
      </View>

      {/* Tag Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        {AVAILABLE_TAGS.map(tag => (
          <TouchableOpacity
            key={tag}
            style={[styles.filterChip, selectedFilterTags.includes(tag) && styles.filterChipActive]}
            onPress={() => toggleFilterTag(tag)}
          >
            <Text style={[styles.filterChipText, selectedFilterTags.includes(tag) && styles.filterChipTextActive]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Entries List */}
      <ScrollView style={styles.entriesList}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No entries found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedFilterTags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Tap + ADD to create your first bug entry'}
            </Text>
          </View>
        ) : (
          filteredEntries.map(entry => (
            <TouchableOpacity
              key={entry.id}
              style={styles.entryCard}
              onPress={() => openDetailView(entry)}
            >
              <Text style={styles.entryError}>{entry.errorCode}</Text>
              <Text style={styles.entrySolution} numberOfLines={2}>
                {entry.solution}
              </Text>
              <View style={styles.entryTags}>
                {entry.tags.map(tag => (
                  <View key={tag} style={styles.entryTag}>
                    <Text style={styles.entryTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.entryDate}>
                {new Date(entry.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          {renderEntryForm(false)}
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          {renderEntryForm(true)}
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEntry && (
              <>
                <Text style={styles.modalTitle}>Bug Entry</Text>

                <Text style={styles.detailLabel}>Error Code</Text>
                <Text style={styles.detailText}>{selectedEntry.errorCode}</Text>

                <Text style={styles.detailLabel}>Solution</Text>
                <Text style={styles.detailText}>{selectedEntry.solution}</Text>

                <Text style={styles.detailLabel}>Tags</Text>
                <View style={styles.detailTags}>
                  {selectedEntry.tags.map(tag => (
                    <View key={tag} style={styles.detailTag}>
                      <Text style={styles.detailTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.detailDate}>
                  Created: {new Date(selectedEntry.createdAt).toLocaleString()}
                </Text>
                {selectedEntry.updatedAt !== selectedEntry.createdAt && (
                  <Text style={styles.detailDate}>
                    Updated: {new Date(selectedEntry.updatedAt).toLocaleString()}
                  </Text>
                )}

                <View style={styles.detailButtons}>
                  <TouchableOpacity style={[styles.detailButton, styles.editButton]} onPress={openEditView}>
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailButton, styles.deleteButton]} onPress={handleDeleteEntry}>
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { marginTop: 12 }]}
                  onPress={() => {
                    setDetailModalVisible(false);
                    setSelectedEntry(null);
                  }}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
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
  },
  searchBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    padding: 16,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  addButton: {
    backgroundColor: '#00FF66',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  filterChips: {
    marginBottom: 16,
    maxHeight: 40,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#00FF6620',
    borderColor: '#00FF66',
  },
  filterChipText: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#00FF66',
  },
  entriesList: {
    flex: 1,
  },
  entryCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  entryError: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF2A42',
    marginBottom: 8,
  },
  entrySolution: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 12,
  },
  entryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  entryTag: {
    backgroundColor: '#161616',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  entryTagText: {
    fontSize: 9,
    color: '#888888',
    fontWeight: '700',
  },
  entryDate: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tagSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  tagOptionActive: {
    backgroundColor: '#00FF6620',
    borderColor: '#00FF66',
  },
  tagOptionText: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '700',
  },
  tagOptionTextActive: {
    color: '#00FF66',
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
  confirmButton: {
    backgroundColor: '#00FF66',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 22,
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    backgroundColor: '#161616',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  detailTagText: {
    fontSize: 10,
    color: '#00FF66',
    fontWeight: '700',
  },
  detailDate: {
    fontSize: 10,
    color: '#666666',
    marginTop: 12,
  },
  detailButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  detailButton: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#00E5FF',
  },
  deleteButton: {
    backgroundColor: '#FF2A42',
  },
});
