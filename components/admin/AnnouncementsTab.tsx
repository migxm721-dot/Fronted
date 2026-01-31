import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import API_BASE_URL from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export function AnnouncementsTab({ theme, adminId }: { theme: any; adminId?: number }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcements`);
      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Fetch announcements error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      handleUploadImage(result.assets[0].uri);
    }
  };

  const handleUploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('image', { uri, name: filename, type } as any);

      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.url) {
        setImageUrl(data.url);
        Alert.alert('Success', 'Image uploaded successfully');
      } else {
        Alert.alert('Error', 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Title and content are required');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/announcements/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          image_url: imageUrl,
          scheduled_at: scheduledAt || null,
          adminId: adminId,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Announcement created');
        setTitle('');
        setContent('');
        setImageUrl('');
        setScheduledAt('');
        fetchAnnouncements();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to create');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId }),
      });

      if (response.ok) {
        fetchAnnouncements();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.form, { backgroundColor: theme.card }]}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Title"
          placeholderTextColor={theme.secondary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]}
          placeholder="Content"
          placeholderTextColor={theme.secondary}
          value={content}
          onChangeText={setContent}
          multiline
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Scheduled Date (YYYY-MM-DD HH:MM)"
          placeholderTextColor={theme.secondary}
          value={scheduledAt}
          onChangeText={setScheduledAt}
        />
        
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={handlePickImage} style={styles.uploadBtn}>
            <Ionicons name="image" size={20} color="#fff" />
            <Text style={styles.uploadBtnText}>Pick Image</Text>
          </TouchableOpacity>
          {uploading && <ActivityIndicator size="small" color="#0a5229" />}
          {imageUrl ? (
             <Image source={{ uri: imageUrl }} style={styles.preview} />
          ) : null}
        </View>

        <TouchableOpacity onPress={handleCreateAnnouncement} style={styles.submitBtn}>
          <Text style={styles.submitBtnText}>Post Announcement</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.announcementItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.announcementTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.announcementDate, { color: theme.secondary }]}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            )}
            <Text style={[styles.announcementContent, { color: theme.text }]}>{item.content}</Text>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash" size={16} color="#ff4444" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, margin: 16, borderRadius: 12, gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  imageSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  uploadBtn: { backgroundColor: '#0a5229', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  preview: { width: 40, height: 40, borderRadius: 4 },
  submitBtn: { backgroundColor: '#0a5229', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  announcementItem: { padding: 16, marginBottom: 12, borderRadius: 12 },
  announcementTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  announcementDate: { fontSize: 12, marginBottom: 8 },
  itemImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 8 },
  announcementContent: { fontSize: 14, lineHeight: 20 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  deleteBtnText: { color: '#ff4444', fontSize: 12 },
});
