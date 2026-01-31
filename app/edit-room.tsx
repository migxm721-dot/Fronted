import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';

const HEADER_COLOR = '#0a5229';

export default function EditRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();
  const params = useLocalSearchParams();

  const [roomName, setRoomName] = useState(String(params.roomName || ''));
  const [roomDescription, setRoomDescription] = useState(String(params.roomDescription || ''));
  const [roomCapacity, setRoomCapacity] = useState(String(params.roomCapacity || ''));
  const [loading, setLoading] = useState(false);

  const handleUpdateRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'Please enter room name');
      return;
    }
    if (!roomCapacity.trim() || isNaN(Number(roomCapacity)) || Number(roomCapacity) <= 0) {
      Alert.alert('Error', 'Please enter valid capacity');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const deviceId = await AsyncStorage.getItem('device_id');

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/rooms/${params.roomId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName.trim(),
          description: roomDescription.trim(),
          max_users: Number(roomCapacity),
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Room updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to update room');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Room</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Room Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Room Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: 'rgba(0,0,0,0.1)',
                },
              ]}
              placeholder="Enter room name"
              placeholderTextColor={theme.secondary}
              value={roomName}
              onChangeText={setRoomName}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: 'rgba(0,0,0,0.1)',
                },
              ]}
              placeholder="Enter description"
              placeholderTextColor={theme.secondary}
              value={roomDescription}
              onChangeText={setRoomDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Capacity */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Capacity</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: 'rgba(0,0,0,0.1)',
                },
              ]}
              placeholder="Enter capacity"
              placeholderTextColor={theme.secondary}
              value={roomCapacity}
              onChangeText={setRoomCapacity}
              keyboardType="number-pad"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: HEADER_COLOR }]}
              onPress={handleUpdateRoom}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Update Room</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.secondary }]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: HEADER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    borderWidth: 1,
  },
  descriptionInput: {
    minHeight: 100,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
  },
  buttonsContainer: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 20,
  },
  updateButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
