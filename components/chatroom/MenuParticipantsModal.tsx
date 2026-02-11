import { devLog } from '@/utils/devLog';

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';
import { ReportAbuseModal } from './ReportAbuseModal';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';

interface Participant {
  username: string;
  role?: string;
  isModerator?: boolean;
  isCreator?: boolean;
  usernameColor?: string;
}

interface MenuParticipantsModalProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;
  onUserMenuPress?: (username: string, action: string) => void;
}

const ThreeDotsIcon = ({ color = '#000', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="2" fill={color} />
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="12" cy="19" r="2" fill={color} />
  </Svg>
);

const getParticipantColor = (participant: Participant): string => {
  if (participant.usernameColor) {
    return participant.usernameColor;
  }
  
  if (participant.isCreator) {
    return '#FFD700'; // Yellow for Creator
  }
  
  if (participant.isModerator) {
    return '#FFD700'; // Yellow for Moderator
  }
  
  switch (participant.role?.toLowerCase()) {
    case 'admin':
    case 'super_admin':
      return '#FF8C00'; // orange
    case 'mentor':
      return '#F44336'; // red
    case 'merchant':
      return '#A78BFA'; // purple
    case 'customer_service':
    case 'cs':
      return '#34D399'; // green
    default:
      return '#4BA3FF'; // light blue
  }
};

const menuOptions = [
  { label: 'View Profile', value: 'view-profile' },
  { label: 'Follow User', value: 'follow' },
  { label: 'Private Chat', value: 'private-chat' },
  { label: 'Kick User', value: 'kick' },
  { label: 'Block User', value: 'block' },
  { label: 'Report Abuse', value: 'report-abuse' },
];

export function MenuParticipantsModal({ visible, onClose, roomId, onUserMenuPress }: MenuParticipantsModalProps) {
  const { theme } = useThemeCustom();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (visible && roomId) {
      fetchParticipants();
    }
  }, [visible, roomId]);

  // Listen for participant updates
  useEffect(() => {
    if (!visible || !roomId) return;

    const handleParticipantsUpdate = (data: { roomId: string; participants: any[] }) => {
      devLog('🔄 [Modal] Participants update received:', data);
      if (data.roomId === roomId && Array.isArray(data.participants)) {
        // Handle both formats: array of strings or array of objects
        const formattedParticipants = data.participants.map(p => {
          if (typeof p === 'string') {
            // Backend sends array of username strings
            return { username: p, role: 'user' };
          } else {
            // Backend sends array of objects
            return { 
              username: p.username, 
              role: p.role || 'user',
              usernameColor: p.usernameColor
            };
          }
        });
        devLog('✅ [Modal] Updating participants:', formattedParticipants);
        setParticipants(formattedParticipants);
      }
    };

    const socket = useRoomTabsStore.getState().socket;
    if (socket) {
      devLog('🔌 [Modal] Registering participant update listener for room:', roomId);
      socket.on('room:participants:update', handleParticipantsUpdate);
      return () => {
        socket.off('room:participants:update', handleParticipantsUpdate);
      };
    }
  }, [visible, roomId]);

  const fetchParticipants = async () => {
    if (!roomId) return;
    
    try {
      setLoading(true);
      devLog('🔍 Fetching participants for room:', roomId);
      
      const response = await fetch(`${API_BASE_URL}/api/chatroom/${roomId}/participants`);
      const data = await response.json();
      
      devLog('📥 Participants response:', data);
      
      if (data.success && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuPress = (username: string) => {
    setSelectedUser(username);
    setShowUserMenu(true);
  };

  const handleMenuOption = async (action: string) => {
    if (!selectedUser) return;

    if (action === 'view-profile') {
      // Get user ID from username
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/username/${selectedUser}`);
        const data = await response.json();
        
        if (data && data.id) {
          // Close modals
          setShowUserMenu(false);
          setSelectedUser(null);
          onClose(); // Close the participants modal
          
          // Navigate to view-profile screen
          router.push(`/view-profile?userId=${data.id}`);
        } else {
          console.error('User not found:', data.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    } else if (action === 'private-chat') {
      // Open private chat as new tab in chatroom
      try {
        // Get userId from username
        const response = await fetch(`${API_BASE_URL}/api/users/username/${selectedUser}`);
        const data = await response.json();
        
        if (!data || !data.id) {
          console.error('User not found for private chat:', selectedUser);
          Alert.alert('Error', 'User not found');
          return;
        }
        
        const { useRoomTabsStore, buildConversationId } = await import('@/stores/useRoomTabsStore');
        const store = useRoomTabsStore.getState();
        
        // Use stable conversation ID to prevent duplicates (format: private:minId:maxId)
        const privateChatId = buildConversationId(store.currentUserId, data.id.toString());
        
        // Open as new tab with username as display name
        store.openRoom(privateChatId, selectedUser);
        
        // Switch to the PM tab immediately
        store.setActiveRoomById(privateChatId);
        
        devLog('🔓 Opened and switched to private chat tab:', privateChatId, 'for user:', selectedUser);
        
        // Close modals
        setShowUserMenu(false);
        setSelectedUser(null);
        onClose();
        
        // Navigate to the chatroom screen (which will show the active PM tab)
        router.push({
          pathname: '/chatroom/[id]',
          params: {
            id: privateChatId,
            name: selectedUser,
          },
        });
      } catch (error) {
        console.error('Error opening private chat:', error);
        Alert.alert('Error', 'Failed to open private chat');
      }
    } else if (action === 'block') {
      // Handle block user action
      try {
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (!userDataStr) {
          Alert.alert('Error', 'User data not found. Please login again.');
          return;
        }

        const currentUser = JSON.parse(userDataStr);
        const token = await AsyncStorage.getItem('auth_token');
        
        if (!token) {
          Alert.alert('Error', 'Authentication token not found. Please login again.');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/profile/block`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            blockedUsername: selectedUser,
          }),
        });

        const data = await response.json();
        if (data.success) {
          // Add to blocked list in store
          const { useRoomTabsStore } = await import('@/stores/useRoomTabsStore');
          const addBlockedUsername = useRoomTabsStore.getState().addBlockedUsername;
          addBlockedUsername(selectedUser);
          
          Alert.alert('Success', `You have blocked ${selectedUser}`, [
            { text: 'OK', onPress: () => {
              setShowUserMenu(false);
              setSelectedUser(null);
            }}
          ]);
        } else {
          Alert.alert('Error', data.message || 'Failed to block user');
        }
      } catch (error) {
        console.error('Error blocking user:', error);
        Alert.alert('Error', 'Failed to block user');
      }
    } else if (action === 'follow') {
      // Handle follow user action
      try {
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (!userDataStr) {
          Alert.alert('Error', 'User data not found. Please login again.');
          return;
        }

        const currentUser = JSON.parse(userDataStr);
        const token = await AsyncStorage.getItem('auth_token');
        
        if (!token) {
          Alert.alert('Error', 'Authentication token not found. Please login again.');
          return;
        }

        // Get user ID from username first
        const userResponse = await fetch(`${API_BASE_URL}/api/users/username/${selectedUser}`);
        const userData = await userResponse.json();
        
        if (!userData || !userData.id) {
          Alert.alert('Error', 'User not found');
          return;
        }

        // Make API call to follow the user
        const response = await fetch(`${API_BASE_URL}/api/profile/follow`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            followingId: userData.id,
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          const socket = (window as any).__GLOBAL_SOCKET__;

          // Show private follow confirmation (only sender sees)
          if (roomId) {
            const { useRoomTabsStore } = require('../../stores/useRoomTabsStore');
            const addMessage = useRoomTabsStore.getState().addMessage;
            addMessage(roomId, {
              id: `follow-${Date.now()}`,
              message: `You Are Now Following ${selectedUser}`,
              messageType: 'cmd',
              type: 'private',
              usernameColor: '#8B4513',
              messageColor: '#8B4513',
              isCmd: true,
              timestamp: new Date().toISOString(),
            });
          }

          // Send follow notification to the followed user
          if (socket) {
            socket.emit('notif:send', {
              username: selectedUser,
              notification: {
                type: 'follow',
                message: `${currentUser.username} has followed you`,
                from: currentUser.username,
                fromUserId: currentUser.id,
                timestamp: Date.now(),
              },
            });
          }

          Alert.alert('Success', `Follow request sent to ${selectedUser}`);
        } else {
          Alert.alert('Error', data.error || 'Failed to follow user');
        }

        // Close modals
        setShowUserMenu(false);
        setSelectedUser(null);
      } catch (error) {
        console.error('Error following user:', error);
        Alert.alert('Error', 'Failed to follow user');
      }
    } else if (action === 'report-abuse') {
      // Open report abuse modal
      setShowReportModal(true);
      setShowUserMenu(false);
    } else if (onUserMenuPress) {
      onUserMenuPress(selectedUser, action);
      setShowUserMenu(false);
      setSelectedUser(null);
    }
  };

  return (
    <>
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
          <View style={styles.modalContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.modal, { backgroundColor: theme.card }]}
            >
              {/* Dark Green Header */}
              <View style={[styles.header, { backgroundColor: '#082919' }]}>
                <Text style={[styles.title, { color: theme.text }]}>
                  Participants ({participants.length})
                </Text>
              </View>

              {/* Participants List */}
              <ScrollView style={[styles.scrollView, { backgroundColor: theme.card }]} showsVerticalScrollIndicator={false}>
                {loading ? (
                  <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#082919" />
                  </View>
                ) : participants.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.secondary }]}>
                      No users in the room
                    </Text>
                  </View>
                ) : (
                  participants.map((participant, index) => (
                    <View
                      key={index}
                      style={[
                        styles.userItem,
                        { backgroundColor: theme.card },
                        index < participants.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }
                      ]}
                    >
                      <Text 
                        style={[
                          styles.username, 
                          { color: getParticipantColor(participant) }
                        ]}
                      >
                        {participant.username}
                      </Text>
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => handleMenuPress(participant.username)}
                      >
                        <ThreeDotsIcon color={theme.secondary} size={20} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* User Menu Modal */}
      <Modal
        visible={showUserMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.menuContent, { backgroundColor: theme.card }]}
            >
              {menuOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index < menuOptions.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }
                  ]}
                  onPress={() => handleMenuOption(option.value)}
                >
                  <Text style={[styles.menuItemText, { color: theme.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Abuse Modal */}
      <ReportAbuseModal
        visible={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedUser(null);
        }}
        roomId={roomId || ''}
        roomName=""
        targetUsername={selectedUser || ''}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '75%',
  },
  modal: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  // User Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '70%',
  },
  menuContent: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
