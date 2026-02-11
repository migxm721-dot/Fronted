import { devLog } from '@/utils/devLog';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  AppState,
  BackHandler,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import API_BASE_URL from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { registerSocketDisconnectCallback, unregisterSocketDisconnectCallback, queueMessage, isSocketReady } from '@/hooks/useSocketInit';

import { ChatRoomHeader } from '@/components/chatroom/ChatRoomHeader';
import { ChatRoomTabs } from '@/components/chatroom/ChatRoomTabs';
import { ChatRoomInput } from '@/components/chatroom/ChatRoomInput';
import { EmojiPicker, EMOJI_PICKER_HEIGHT } from '@/components/chatroom/EmojiPicker';
import { MenuKickModal } from '@/components/chatroom/MenuKickModal';
import { MenuParticipantsModal } from '@/components/chatroom/MenuParticipantsModal';
import { RoomInfoModal } from '@/components/chatroom/RoomInfoModal';
import { VoteKickButton } from '@/components/chatroom/VoteKickButton';
import { ChatRoomMenu } from '@/components/chatroom/ChatRoomMenu';
import { ReportAbuseModal } from '@/components/chatroom/ReportAbuseModal';
import { PrivateChatMenuModal } from '@/components/chatroom/PrivateChatMenuModal';
import { GiftModal } from '@/components/chatroom/GiftModal';
import { CmdList } from '@/components/chatroom/CmdList';
import { HeaderOptionsMenu } from '@/components/chatroom/HeaderOptionsMenu';
import { BackgroundChangeModal } from '@/components/chatroom/BackgroundChangeModal';
import { useRoomTabsStore, useActiveRoom, useActiveRoomId, useOpenRooms, buildConversationId } from '@/stores/useRoomTabsStore';

const HEADER_COLOR = '#0a5229';

// Module-level flags
let lastSocketUsername: string | null = null;

// Global flag to prevent multiple AppState handlers from firing simultaneously
let appStateHandlerActive = false;
let lastAppStateChangeTime = 0;

// Global registry to track which socket has listeners attached (prevents duplicates across instances)
let chatroomListenersSocketId: string | null = null;
let heartbeatListenersSocketId: string | null = null;

// Reset chatroom listener registry (called on socket disconnect)
export const resetChatroomListeners = () => {
  chatroomListenersSocketId = null;
  heartbeatListenersSocketId = null;
  lastSocketUsername = null;
};

// Export function to reset socket state on logout (call this from logout handler)
export const resetSocketState = async () => {
  resetChatroomListeners();
  // Also clear saved active chatroom on logout
  try {
    await AsyncStorage.removeItem('last_active_chatroom');
  } catch (error) {
    console.error('Error clearing active chatroom on logout:', error);
  }
};

export default function ChatRoomScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();

  const roomId = params.id as string;
  const roomName = (params.name as string) || 'Mobile fun';

  const activeRoom = useActiveRoom();
  const activeRoomId = useActiveRoomId();
  const openRooms = useOpenRooms();
  
  const socket = useRoomTabsStore(state => state.socket);
  const currentUsername = useRoomTabsStore(state => state.currentUsername);
  const currentUserId = useRoomTabsStore(state => state.currentUserId);
  const setSocket = useRoomTabsStore(state => state.setSocket);
  const setUserInfo = useRoomTabsStore(state => state.setUserInfo);
  const openRoom = useRoomTabsStore(state => state.openRoom);
  const closeRoom = useRoomTabsStore(state => state.closeRoom);
  const setActiveRoomById = useRoomTabsStore(state => state.setActiveRoomById);
  const clearAllRooms = useRoomTabsStore(state => state.clearAllRooms);
  const markRoomLeft = useRoomTabsStore(state => state.markRoomLeft);

  const [emojiVisible, setEmojiVisible] = useState(false);
  const inputRef = useRef<{ insertEmoji: (code: string) => void } | null>(null);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [kickModalVisible, setKickModalVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [cmdListVisible, setCmdListVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [privateChatMenuVisible, setPrivateChatMenuVisible] = useState(false);
  const [pmGiftModalVisible, setPmGiftModalVisible] = useState(false);
  const [roomGiftModalVisible, setRoomGiftModalVisible] = useState(false);
  const [headerOptionsVisible, setHeaderOptionsVisible] = useState(false);
  const [roomInfoModalVisible, setRoomInfoModalVisible] = useState(false);
  const [roomInfoData, setRoomInfoData] = useState<any>(null);
  const [reportAbuseModalVisible, setReportAbuseModalVisible] = useState(false);
  const [backgroundModalVisible, setBackgroundModalVisible] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [roomOwnerId, setRoomOwnerId] = useState<string | null>(null);
  const [currentRoomBackground, setCurrentRoomBackground] = useState<string | null>(null);
  
  const updateRoomBackground = useRoomTabsStore(state => state.updateRoomBackground);
  
  const [activeVote, setActiveVote] = useState<{
    target: string;
    remainingVotes: number;
    remainingSeconds: number;
  } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const [isConnected, setIsConnected] = useState(() => socket?.connected || false);
  const roomInitialized = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Register disconnect callback to reset listener registry
  useEffect(() => {
    registerSocketDisconnectCallback(resetChatroomListeners);
    return () => {
      unregisterSocketDisconnectCallback(resetChatroomListeners);
    };
  }, []);

  useEffect(() => {
    async function loadSound() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Get the sound source and validate it before loading
        const soundSource = require('@/assets/sound/privatechat.mp3');
        
        // Check if the source is valid before attempting to load
        if (!soundSource) {
          console.warn('⚠️ Private chat sound source is null/undefined, skipping audio load');
          // Create a no-op function so callers don't error
          (window as any).__PLAY_PRIVATE_SOUND__ = async () => {};
          return;
        }

        const { sound } = await Audio.Sound.createAsync(
          soundSource,
          { shouldPlay: false }
        );
        soundRef.current = sound;
        
        (window as any).__PLAY_PRIVATE_SOUND__ = async () => {
          try {
            // Only play sound if app is in foreground (active)
            const appState = AppState.currentState;
            if (appState !== 'active' || !soundRef.current) {
              return;
            }
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
          } catch (e) {
            // Silently ignore audio focus errors when app is in background
            if (e instanceof Error && e.message.includes('AudioFocus')) {
              return;
            }
            console.warn('Private chat sound error:', (e as Error).message);
          }
        };
        
        devLog('✅ Private chat sound loaded successfully');
      } catch (e) {
        console.error('Error loading private chat sound:', e);
        // Create a no-op function to prevent errors when sound fails to load
        (window as any).__PLAY_PRIVATE_SOUND__ = async () => {};
      }
    }
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
      }
      delete (window as any).__PLAY_PRIVATE_SOUND__;
    };
  }, []);

  // Use the store's activeRoomId for UI decisions (which tab is currently visible)
  // This allows swipe navigation to work correctly
  const currentActiveRoomId = activeRoomId || roomId;
  const isPrivateChat = currentActiveRoomId?.startsWith('dm_') || currentActiveRoomId?.startsWith('private:') || false;
  
  const chatBackgroundColor = '#F0F0F0';
  
  // Sync store's activeIndex to match route's roomId when screen gains focus
  // This ensures clicking a room from chatlist always switches to the correct tab
  // Also handles socket reconnection when returning from transfer/feed screens
  useFocusEffect(
    useCallback(() => {
      if (!roomId) return;
      
      // Access store state directly to get the latest values
      const state = useRoomTabsStore.getState();
      const roomIds = state.openRoomIds;
      const currentActiveId = state.getActiveRoomId();
      
      if (roomIds.length > 0 && roomIds.includes(roomId)) {
        if (currentActiveId !== roomId) {
          devLog(`🔄 [ChatRoom] Focus sync: switching to ${roomId} (was: ${currentActiveId})`);
          setActiveRoomById(roomId);
        }
      }
      
      // Force socket reconnection check when screen regains focus
      // This fixes chat not working after returning from transfer/feed screens
      const currentSocket = state.socket;
      if (currentSocket) {
        if (!currentSocket.connected) {
          devLog(`🔌 [ChatRoom] Screen focused - socket disconnected, reconnecting...`);
          currentSocket.connect();
        } else {
          const allOpenRoomIds = state.openRoomIds || [];
          for (const rid of allOpenRoomIds) {
            const isPmTab = rid.startsWith('private:') || rid.startsWith('pm_');
            const alreadyJoined = state.joinedRoomIds.has(rid);
            if (!isPmTab && alreadyJoined) {
              currentSocket.emit('room:silent_rejoin', {
                roomId: rid,
                userId: state.currentUserId,
                username: state.currentUsername,
                silent: true
              });
              
              const existingMessages = state.messagesByRoom[rid] || [];
              const nonSystemMsgs = existingMessages.filter(m => !m.isSystem && !m.isPresence);
              if (nonSystemMsgs.length > 0) {
                const lastMsg = nonSystemMsgs[nonSystemMsgs.length - 1];
                devLog(`📜 [ChatRoom] Syncing missed messages for ${rid} after: ${lastMsg.id}`);
                currentSocket.emit('chat:sync', { roomId: rid, lastMessageId: lastMsg.id });
              }
            }
          }
        }
      }
    }, [roomId, setActiveRoomById])
  );

  // Additional sync when rooms first load (handles case when rooms load after focus)
  // Only sync once when the room becomes available, not on every activeRoomId change
  const hasInitialSynced = useRef(false);
  useEffect(() => {
    // Reset sync flag when roomId changes (new navigation)
    hasInitialSynced.current = false;
  }, [roomId]);
  
  useEffect(() => {
    if (!roomId || openRooms.length === 0 || hasInitialSynced.current) return;
    
    const roomExists = openRooms.some(r => r.roomId === roomId);
    if (roomExists) {
      const currentActiveId = useRoomTabsStore.getState().getActiveRoomId();
      if (currentActiveId !== roomId) {
        devLog(`🔄 [ChatRoom] Initial sync: switching to ${roomId} (was: ${currentActiveId})`);
        setActiveRoomById(roomId);
      }
      hasInitialSynced.current = true;
    }
  }, [roomId, openRooms.length, setActiveRoomById]);

  // Save active chatroom to AsyncStorage for app resume functionality
  useEffect(() => {
    const saveActiveChatroom = async () => {
      try {
        const chatroomData = {
          roomId,
          roomName,
          type: isPrivateChat ? 'pm' : 'room',
          timestamp: Date.now()
        };
        await AsyncStorage.setItem('last_active_chatroom', JSON.stringify(chatroomData));
        devLog('💾 Saved active chatroom:', roomId);
      } catch (error) {
        console.error('Error saving active chatroom:', error);
      }
    };
    
    if (roomId) {
      saveActiveChatroom();
    }
  }, [roomId, roomName, isPrivateChat]);

  useEffect(() => {
    if (socket?.connected && !isConnected) {
      setIsConnected(true);
    }
  }, [socket, isConnected]);

  useEffect(() => {
    const loadUserData = async () => {
      // First check if store already has valid user info - don't overwrite
      const storeState = useRoomTabsStore.getState();
      if (storeState.currentUsername && storeState.currentUsername !== 'guest' && storeState.currentUserId && storeState.currentUserId !== 'guest-id') {
        devLog('📱 [Chatroom] Using existing userInfo from store:', storeState.currentUsername);
        // Also load role if available
        try {
          const userDataStr = await AsyncStorage.getItem('user_data');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData.role) {
              setUserRole(userData.role);
            }
          }
        } catch {}
        return; // Already have valid user info, don't overwrite
      }
      
      try {
        const userDataStr = await AsyncStorage.getItem('user_data');
        const authToken = await AsyncStorage.getItem('auth_token');
        
        if (userDataStr && authToken) {
          const userData = JSON.parse(userDataStr);
          if (userData.username && userData.id) {
            devLog('📱 [Chatroom] Loaded user_data for userInfo:', userData.username);
            setUserInfo(userData.username, userData.id?.toString());
            if (userData.role) {
              setUserRole(userData.role);
            }
          } else {
            // Invalid user data structure - but we have a token, so don't redirect
            // User might be returning from a long background period
            devLog('📱 [Chatroom] Invalid user_data structure but token exists - waiting for reconnect');
          }
        } else if (!authToken) {
          // No auth token means truly logged out
          devLog('📱 [Chatroom] No auth token - redirecting to login');
          router.replace('/login');
        } else {
          // Has token but no user data - wait for session restore, don't redirect immediately
          devLog('📱 [Chatroom] Has token but no user_data - waiting for session restore');
          // Don't redirect - the user might be resuming from long background
          // The socket reconnection will handle re-auth
        }
      } catch (error) {
        console.error('📱 [Chatroom] Error loading user_data:', error);
        // Don't redirect on parse errors - user might just need to retry
        // Only redirect if definitely no session
        const authToken = await AsyncStorage.getItem('auth_token').catch(() => null);
        if (!authToken) {
          router.replace('/login');
        }
      }
    };
    loadUserData();
  }, [setUserInfo]);

  // Load blocked users list on mount
  useEffect(() => {
    const loadBlockedUsers = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/profile/blocks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const blockedUsers = await response.json();
          if (Array.isArray(blockedUsers)) {
            const { setBlockedUsernames } = useRoomTabsStore.getState();
            const usernames = blockedUsers.map((u: { username: string }) => u.username);
            setBlockedUsernames(usernames);
            devLog('🚫 Loaded blocked users:', usernames.length);
          }
        }
      } catch (error) {
        console.error('Error loading blocked users:', error);
      }
    };
    loadBlockedUsers();
  }, []);

  // Use socket from store (created by useSocketInit in tabs layout)
  useEffect(() => {
    if (!currentUsername || !currentUserId || currentUsername === 'guest') {
      return;
    }

    const currentSocket = useRoomTabsStore.getState().socket;
    
    if (!currentSocket) {
      devLog('🔌 [Chatroom] No socket available yet, waiting...');
      return;
    }
    
    // Only register listeners when socket is connected and has valid id
    if (!currentSocket.connected || !currentSocket.id) {
      devLog('🔌 [Chatroom] Socket not connected yet, waiting...');
      return;
    }
    
    const currentSocketId = currentSocket.id;
    
    // Skip if listeners already registered for this socket (prevents duplicates across chatroom instances)
    if (chatroomListenersSocketId === currentSocketId) {
      setIsConnected(true);
      return;
    }
    
    devLog('🔌 [Chatroom] Registering listeners for socket:', currentSocketId);
    chatroomListenersSocketId = currentSocketId;
    lastSocketUsername = currentUsername;
    
    if (currentSocket.connected) {
      setIsConnected(true);
    }
    
    (window as any).__GLOBAL_SOCKET__ = currentSocket;

    const handleConnect = () => {
      setIsConnected(true);
      devLog('✅ Socket connected! ID:', currentSocket.id);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      devLog('🔌 Socket disconnected:', reason);
    };

    const handleReconnect = (attemptNumber: number) => {
      setIsConnected(true);
      devLog('🔄 Socket reconnected after', attemptNumber, 'attempts');
      
      const openRoomIds = useRoomTabsStore.getState().openRoomIds;
      AsyncStorage.getItem('user_data').then(userData => {
        AsyncStorage.getItem('invisible_mode').then(invisibleMode => {
          const parsedData = userData ? JSON.parse(userData) : {};
          const userRole = parsedData.role || 'user';
          const isInvisible = invisibleMode === 'true' && userRole === 'admin';
          
          openRoomIds.forEach((rid) => {
            if (!rid.startsWith('private:') && !rid.startsWith('dm_')) {
              devLog('🔄 Rejoining room after reconnect (silent):', rid);
              currentSocket.emit('join_room', {
                roomId: rid,
                userId: currentUserId,
                username: currentUsername,
                invisible: isInvisible,
                role: userRole,
                silent: true
              });
            }
          });
        });
      });
    };


    const handleVoteStarted = (data: { target: string; remainingVotes: number; remainingSeconds: number }) => {
      setActiveVote(data);
      setHasVoted(false);
    };

    const handleVoteUpdated = (data: { remainingVotes: number; remainingSeconds: number }) => {
      setActiveVote(prev => prev ? { ...prev, ...data } : null);
    };

    const handleVoteEnded = () => {
      setActiveVote(null);
      setHasVoted(false);
    };

    const handleForceKick = (data: { target: string }) => {
      if (data.target === currentUsername) {
        Alert.alert('Kicked', 'You have been kicked from the room', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    };
    
    const handleUserKicked = (data: { roomId: string; kickedUserId: number; kickedUsername: string; kickedBy: string; message: string }) => {
      devLog('👢 User kicked event received:', data);
      if (data.kickedUsername === currentUsername) {
        Alert.alert('Kicked', data.message || 'You have been kicked from the room', [
          { text: 'OK', onPress: () => {
            const { closeRoom } = useRoomTabsStore.getState();
            closeRoom(parseInt(data.roomId));
            router.back();
          }},
        ]);
      }
    };

    const handleParticipantsUpdate = (data: { roomId: string; participants: string[] }) => {
      devLog('🔄 Participants update received:', data);
      if (data.roomId === currentActiveRoomId) {
        setRoomUsers(data.participants);
      }
    };
    
    const handleCurrentlyUpdate = (data: { roomId: string; roomName: string; participants: string }) => {
      devLog('🔄 Currently users update received:', data);
      
      useRoomTabsStore.setState(state => {
        if (!state.openRoomIds.includes(data.roomId)) return state;
        
        const messages = state.messagesByRoom[data.roomId] || [];
        const newParticipantText = `Currently users in the room: ${data.participants}`;
        
        let found = false;
        const updatedMessages = messages.map(msg => {
          if (msg.message && msg.message.startsWith('Currently users in the room:')) {
            found = true;
            return {
              ...msg,
              message: newParticipantText,
            };
          }
          return msg;
        });
        
        if (!found) {
          devLog('⚠️ No "Currently users" message found to update for room:', data.roomId);
          return state;
        }
        
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [data.roomId]: updatedMessages,
          },
        };
      });
    };

    const handlePmReceive = (data: any) => {
      devLog('📩 [PM-RECEIVE] Message from:', data.fromUsername, '| Type:', data.messageType, '| ToUserId:', data.toUserId, '| CurrentUserId:', currentUserId);
      
      const senderUsername = data.fromUsername;
      const senderId = data.fromUserId;
      const message = data.message;
      
      // Safety check: ensure this PM is actually for ME
      if (String(data.toUserId) !== String(useRoomTabsStore.getState().currentUserId)) {
        return;
      }
      
      const validPmTypes = ['pm', 'cmdGift', 'cmdMe', 'cmdRoll', 'cmd', 'cmdShower', 'gift', 'dm'];
      if (!senderUsername || !message || (!validPmTypes.includes(data.messageType) && data.messageType !== 'cmdGift')) {
        return;
      }
      
      const { openRoom, openRoomInBackground, addPrivateMessage, buildConversationId, currentUserId: storeUserId, markUnread, openRoomIds, getActiveRoomId } = useRoomTabsStore.getState();
      const conversationId = buildConversationId(storeUserId, senderId);
      
      const isAlreadyOpen = openRoomIds.includes(conversationId);
      
      if (!isAlreadyOpen) {
        openRoomInBackground(conversationId, senderUsername);
        devLog('🔔 DM tab created in background (unread indicator + sound only):', conversationId);
      }
      
      const roleToUserType = (role: string) => {
        if (role === 'admin') return 'admin';
        if (role === 'mentor') return 'mentor';
        if (role === 'merchant') return 'merchant';
        if (role === 'customer_service') return 'customer_service';
        return 'normal';
      };
      
      const pmMessage: Message = {
        id: data.id || `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: senderUsername,
        message: message,
        isOwnMessage: false,
        userType: roleToUserType(data.fromRole || 'user'),
        timestamp: data.timestamp || new Date().toISOString(),
        messageType: 'dm', // Force to 'dm' for consistent rendering
        type: data.type,
        messageColor: data.messageColor,
      };

      addPrivateMessage(senderId, pmMessage);
      markUnread(conversationId);
      
      const playPrivateSound = (window as any).__PLAY_PRIVATE_SOUND__;
      if (typeof playPrivateSound === 'function') {
        playPrivateSound();
      }
    };

    const handlePmSent = (data: any) => {
      devLog('📩 [PM-SENT] Echo for sent message to:', data.toUsername, '| ToUserId:', data.toUserId);
      
      const { addPrivateMessage, currentUsername: storeUsername, openRoomIds, openRoom, currentUserId: storeUserId } = useRoomTabsStore.getState();
      const targetUserId = String(data.toUserId);
      const conversationId = buildConversationId(storeUserId, targetUserId);
      
      // Ensure tab exists for the sender too
      if (!openRoomIds.includes(conversationId)) {
        openRoom(conversationId, data.toUsername || `User ${targetUserId}`);
      }
      
      const roleToUserType = (role: string) => {
        if (role === 'admin') return 'admin';
        if (role === 'mentor') return 'mentor';
        if (role === 'merchant') return 'merchant';
        if (role === 'customer_service') return 'customer_service';
        return 'normal';
      };
      
      const pmMessage: Message = {
        id: data.id,
        username: data.fromUsername || storeUsername,
        message: data.message,
        isOwnMessage: true,
        userType: roleToUserType(data.fromRole || 'user'),
        timestamp: data.timestamp || new Date().toISOString(),
        messageType: data.messageType,
        type: data.type,
        messageColor: data.messageColor,
      };

      addPrivateMessage(data.toUserId, pmMessage);
    };

    const handlePmError = (data: any) => {
      devLog('📩 [PM-ERROR] Error sending PM:', data.message);
      
      const { addPrivateMessage } = useRoomTabsStore.getState();
      const targetUserId = data.toUserId;
      
      if (targetUserId) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          username: 'System',
          message: data.message,
          messageType: 'system',
          type: 'system',
          timestamp: new Date().toISOString(),
          isSystem: true,
        };
        
        addPrivateMessage(targetUserId, errorMessage);
      }
    };

    let serverRestartHandled = false;
    const handleServerRestarting = async (data: any) => {
      if (serverRestartHandled) return;
      serverRestartHandled = true;
      
      devLog('🔴 [SERVER RESTART] Received notification:', data.message);
      
      currentSocket.io.opts.reconnection = false;
      currentSocket.disconnect();
      
      const { clearAllRooms, setSocket: setStoreSocket } = useRoomTabsStore.getState();
      clearAllRooms();
      setStoreSocket(null);
      
      await AsyncStorage.removeItem('user_data');
      
      Alert.alert(
        'Server Restart',
        'Server sedang restart. Anda akan diarahkan ke halaman login.',
        [{ text: 'OK', onPress: () => router.replace('/') }],
        { cancelable: false }
      );
    };

    const handleUserBlocked = (data: { blockedUsername: string; blockedUserId: number }) => {
      devLog('🚫 User blocked:', data.blockedUsername);
      const { addBlockedUsername } = useRoomTabsStore.getState();
      addBlockedUsername(data.blockedUsername);
    };

    const handleUserUnblocked = (data: { unblockedUsername: string; unblockedUserId: number }) => {
      devLog('✅ User unblocked:', data.unblockedUsername);
      const { removeBlockedUsername } = useRoomTabsStore.getState();
      removeBlockedUsername(data.unblockedUsername);
    };

    // Remove existing listeners before adding new ones
    currentSocket.off('connect', handleConnect);
    currentSocket.off('disconnect', handleDisconnect);
    currentSocket.off('reconnect', handleReconnect);
    currentSocket.off('vote-started', handleVoteStarted);
    currentSocket.off('vote-updated', handleVoteUpdated);
    currentSocket.off('vote-ended', handleVoteEnded);
    currentSocket.off('force-kick', handleForceKick);
    currentSocket.off('user:kicked', handleUserKicked);
    currentSocket.off('room:participants:update', handleParticipantsUpdate);
    currentSocket.off('room:currently:update', handleCurrentlyUpdate);
    currentSocket.off('pm:receive', handlePmReceive);
    currentSocket.off('dm:receive', handlePmReceive);
    currentSocket.off('pm:sent', handlePmSent);
    currentSocket.off('dm:sent', handlePmSent);
    currentSocket.off('pm:error', handlePmError);
    currentSocket.off('dm:error', handlePmError);
    currentSocket.off('server:restarting', handleServerRestarting);
    currentSocket.off('user:blocked', handleUserBlocked);
    currentSocket.off('user:unblocked', handleUserUnblocked);

    // Add listeners
    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('reconnect', handleReconnect);
    currentSocket.on('vote-started', handleVoteStarted);
    currentSocket.on('vote-updated', handleVoteUpdated);
    currentSocket.on('vote-ended', handleVoteEnded);
    currentSocket.on('force-kick', handleForceKick);
    currentSocket.on('user:kicked', handleUserKicked);
    currentSocket.on('room:participants:update', handleParticipantsUpdate);
    currentSocket.on('room:currently:update', handleCurrentlyUpdate);
    currentSocket.on('pm:receive', handlePmReceive);
    currentSocket.on('dm:receive', handlePmReceive);
    currentSocket.on('pm:sent', handlePmSent);
    currentSocket.on('dm:sent', handlePmSent);
    currentSocket.on('pm:error', handlePmError);
    currentSocket.on('dm:error', handlePmError);
    currentSocket.on('server:restarting', handleServerRestarting);
    currentSocket.on('user:blocked', handleUserBlocked);
    currentSocket.on('user:unblocked', handleUserUnblocked);

    return () => {
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
      currentSocket.off('reconnect', handleReconnect);
      currentSocket.off('vote-started', handleVoteStarted);
      currentSocket.off('vote-updated', handleVoteUpdated);
      currentSocket.off('vote-ended', handleVoteEnded);
      currentSocket.off('force-kick', handleForceKick);
      currentSocket.off('user:kicked', handleUserKicked);
      currentSocket.off('room:participants:update', handleParticipantsUpdate);
      currentSocket.off('room:currently:update', handleCurrentlyUpdate);
      currentSocket.off('pm:receive', handlePmReceive);
      currentSocket.off('dm:receive', handlePmReceive);
      currentSocket.off('pm:sent', handlePmSent);
      currentSocket.off('dm:sent', handlePmSent);
      currentSocket.off('pm:error', handlePmError);
      currentSocket.off('dm:error', handlePmError);
      currentSocket.off('server:restarting', handleServerRestarting);
      currentSocket.off('user:blocked', handleUserBlocked);
      currentSocket.off('user:unblocked', handleUserUnblocked);
    };
  }, [currentUsername, currentUserId, socket, router, currentActiveRoomId]);

  // Reset roomInitialized when roomId changes (navigating to a different room/PM)
  useEffect(() => {
    roomInitialized.current = false;
  }, [roomId]);

  useEffect(() => {
    if (!socket || !isConnected || !currentUsername || !currentUserId) {
      return;
    }

    if (roomInitialized.current) {
      return;
    }

    const existingRoom = openRooms.find(r => r.roomId === roomId);
    if (!existingRoom) {
      roomInitialized.current = true;
      devLog(`📩 [ChatRoom] Opening new tab for: ${roomId} (${roomName})`);
      openRoom(roomId, roomName);
    } else if (activeRoomId !== roomId) {
      roomInitialized.current = true;
      setActiveRoomById(roomId);
    }
  }, [roomId, roomName, socket, isConnected, currentUsername, currentUserId, openRooms.length, activeRoomId, openRoom, setActiveRoomById]);

  useEffect(() => {
    const backAction = () => {
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  // Heartbeat to keep socket connection alive
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    // Check global registry to prevent duplicate heartbeat listeners
    if (heartbeatListenersSocketId === socket.id) {
      devLog('⏭️ Heartbeat listeners already registered for this socket, skipping');
      return;
    }
    
    // Clear existing pong listeners before adding new one
    socket.off('pong');
    
    let lastPongTime = Date.now();
    let missedPongs = 0;
    const HEARTBEAT_INTERVAL = 25000;
    const MAX_MISSED_PONGS = 2;
    
    const pongHandler = () => {
      lastPongTime = Date.now();
      missedPongs = 0;
      devLog('💓 Heartbeat pong received');
    };
    
    socket.on('pong', pongHandler);
    heartbeatListenersSocketId = socket.id;
    devLog(`✅ Heartbeat listener registered for socket: ${socket.id}`);
    
    const heartbeatInterval = setInterval(() => {
      if (!socket?.connected) {
        devLog('💔 Heartbeat: Socket disconnected, attempting reconnect...');
        socket?.connect();
        return;
      }
      
      const timeSinceLastPong = Date.now() - lastPongTime;
      if (timeSinceLastPong > HEARTBEAT_INTERVAL * 1.5 && lastPongTime > 0) {
        missedPongs++;
        devLog(`💔 Heartbeat: Missed pong #${missedPongs} (${Math.round(timeSinceLastPong / 1000)}s)`);
        
        if (missedPongs >= MAX_MISSED_PONGS) {
          devLog('💔 Heartbeat: Too many missed pongs, forcing reconnect...');
          missedPongs = 0;
          socket.disconnect();
          setTimeout(() => {
            socket.connect();
          }, 1000);
          return;
        }
      }
      
      socket.emit('ping');
    }, HEARTBEAT_INTERVAL);
    
    socket.emit('ping');
    
    return () => {
      clearInterval(heartbeatInterval);
      socket.off('pong', pongHandler);
      heartbeatListenersSocketId = null;
    };
  }, [socket, isConnected]);

  // Track app state for background handling
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number>(0);
  const reconnectingRef = useRef(false); // Prevent duplicate reconnect attempts
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectHandlerRef = useRef<(() => void) | null>(null);
  
  // Use refs for socket and user data to avoid re-creating the AppState listener
  const socketRef = useRef(socket);
  const currentUserIdRef = useRef(currentUserId);
  const currentUsernameRef = useRef(currentUsername);
  
  // Keep refs updated
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);
  
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
    currentUsernameRef.current = currentUsername;
  }, [currentUserId, currentUsername]);
  
  // Single AppState listener - no dependencies to prevent duplicate listeners
  useEffect(() => {
    const cleanupReconnect = () => {
      // Clear any pending timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // Remove any pending connect handler
      if (reconnectHandlerRef.current && socketRef.current) {
        socketRef.current.off('connect', reconnectHandlerRef.current);
        reconnectHandlerRef.current = null;
      }
    };
    
    const rejoinOpenRooms = () => {
      const currentSocket = socketRef.current;
      const userId = currentUserIdRef.current;
      const username = currentUsernameRef.current;
      
      if (!currentSocket || !userId || !username) return;
      
      const openRoomIds = useRoomTabsStore.getState().openRoomIds;
      devLog('🔄 Rejoining', openRoomIds.length, 'rooms after foreground');
      
      openRoomIds.forEach((rid) => {
        if (rid.startsWith('private:') || rid.startsWith('dm_')) {
          return;
        }
        currentSocket.emit('room:silent_rejoin', {
          roomId: rid,
          userId: userId,
          username: username,
          silent: true
        });
      });
      
      // Reset reconnect lock after a short delay
      setTimeout(() => {
        reconnectingRef.current = false;
      }, 2000);
    };
    
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      // Global deduplication: skip if another handler processed this state change within 100ms
      const now = Date.now();
      if (now - lastAppStateChangeTime < 100) {
        return;
      }
      lastAppStateChangeTime = now;
      
      devLog(`📱 AppState: ${prevState} → ${nextAppState}`);
      
      // Track when app goes to background
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimeRef.current = Date.now();
        reconnectingRef.current = false; // Reset reconnect lock when going to background
        cleanupReconnect(); // Cleanup any pending reconnect
        devLog('📱 App going to background at:', new Date().toISOString());
      }
      
      // App coming back to foreground
      if (nextAppState === 'active' && (prevState === 'background' || prevState === 'inactive')) {
        // Prevent duplicate reconnect attempts
        if (reconnectingRef.current) {
          devLog('📱 Reconnect already in progress, skipping...');
          return;
        }
        reconnectingRef.current = true;
        
        const timeInBackground = Date.now() - backgroundTimeRef.current;
        const minutesInBackground = Math.round(timeInBackground / 60000);
        devLog(`📱 App returned to foreground after ${minutesInBackground} minutes`);
        
        // Force full reconnect if was in background for more than 2 minutes
        const needsForceReconnect = timeInBackground > 120000; // 2 minutes
        
        const currentSocket = socketRef.current;
        if (currentSocket) {
          if (needsForceReconnect || !currentSocket.connected) {
            devLog('🔌 Force reconnecting socket (was disconnected or long background)...');
            
            // Cleanup any previous pending reconnect
            cleanupReconnect();
            
            // Force disconnect first to clear any stale state
            currentSocket.disconnect();
            
            // Reconnect after brief delay
            reconnectTimeoutRef.current = setTimeout(() => {
              devLog('🔌 Initiating fresh socket connection...');
              currentSocket.connect();
              
              // Create reconnect handler
              reconnectHandlerRef.current = () => {
                devLog('✅ Socket reconnected, rejoining rooms...');
                rejoinOpenRooms();
                // Clean up handler
                if (reconnectHandlerRef.current) {
                  currentSocket.off('connect', reconnectHandlerRef.current);
                  reconnectHandlerRef.current = null;
                }
              };
              
              if (currentSocket.connected) {
                reconnectHandlerRef.current();
              } else {
                currentSocket.once('connect', reconnectHandlerRef.current);
              }
            }, 500);
          } else {
            // Socket still connected - only rejoin active room (lighter operation)
            devLog('🔌 Socket still connected, quick refresh...');
            
            // Only rejoin current active room (not all rooms - too heavy)
            const activeRoomId = useRoomTabsStore.getState().activeRoomId;
            const userId = currentUserIdRef.current;
            const username = currentUsernameRef.current;
            
            if (activeRoomId && userId && username && 
                !activeRoomId.startsWith('private:') && !activeRoomId.startsWith('dm_')) {
              currentSocket.emit('room:silent_rejoin', {
                roomId: activeRoomId,
                userId: userId,
                username: username,
                silent: true
              });
            }
            
            // Reset lock quickly
            reconnectingRef.current = false;
          }
        } else {
          // No socket, reset lock
          reconnectingRef.current = false;
        }
      }
    });

    return () => {
      subscription.remove();
      cleanupReconnect();
    };
  }, []); // Empty dependency array - listener is stable, uses refs for current values

  const handleSendMessage = useCallback((message: string) => {
    if (!socket || !message.trim() || !currentUserId) return;
    
    const msgTrimmed = message.trim();
    devLog("MESSAGE SEND", currentActiveRoomId, msgTrimmed);
    
    // Check if this is a PM conversation (starts with "private:")
    if (currentActiveRoomId.startsWith('private:')) {
      // Extract the other user's ID from the conversation ID (private:minId:maxId)
      const parts = currentActiveRoomId.split(':');
      if (parts.length === 3) {
        const id1 = parseInt(parts[1], 10);
        const id2 = parseInt(parts[2], 10);
        const myId = parseInt(currentUserId, 10);
        const toUserId = (myId === id1) ? id2 : id1;
        
        // Get the other user's username from the room name
        const roomData = useRoomTabsStore.getState().openRoomsById[currentActiveRoomId];
        const toUsername = roomData?.name || `User ${toUserId}`;
        
        const pmData = {
          fromUserId: currentUserId,
          fromUsername: currentUsername,
          toUserId: toUserId.toString(),
          toUsername: toUsername,
          message: msgTrimmed,
        };
        
        // If socket not ready, queue the message and try to reconnect
        if (!isSocketReady()) {
          devLog("⚠️ Socket offline, queuing PM...");
          queueMessage('pm:send', pmData);
          socket.connect();
        } else {
          devLog("📩 PM SEND to:", toUsername, "userId:", toUserId);
          socket.emit('pm:send', pmData);
        }
        
        // Add message to local store immediately for instant display
        const { addPrivateMessage } = useRoomTabsStore.getState();
        const localMessage = {
          id: `local_${Date.now()}`,
          username: currentUsername,
          message: msgTrimmed,
          isOwnMessage: true,
          timestamp: new Date().toISOString(),
        };
        addPrivateMessage(toUserId.toString(), localMessage);
      }
      return;
    }
    
    // Regular room message
    const chatData = {
      roomId: currentActiveRoomId,
      userId: currentUserId,
      username: currentUsername,
      message: msgTrimmed,
    };
    
    // Check if message is a command (starts with ! or /)
    const isCommand = msgTrimmed.startsWith('!') || msgTrimmed.startsWith('/');
    
    // Only add optimistic update for regular messages, not commands
    // Commands should not appear as text - only server response should show
    if (!isCommand) {
      // Generate optimistic message ID
      const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Optimistic update - add message to UI immediately (don't wait for server echo)
      const { addMessage } = useRoomTabsStore.getState();
      const optimisticMessage = {
        id: optimisticId,
        username: currentUsername,
        message: msgTrimmed,
        isOwnMessage: true,
        timestamp: new Date().toISOString(),
      };
      addMessage(currentActiveRoomId, optimisticMessage);
      devLog("✅ Optimistic message added:", optimisticId);
    } else {
      devLog("📝 Command detected, skipping optimistic update:", msgTrimmed);
    }
    
    // If socket not ready, queue the message and try to reconnect
    if (!isSocketReady()) {
      devLog("⚠️ Socket offline, queuing message...");
      queueMessage('chat:message', chatData);
      socket.connect();
    } else {
      socket.emit('chat:message', chatData);
    }
  }, [socket, currentUserId, currentUsername, currentActiveRoomId]);

  const handleSelectUserToKick = (target: string) => {
    Alert.alert('Start Vote Kick', `Kick ${target} for 500 COINS?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Vote', onPress: () => handleStartKick(target) },
    ]);
  };

  const handleStartKick = (target: string) => {
    if (!socket) return;
    socket.emit('kick-start', { roomId: currentActiveRoomId, startedBy: currentUsername, target });
  };

  const handleVoteKick = () => {
    if (!socket || !activeVote || hasVoted) return;
    socket.emit('kick-vote', { roomId: currentActiveRoomId, username: currentUsername, target: activeVote.target });
    setHasVoted(true);
  };

  useEffect(() => {
    if (!currentActiveRoomId || currentActiveRoomId.startsWith('private:') || currentActiveRoomId.startsWith('dm_')) {
      return;
    }
    
    fetch(`${API_BASE_URL}/api/rooms/${currentActiveRoomId}/info`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.roomInfo) {
          setRoomOwnerId(data.roomInfo.owner_id?.toString() || null);
          if (data.roomInfo.background_image) {
            setCurrentRoomBackground(data.roomInfo.background_image);
            updateRoomBackground(currentActiveRoomId, data.roomInfo.background_image);
          }
        }
      })
      .catch(() => {});
  }, [currentActiveRoomId, updateRoomBackground]);

  const handleOpenRoomInfo = useCallback(() => {
    setRoomInfoModalVisible(true);
    
    fetch(`${API_BASE_URL}/api/rooms/${currentActiveRoomId}/info`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setRoomInfoData(data.roomInfo);
        }
      })
      .catch(() => {});
  }, [currentActiveRoomId]);

  const handleCloseRoomInfo = useCallback(() => {
    setRoomInfoModalVisible(false);
    setRoomInfoData(null);
  }, []);

  const handleLeaveRoom = useCallback(async () => {
    setMenuVisible(false);
    
    const roomToLeave = currentActiveRoomId;
    if (!roomToLeave) return;
    
    const currentOpenRoomIds = useRoomTabsStore.getState().openRoomIds;
    const remainingCount = currentOpenRoomIds.length - 1;
    
    // Check if this is a PM tab (no socket leave needed for PMs)
    const isPmTab = roomToLeave.startsWith('private:') || roomToLeave.startsWith('dm_');
    
    devLog('🚪 [Leave Room] Starting leave process for:', roomToLeave, isPmTab ? '(PM)' : '(Room)');
    devLog('🚪 [Leave Room] Current tabs:', currentOpenRoomIds.length, 'Remaining after leave:', remainingCount);
    
    // Only emit leave_room for actual rooms, not PMs
    if (socket && !isPmTab) {
      devLog('🚪 [Leave Room] Emitting leave_room socket event');
      socket.emit('leave_room', { 
        roomId: roomToLeave, 
        username: currentUsername, 
        userId: currentUserId 
      });
    }
    
    markRoomLeft(roomToLeave);
    closeRoom(roomToLeave);
    
    devLog('🚪 [Leave Room] Tab closed, remaining tabs:', remainingCount);
    
    if (remainingCount === 0) {
      devLog('🚪 [Leave Room] Last tab closed - navigating to room menu');
      // Clear saved active chatroom when all rooms are closed
      try {
        await AsyncStorage.removeItem('last_active_chatroom');
        devLog('🗑️ Cleared saved active chatroom');
      } catch (error) {
        console.error('Error clearing active chatroom:', error);
      }
      clearAllRooms();
      router.replace('/(tabs)/room');
    }
  }, [socket, currentActiveRoomId, currentUsername, currentUserId, closeRoom, clearAllRooms, markRoomLeft, router]);

  const handleMenuAction = useCallback((action: string) => {
    const trimmedAction = action?.trim?.() || action;
    
    if (trimmedAction === 'room-info') {
      handleOpenRoomInfo();
      return;
    }
    
    if (trimmedAction === 'add-favorite') {
      fetch(`${API_BASE_URL}/api/rooms/favorites/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUsername, roomId: currentActiveRoomId }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            Alert.alert('Success', 'Room added to favorites!');
          } else {
            Alert.alert('Error', data.message || 'Failed to add favorite');
          }
        })
        .catch(() => Alert.alert('Error', 'Failed to add room to favorites'));
      return;
    }
    
    if (trimmedAction === 'kick') {
      // Request fresh participants from socket
      if (socket) {
        socket.emit('room:get-participants', { roomId: currentActiveRoomId });
      }
      setKickModalVisible(true);
      return;
    }
    
    if (trimmedAction === 'participants') {
      setParticipantsModalVisible(true);
      return;
    }
    
    if (trimmedAction === 'leave-room') {
      Alert.alert('Leave Room', 'Are you sure you want to leave this room?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: handleLeaveRoom },
      ]);
      return;
    }

    if (trimmedAction === 'report-abuse') {
      setReportAbuseModalVisible(true);
      return;
    }

    if (trimmedAction === 'cmd') {
      setCmdListVisible(true);
      return;
    }

    if (trimmedAction === 'send-gift') {
      setRoomGiftModalVisible(true);
      return;
    }
  }, [handleOpenRoomInfo, currentUsername, currentActiveRoomId, handleLeaveRoom]);

  const handleOpenParticipants = () => setParticipantsModalVisible(!participantsModalVisible);

  const handleUserMenuPress = (username: string, action: string) => {
    devLog('User menu pressed:', username, 'action:', action);
    
    if (action === 'kick' && socket && currentActiveRoomId) {
      // Send kick command via socket
      socket.emit('chat:message', {
        roomId: currentActiveRoomId,
        userId: userInfo?.id,
        username: currentUsername,
        message: `/kick ${username}`,
        timestamp: new Date().toISOString()
      });
      
      // Close modals
      setParticipantsModalVisible(false);
    }
  };

  const handleMenuItemPress = (action: string) => {
    if (action === 'kick') setKickModalVisible(true);
  };

  const handleHeaderBack = useCallback(() => {
    router.back();
  }, [router]);

  // Helper to extract other user ID from PM room ID
  const getOtherUserIdFromPM = useCallback(() => {
    if (!activeRoomId) return '';
    if (activeRoomId.startsWith('dm_')) {
      return activeRoomId.replace('dm_', '');
    }
    if (activeRoomId.startsWith('private:')) {
      const parts = activeRoomId.split(':');
      if (parts.length === 3) {
        const id1 = parts[1];
        const id2 = parts[2];
        return (currentUserId === id1) ? id2 : id1;
      }
    }
    return '';
  }, [activeRoomId, currentUserId]);

  const handlePrivateChatViewProfile = useCallback(() => {
    const userId = getOtherUserIdFromPM();
    if (!userId) return;
    router.push(`/view-profile?userId=${userId}`);
  }, [getOtherUserIdFromPM, router]);

  const handlePrivateChatBlockUser = useCallback(() => {
    if (!activeRoomId || !socket) return;
    const userId = getOtherUserIdFromPM();
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will not be able to send you messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_BASE_URL}/api/users/block`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ blockedUserId: userId }),
              });
              if (response.ok) {
                Alert.alert('Success', 'User has been blocked');
                closeRoom(activeRoomId);
              } else {
                Alert.alert('Error', 'Failed to block user');
              }
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user');
            }
          },
        },
      ]
    );
  }, [activeRoomId, socket, closeRoom, getOtherUserIdFromPM]);

  const handlePrivateChatClearChat = useCallback(() => {
    if (!activeRoomId) return;
    const userId = getOtherUserIdFromPM();
    if (!userId) return;
    
    const clearPrivateMessages = useRoomTabsStore.getState().clearPrivateMessages;
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearPrivateMessages(userId);
          },
        },
      ]
    );
  }, [activeRoomId, getOtherUserIdFromPM]);

  const handlePrivateChatCloseChat = useCallback(() => {
    if (!activeRoomId) return;
    closeRoom(activeRoomId);
    router.back();
  }, [activeRoomId, closeRoom, router]);

  const handlePrivateChatSendGift = useCallback(() => {
    setPmGiftModalVisible(true);
  }, []);

  const handlePmGiftSend = useCallback(async (gift: { name: string; price: number; image: any }) => {
    const userId = getOtherUserIdFromPM();
    if (!userId || !socket) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/profile/gift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toUserId: userId,
          giftId: gift.name,
          amount: gift.price,
        }),
      });
      
      if (response.ok) {
        Alert.alert('Success', `Gift "${gift.name}" sent successfully!`);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to send gift');
      }
    } catch (error) {
      console.error('Error sending gift:', error);
      Alert.alert('Error', 'Failed to send gift');
    }
  }, [getOtherUserIdFromPM, socket]);

  const renderVoteButton = useCallback(() => {
    if (!activeVote) return null;
    return (
      <VoteKickButton
        target={activeVote.target}
        remainingVotes={activeVote.remainingVotes}
        remainingSeconds={activeVote.remainingSeconds}
        hasVoted={hasVoted}
        onVote={handleVoteKick}
      />
    );
  }, [activeVote, hasVoted, handleVoteKick]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={HEADER_COLOR} barStyle="light-content" />
      
      {/* Header - Untuk semua tabs termasuk private chat */}
      <ChatRoomHeader
        onBack={handleHeaderBack}
        onMenuPress={() => setHeaderOptionsVisible(true)}
        onPrivateChatMenuPress={() => setPrivateChatMenuVisible(true)}
      />

      <ChatRoomTabs
        bottomPadding={isPrivateChat ? 0 : (70 + insets.bottom)}
        renderVoteButton={renderVoteButton}
      />

      {/* Emoji Picker - Hanya untuk regular rooms */}
      {!isPrivateChat && (
        <EmojiPicker
          visible={emojiVisible}
          onClose={() => setEmojiVisible(false)}
          onEmojiSelect={(code) => {
            if (inputRef.current?.insertEmoji) {
              inputRef.current.insertEmoji(code);
            }
          }}
          bottomOffset={0}
        />
      )}

      {/* Input - Hanya untuk regular rooms */}
      {!isPrivateChat && (
        <ChatRoomInput 
          ref={inputRef}
          onSend={handleSendMessage} 
          onMenuItemPress={handleMenuAction}
          onMenuPress={() => setMenuVisible(true)}
          onOpenParticipants={handleOpenParticipants}
          onEmojiPress={() => setEmojiVisible(!emojiVisible)}
          emojiPickerVisible={emojiVisible}
          emojiPickerHeight={EMOJI_PICKER_HEIGHT}
          userRole={userRole}
        />
      )}

      <MenuKickModal
        visible={kickModalVisible}
        onClose={() => setKickModalVisible(false)}
        users={roomUsers}
        currentUsername={currentUsername}
        onSelectUser={handleSelectUserToKick}
      />

      <MenuParticipantsModal
        visible={participantsModalVisible}
        onClose={() => setParticipantsModalVisible(false)}
        roomId={currentActiveRoomId}
        onUserMenuPress={handleUserMenuPress}
      />

      <RoomInfoModal
        visible={roomInfoModalVisible}
        onClose={handleCloseRoomInfo}
        info={roomInfoData}
        roomId={currentActiveRoomId}
      />

      <ChatRoomMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMenuItemPress={handleMenuAction}
        onOpenParticipants={handleOpenParticipants}
      />

      <ReportAbuseModal
        visible={reportAbuseModalVisible}
        onClose={() => setReportAbuseModalVisible(false)}
        roomId={currentActiveRoomId}
        roomName={roomName}
      />

      <PrivateChatMenuModal
        visible={privateChatMenuVisible}
        onClose={() => setPrivateChatMenuVisible(false)}
        onViewProfile={handlePrivateChatViewProfile}
        onBlockUser={handlePrivateChatBlockUser}
        onSendGift={handlePrivateChatSendGift}
        onClearChat={handlePrivateChatClearChat}
        onCloseChat={handlePrivateChatCloseChat}
        username={activeRoom?.name}
      />

      <GiftModal
        visible={pmGiftModalVisible}
        onClose={() => setPmGiftModalVisible(false)}
        onSendGift={handlePmGiftSend}
      />

      <GiftModal
        visible={roomGiftModalVisible}
        onClose={() => setRoomGiftModalVisible(false)}
        onSendGift={(gift) => {
          setRoomGiftModalVisible(false);
          setParticipantsModalVisible(true);
        }}
      />

      <HeaderOptionsMenu
        visible={headerOptionsVisible}
        onClose={() => setHeaderOptionsVisible(false)}
        onStore={() => {
          router.push('/store');
        }}
        onChangeBackground={() => {
          setBackgroundModalVisible(true);
        }}
      />

      <BackgroundChangeModal
        visible={backgroundModalVisible}
        onClose={() => setBackgroundModalVisible(false)}
        roomId={currentActiveRoomId}
        currentBackground={activeRoom?.backgroundImage || null}
        onBackgroundChanged={(newUrl) => {
          updateRoomBackground(currentActiveRoomId, newUrl || null);
          setCurrentRoomBackground(newUrl || null);
        }}
        canChangeBackground={
          ['admin', 'super_admin'].includes(userRole) || 
          (roomOwnerId !== null && currentUserId === roomOwnerId)
        }
      />

      <CmdList
        visible={cmdListVisible}
        onClose={() => setCmdListVisible(false)}
        onSelectCmd={(cmdKey, requiresTarget) => {
          setCmdListVisible(false);
          if (inputRef.current) {
            inputRef.current.insertText(`/${cmdKey} `);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
