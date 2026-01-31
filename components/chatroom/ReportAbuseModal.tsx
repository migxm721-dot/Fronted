import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import API_BASE_URL from '@/utils/api';

interface ReportAbuseModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  targetUsername?: string;
}

const REASONS = ['spam', 'harassment', 'porn', 'scam'];

export function ReportAbuseModal({
  visible,
  onClose,
  roomId,
  roomName,
  targetUsername = '',
}: ReportAbuseModalProps) {
  const { theme } = useThemeCustom();
  const [target, setTarget] = useState(targetUsername);
  const [reason, setReason] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!target.trim()) {
      Alert.alert('Error', 'Please enter target username');
      return;
    }
    if (!reason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/abuse/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter: '',
          target: target.trim(),
          roomId: roomId,
          reason: reason,
          messageText: messageText.trim() || null,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) throw new Error('Failed to submit report');
      
      Alert.alert('Success', 'Report submitted successfully');
      setTarget(targetUsername);
      setReason('');
      setMessageText('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [target, reason, messageText, targetUsername, roomId, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Report Abuse</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ flexGrow: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>Room: {roomName}</Text>

            <Text style={[styles.label, { color: theme.text, marginTop: 12 }]}>Target Username *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholderTextColor={theme.placeholder}
              placeholder="Enter username"
              value={target}
              onChangeText={setTarget}
              editable={!targetUsername}
            />

            <Text style={[styles.label, { color: theme.text, marginTop: 12 }]}>Reason *</Text>
            <View style={styles.reasonContainer}>
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.reasonButton,
                    {
                      backgroundColor: reason === r ? '#0a5229' : theme.background,
                      borderColor: reason === r ? '#0a5229' : theme.border,
                    },
                  ]}
                  onPress={() => setReason(r)}
                >
                  <Text style={[styles.reasonText, { color: reason === r ? '#fff' : theme.text }]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.text, marginTop: 12 }]}>Message (Optional)</Text>
            <TextInput
              style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
              placeholderTextColor={theme.placeholder}
              placeholder="Describe the issue..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.submitButton, { opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>{isSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    maxHeight: '80%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  reasonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0a5229',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
