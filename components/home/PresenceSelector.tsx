
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'invisible';

interface PresenceSelectorProps {
  visible: boolean;
  currentStatus: PresenceStatus;
  isUpdating?: boolean;
  onClose: () => void;
  onSelect: (status: PresenceStatus) => Promise<void>;
}

const presenceOptions: Array<{
  status: PresenceStatus;
  label: string;
  description: string;
  color: string;
  borderColor: string;
}> = [
  {
    status: 'online',
    label: 'Online',
    description: 'Available - User aktif',
    color: '#90EE90',
    borderColor: '#5CB85C',
  },
  {
    status: 'away',
    label: 'Away',
    description: 'Away - User idle / tidak di layar',
    color: '#FFD700',
    borderColor: '#DAA520',
  },
  {
    status: 'busy',
    label: 'Busy',
    description: 'Do Not Disturb (DND) - Tidak ingin diganggu',
    color: '#FF6B6B',
    borderColor: '#DC143C',
  },
  {
    status: 'invisible',
    label: 'Invisible',
    description: 'Invisible - User online tapi tampak offline',
    color: '#808080',
    borderColor: '#666666',
  },
  {
    status: 'offline',
    label: 'Offline',
    description: 'Offline - Tidak aktif / disconnect',
    color: '#808080',
    borderColor: '#666666',
  },
];

export function PresenceSelector({ visible, currentStatus, isUpdating = false, onClose, onSelect }: PresenceSelectorProps) {
  const { theme } = useThemeCustom();
  const [localUpdating, setLocalUpdating] = useState(false);

  const handleSelect = async (status: PresenceStatus) => {
    if (localUpdating) return;
    setLocalUpdating(true);
    try {
      await onSelect(status);
      onClose();
    } finally {
      setLocalUpdating(false);
    }
  };

  const showLoading = localUpdating || isUpdating;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View 
          style={[styles.container, { backgroundColor: theme.card }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.title, { color: theme.text }]}>Set Presence Status</Text>
          
          {showLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00BFFF" />
              <Text style={[styles.loadingText, { color: theme.text }]}>Updating presence</Text>
            </View>
          )}
          
          {!showLoading && presenceOptions.map((option) => (
            <TouchableOpacity
              key={option.status}
              style={[
                styles.option,
                { 
                  backgroundColor: currentStatus === option.status ? theme.background : 'transparent',
                  borderBottomColor: theme.border,
                }
              ]}
              onPress={() => handleSelect(option.status)}
            >
              <View 
                style={[
                  styles.statusDot, 
                  { 
                    backgroundColor: option.color,
                    borderColor: option.borderColor,
                    borderWidth: 2,
                  }
                ]} 
              />
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, { color: theme.text }]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { color: theme.secondary }]}>
                  {option.description}
                </Text>
              </View>
              {currentStatus === option.status && (
                <Text style={[styles.checkmark, { color: theme.text }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}

          {!showLoading && (
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
