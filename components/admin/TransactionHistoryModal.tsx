import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCustom } from '@/theme/provider';
import API_BASE_URL from '@/utils/api';

interface TransactionHistoryModalProps {
  onClose: () => void;
}

interface Transaction {
  id: number;
  type: string;
  category: 'game' | 'gift' | 'transfer';
  amount: number;
  username: string;
  description: string;
  created_at: string;
}

export function TransactionHistoryModal({ onClose }: TransactionHistoryModalProps) {
  const { theme } = useThemeCustom();
  const [searchUsername, setSearchUsername] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadTransactions = async () => {
    if (!searchUsername.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const deviceId = await AsyncStorage.getItem('device_id');

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/transactions/all?username=${encodeURIComponent(searchUsername.trim())}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to load transactions');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'game':
        return 'dice-outline';
      case 'gift':
        return 'gift-outline';
      case 'transfer':
        return 'swap-horizontal-outline';
      default:
        return 'cash-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'game':
        return '#E74C3C';
      case 'gift':
        return '#F39C12';
      case 'transfer':
        return '#27AE60';
      case 'voucher':
        return '27AE60';
      default:
        return '#95A5A6';
    }
  };

  const getTypeLabel = (tx: Transaction) => {
    const { category, type } = tx;
    if (category === 'game') {
      if (type === 'bet') return 'Game Bet';
      if (type === 'win') return 'Game Win';
      if (type === 'refund') return 'Game Refund';
      return `Game ${type}`;
    }
    if (category === 'gift') {
      return type === 'send' ? 'Gift Sent' : 'Gift Received';
    }
    if (category === 'transfer') {
      return type === 'send' ? 'Credit Sent' : 'Credit Received';
    }
    return type;
  };

  const getAmountPrefix = (tx: Transaction) => {
    const { category, type } = tx;
    if (category === 'game') {
      return type === 'bet' ? '-' : '+';
    }
    return type === 'send' ? '-' : '+';
  };

  const getAmountColor = (tx: Transaction) => {
    const prefix = getAmountPrefix(tx);
    return prefix === '-' ? '#E74C3C' : '#27AE60';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Transaction History</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Enter username to search..."
          placeholderTextColor={theme.secondary}
          value={searchUsername}
          onChangeText={setSearchUsername}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: '#0a5229' }]}
          onPress={loadTransactions}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.transactionList, { backgroundColor: theme.background }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0a5229" />
          </View>
        ) : !searched ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={theme.secondary} />
            <Text style={[styles.emptyText, { color: theme.secondary }]}>
              Enter a username to view their transaction history
            </Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={theme.secondary} />
            <Text style={[styles.emptyText, { color: theme.secondary }]}>
              No transactions found for "{searchUsername}"
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.resultCount, { color: theme.secondary }]}>
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found for "{searchUsername}"
            </Text>
            {transactions.map((tx) => (
              <View key={`${tx.category}-${tx.id}`} style={[styles.transactionItem, { borderBottomColor: theme.border }]}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: getCategoryColor(tx.category) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(tx.category)}
                      size={20}
                      color={getCategoryColor(tx.category)}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <View style={styles.typeRow}>
                      <Text style={[styles.transactionType, { color: theme.text }]}>
                        {getTypeLabel(tx)}
                      </Text>
                      <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(tx.category) }]}>
                        <Text style={styles.categoryBadgeText}>{tx.category.toUpperCase()}</Text>
                      </View>
                    </View>
                    {tx.description && (
                      <Text style={[styles.transactionDesc, { color: theme.secondary }]} numberOfLines={1}>
                        {tx.description}
                      </Text>
                    )}
                    <Text style={[styles.transactionTime, { color: theme.secondary }]}>
                      {new Date(tx.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.transactionAmount, { color: getAmountColor(tx) }]}>
                  {getAmountPrefix(tx)}{tx.amount}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    marginTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  resultCount: {
    fontSize: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  transactionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionTime: {
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },
});
