import { devLog } from '@/utils/devLog';
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Keyboard, Platform, Alert } from 'react-native';
import { usePrivateMessagesData, useRoomTabsStore } from '@/stores/useRoomTabsStore';
import { ChatRoomContent } from './ChatRoomContent';
import { PrivateChatInput, PrivateChatInputRef } from './PrivateChatInput';
import { EmojiPicker, EMOJI_PICKER_HEIGHT } from './EmojiPicker';
import { useThemeCustom } from '@/theme/provider';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrivateChatInstanceProps {
  roomId: string;
  targetUsername: string;
  targetUserId?: string;
  bottomPadding: number;
  isActive: boolean;
}

export const PrivateChatInstance = React.memo(function PrivateChatInstance({
  roomId,
  targetUsername,
  targetUserId,
  bottomPadding,
  isActive,
}: PrivateChatInstanceProps) {
  // Get current user ID from store
  const currentUserId = useRoomTabsStore((state) => state.currentUserId);
  
  // 🔑 Extract the OTHER user's ID from roomId
  const userId = useMemo(() => {
    // Old format: pm_123
    if (roomId.startsWith('pm_')) {
      const match = roomId.match(/^pm_(\d+)$/);
      return match ? match[1] : '';
    }
    
    // New format: private:minId:maxId or dm:minId:maxId
    if (roomId.startsWith('private:') || roomId.startsWith('dm:')) {
      const parts = roomId.split(':');
      if (parts.length === 3) {
        const id1 = parts[1];
        const id2 = parts[2];
        const myId = String(currentUserId);
        // Return the OTHER user's ID (the one that's not me)
        return (myId === id1) ? id2 : id1;
      }
    }
    
    // Fallback to targetUserId if provided
    if (targetUserId && !targetUserId.includes(':')) {
      return targetUserId;
    }
    
    return '';
  }, [roomId, targetUserId, currentUserId]);
  
  // 🔑 Use PM store instead of room messages
  const allMessages = usePrivateMessagesData(userId);
  const blockedUsernames = useRoomTabsStore(state => state.blockedUsernames);
  
  // Filter out messages from blocked users
  const messages = useMemo(() => {
    return allMessages.filter(msg => {
      // Always show system messages and own messages
      if (msg.isSystem || msg.isOwnMessage || !msg.username) {
        return true;
      }
      // Filter out messages from blocked users
      return !blockedUsernames.has(msg.username.toLowerCase());
    });
  }, [allMessages, blockedUsernames]);
  
  const { theme } = useThemeCustom();
  const inputRef = React.useRef<PrivateChatInputRef>(null);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const addMessage = useRoomTabsStore((state) => state.addMessage);
  const closeRoom = useRoomTabsStore((state) => state.closeRoom);
  const clearChat = useRoomTabsStore((state) => state.clearChat);
  const router = useRouter();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      // Add a small offset (e.g., 20) to move the input up slightly higher
      setKeyboardHeight(e.endCoordinates.height + (Platform.OS === 'android' ? 20 : 0));
      setEmojiVisible(false);
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Listen for PM errors (busy/away status) - show as chat message
  useEffect(() => {
    const socket = useRoomTabsStore.getState().socket;
    if (!socket) return;

    const handlePmError = (data: { toUserId: string; toUsername: string; message: string; type: string }) => {
      // Only show error if it's for this chat
      if (data.toUserId === userId || data.toUsername === targetUsername) {
        const pmStore = useRoomTabsStore.getState();
        const currentMessages = pmStore.privateMessages[userId] || [];
        
        // Check if the last message was the same error to prevent duplicates
        const lastMsg = currentMessages[currentMessages.length - 1];
        if (lastMsg && (lastMsg.isSystem || lastMsg.messageType === 'error' || lastMsg.type === 'error' || lastMsg.messageType === 'system') && lastMsg.message === data.message) {
          devLog('🚫 Skipping duplicate PM error:', data.message);
          return;
        }

        // Show error as a system message in chat instead of popup
        const addPrivateMessage = pmStore.addPrivateMessage;
        
        // Map common "offline" or "pm" related messages to "DM" terminology
        let displayMessage = data.message;
        if (displayMessage.toLowerCase().includes('pm')) {
          displayMessage = displayMessage.replace(/pm/gi, 'DM');
        }
        if (displayMessage.toLowerCase().includes('offline')) {
          displayMessage = `${data.toUsername} sedang offline. Pesan akan terkirim saat dia online.`;
        }

        addPrivateMessage(userId, {
          id: `error-${Date.now()}`,
          username: 'System',
          message: displayMessage,
          messageType: 'system',
          type: 'system',
          timestamp: new Date().toISOString(),
          isSystem: true,
        });
      }
    };

    socket.on('pm:error', handlePmError);

    return () => {
      socket.off('pm:error', handlePmError);
    };
  }, [userId, targetUsername]);

    // Listen for DM events
    useEffect(() => {
      const socket = useRoomTabsStore.getState().socket;
      if (!socket) return;
  
      const handleDmReceive = (messageData: any) => {
        const pmStore = useRoomTabsStore.getState();
        // Check if message belongs to this DM (either by IDs or roomId)
        if (messageData.fromUserId === userId || messageData.toUserId === userId || messageData.roomId === roomId) {
          pmStore.addPrivateMessage(userId, messageData);
        }
      };
  
      const handleDmSent = (messageData: any) => {
        const pmStore = useRoomTabsStore.getState();
        // Check if message belongs to this DM
        if (messageData.toUserId === userId || messageData.roomId === roomId) {
          pmStore.addPrivateMessage(userId, messageData);
        }
      };
  
      socket.on('dm:receive', handleDmReceive);
      socket.on('dm:sent', handleDmSent);
  
      return () => {
        socket.off('dm:receive', handleDmReceive);
        socket.off('dm:sent', handleDmSent);
      };
    }, [userId]);

    const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    // Get socket from store
    const socket = useRoomTabsStore.getState().socket;
    if (!socket?.connected) {
      console.warn('Socket not connected for DM');
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    // Get current user info
    const userDataStr = await AsyncStorage.getItem('user_data');
    if (!userDataStr) {
      Alert.alert('Error', 'Please login first');
      return;
    }
    const currentUser = JSON.parse(userDataStr);
    
    if (!userId) {
      Alert.alert('Error', 'Invalid recipient');
      return;
    }

    const trimmedMsg = message.trim();
    const lowerMsg = trimmedMsg.toLowerCase();

    // Handle /gift command in DM
    if (lowerMsg.startsWith('/gift ')) {
      const parts = trimmedMsg.split(' ');
      if (parts.length >= 2) { // Allow /gift {giftName} [target]
        const giftName = parts[1];
        const target = parts[2] || targetUsername; // Default to current chat partner
        
        devLog('🎁 Sending DM gift via gift:send:', { giftName, target, roomId });
        // Removed optimistic update to let server control the response and coins deduction
        socket.emit('dm:send', {
          fromUserId: String(currentUserId),
          fromUsername: currentUser.username,
          toUserId: String(userId),
          toUsername: targetUsername,
          message: trimmedMsg,
          clientMsgId: `gift_cmd_${Date.now()}`
        });
        return;
      }
    }

    const clientMsgId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log socket status before sending
    devLog('📤 PM socket status:', {
      connected: socket.connected,
      id: socket.id,
      namespace: (socket as any).nsp
    });
    
    // Send PM via socket (server will broadcast to all tabs)
    const pmData = {
      fromUserId: String(currentUser.id),
      fromUsername: currentUser.username,
      toUserId: String(userId),
      toUsername: targetUsername,
      message: message.trim(),
      clientMsgId
    };
    devLog('📤 DM data being sent:', pmData);
    socket.emit('dm:send', pmData);
    
    devLog('📤 DM emitted to:', targetUsername, '| ID:', clientMsgId);
  }, [targetUsername, userId]);

  const handleImageSend = useCallback(async (imageUrl: string) => {
    // Get socket from store
    const socket = useRoomTabsStore.getState().socket;
    if (!socket?.connected) {
      console.warn('Socket not connected for PM image');
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    // Get current user info
    const userDataStr = await AsyncStorage.getItem('user_data');
    if (!userDataStr) {
      Alert.alert('Error', 'Please login first');
      return;
    }
    const currentUser = JSON.parse(userDataStr);
    
    if (!userId) {
      Alert.alert('Error', 'Invalid recipient');
      return;
    }

    const clientMsgId = `pm_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send image as a message with [img] tag
    const imageMessage = `[img]${imageUrl}[/img]`;
    
    const pmData = {
      fromUserId: String(currentUser.id),
      fromUsername: currentUser.username,
      toUserId: String(userId),
      toUsername: targetUsername,
      message: imageMessage,
      clientMsgId
    };
    
    socket.emit('dm:send', pmData);
    devLog('📤 DM image sent to:', targetUsername);
  }, [targetUsername, userId]);

  const handleEmojiPress = useCallback(() => {
    setEmojiVisible(!emojiVisible);
  }, [emojiVisible]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    inputRef.current?.insertEmoji(emoji);
  }, []);

  const handleViewProfile = useCallback((userId: string) => {
    router.push({
      pathname: '/view-profile',
      params: { userId }
    });
  }, [router]);

  const handleBlockUser = useCallback(async (targetUserId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/block`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetId: targetUserId
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Add to blocked list in store
        const addBlockedUsername = useRoomTabsStore.getState().addBlockedUsername;
        addBlockedUsername(targetUsername);
        
        Alert.alert('Success', 'User has been blocked');
        closeRoom(roomId);
      } else {
        Alert.alert('Error', data.message || 'Failed to block user');
      }
    } catch (error) {
      console.error('Block user error:', error);
      Alert.alert('Error', 'An error occurred while blocking user');
    }
  }, [roomId, closeRoom, targetUsername]);

  const handleClearChat = useCallback((rId: string) => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => clearChat(rId)
        }
      ]
    );
  }, [clearChat]);

  const handleCloseChat = useCallback((rId: string) => {
    // Just close the PM tab - don't navigate away
    // The chatroom will switch to the next available tab (room or other PM)
    closeRoom(rId);
    devLog('🚪 PM tab closed:', rId);
  }, [closeRoom]);

  // Handle room level "close" event if it exists in props or via navigation
  // For now, let's assume the user wants a button to close JUST this DM.
  // We'll add a simple button or logic to the UI to close the DM.

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Messages - flex: 1 to take remaining space */}
      <View style={styles.messagesContainer}>
        <ChatRoomContent 
          messages={messages} 
          bottomPadding={0}
          disableAutoScroll={true}
        />
      </View>

      {/* Bottom section - Input and emoji picker */}
      <View style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0 }}>
        {/* Input */}
        <PrivateChatInput
          ref={inputRef}
          onSend={handleSendMessage}
          onImageSend={handleImageSend}
          onEmojiPress={handleEmojiPress}
          emojiPickerVisible={emojiVisible}
          emojiPickerHeight={emojiVisible ? EMOJI_PICKER_HEIGHT : 0}
        />

        {/* Emoji Picker - Below input, inline mode */}
        {emojiVisible && (
          <EmojiPicker 
            visible={emojiVisible}
            onClose={() => setEmojiVisible(false)}
            onEmojiSelect={handleEmojiSelect}
            inline={true}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
});
