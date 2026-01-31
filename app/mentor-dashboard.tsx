import { StyleSheet, View, SafeAreaView, Alert, Text, TouchableOpacity, TextInput, FlatList, Platform, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCustom } from '@/theme/provider';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '@/utils/api';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const BASE_URL = API_BASE_URL;

export default function MentorDashboard() {
  const { theme } = useThemeCustom();
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMerchantUsername, setNewMerchantUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${BASE_URL}/api/mentor/merchants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setMerchants(response.data.merchants);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMerchant = async () => {
    if (!newMerchantUsername.trim()) return;
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.post(`${BASE_URL}/api/mentor/add-merchant`, 
        { username: newMerchantUsername },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        Alert.alert('Success', 'Merchant added successfully');
        setNewMerchantUsername('');
        setShowAddForm(false);
        fetchMerchants();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to add merchant');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add merchant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMerchant = (merchant: any) => {
    Alert.alert(
      'Delete Merchant',
      `Are you sure you want to remove ${merchant.username} as merchant? They will be reverted to regular user.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await axios.delete(`${BASE_URL}/api/mentor/merchant/${merchant.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (response.data.success) {
                Alert.alert('Success', 'Merchant removed successfully');
                fetchMerchants();
              } else {
                Alert.alert('Error', response.data.error || 'Failed to remove merchant');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove merchant');
            }
          }
        }
      ]
    );
  };

  const renderMerchantItem = ({ item }: { item: any }) => (
    <View style={[styles.merchantItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.merchantInfo}>
        <Text style={[styles.merchantName, { color: theme.text }]}>{item.username}</Text>
        <Text style={[styles.expiryText, { color: theme.secondary }]}>
          Expires: {new Date(item.merchant_expired_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.merchantActions}>
        <View style={[styles.statusBadge, { backgroundColor: '#4CAF5020' }]}>
          <Text style={{ color: '#4CAF50', fontSize: 12 }}>Active</Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteMerchant(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Mentor Dashboard</Text>
          <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
            <Ionicons name={showAddForm ? "close" : "add-circle"} size={28} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {showAddForm && (
          <View style={[styles.addForm, { backgroundColor: theme.card }]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Add New Merchant</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="Enter Username"
              placeholderTextColor={theme.secondary}
              value={newMerchantUsername}
              onChangeText={setNewMerchantUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={[styles.submitButton, { opacity: submitting ? 0.6 : 1 }]}
              onPress={handleAddMerchant}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>Add Merchant</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Your Merchants</Text>
          <FlatList
            data={merchants}
            renderItem={renderMerchantItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.secondary }]}>No merchants added yet.</Text>
            }
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: STATUSBAR_HEIGHT + 12,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  addForm: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginVertical: 12, textTransform: 'uppercase' },
  list: { paddingBottom: 20 },
  merchantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: { fontSize: 16, fontWeight: 'bold' },
  expiryText: { fontSize: 12, marginTop: 4 },
  merchantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 }
});