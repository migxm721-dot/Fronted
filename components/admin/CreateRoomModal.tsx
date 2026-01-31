import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

interface CreateRoomModalProps {
  visible: boolean;
  theme: any;
  onClose: () => void;
  name: string;
  onNameChange: (text: string) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  category: 'global' | 'official' | 'managed' | 'games';
  onCategoryChange: (cat: 'global' | 'official' | 'managed' | 'games') => void;
  capacity: string;
  onCapacityChange: (text: string) => void;
  loading: boolean;
  onSubmit: () => void;
}

export function CreateRoomModal({
  visible,
  theme,
  onClose,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  capacity,
  onCapacityChange,
  loading,
  onSubmit,
}: CreateRoomModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalOverlayBackground} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalContent, styles.halfModalContent, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create Room</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Room Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
              placeholder="Enter room name"
              placeholderTextColor={theme.secondary}
              value={name}
              onChangeText={onNameChange}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, minHeight: 80 }]}
              placeholder="Enter description"
              placeholderTextColor={theme.secondary}
              value={description}
              onChangeText={onDescriptionChange}
              multiline
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Category</Text>
            <View style={styles.categoryButtonsGrid}>
              {(['global', 'official', 'managed', 'games'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButtonLarge,
                    category === cat && { backgroundColor: '#0a5229' }
                  ]}
                  onPress={() => onCategoryChange(cat)}
                >
                  <Text style={[styles.categoryButtonTextLarge, { color: category === cat ? '#fff' : theme.text }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.text }]}>Capacity</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
              placeholder="Enter capacity"
              placeholderTextColor={theme.secondary}
              value={capacity}
              onChangeText={onCapacityChange}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#0a5229' }]}
              onPress={onSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Room</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalOverlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  halfModalContent: {
    width: '100%',
    maxWidth: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalContent: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 28,
    paddingHorizontal: 8,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 30,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  categoryButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryButtonLarge: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  categoryButtonTextLarge: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
