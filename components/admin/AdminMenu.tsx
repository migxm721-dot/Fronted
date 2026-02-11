import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface AdminMenuProps {
  insets: any;
  onAddCoin: () => void;
  onCreateAccount: () => void;
  onTransactionHistory: () => void;
  onReportAbuse: () => void;
  onSetAlert: () => void;
  onClose: () => void;
}

export function AdminMenu({ insets, onAddCoin, onCreateAccount, onTransactionHistory, onReportAbuse, onSetAlert, onClose }: AdminMenuProps) {
  const router = useRouter();

  const handleUserManagement = () => {
    onClose();
    router.push('/user-management');
  };

  return (
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={[styles.menuDropdown, { top: insets.top + 50 }]}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            onClose();
            onAddCoin();
          }}
        >
          <Ionicons name="cash-outline" size={20} color="#2ECC71" />
          <Text style={styles.menuItemText}>Add Coin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            onClose();
            onCreateAccount();
          }}
        >
          <Ionicons name="person-add-outline" size={20} color="#3498DB" />
          <Text style={styles.menuItemText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleUserManagement}
        >
          <Ionicons name="person-outline" size={20} color="#9B59B6" />
          <Text style={styles.menuItemText}>User Management</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            onClose();
            onTransactionHistory();
          }}
        >
          <Ionicons name="receipt-outline" size={20} color="#E67E22" />
          <Text style={styles.menuItemText}>Transaction History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            onClose();
            onReportAbuse();
          }}
        >
          <Ionicons name="alert-outline" size={20} color="#EF4444" />
          <Text style={styles.menuItemText}>Abuse Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            onClose();
            onSetAlert();
          }}
        >
          <Ionicons name="megaphone-outline" size={20} color="#F59E0B" />
          <Text style={styles.menuItemText}>Set Alert</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
