import { devLog } from '@/utils/devLog';
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useRoomTabsStore, Message } from '@/stores/useRoomTabsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showNewMessageNotification, setCurrentRoomName } from '@/utils/foregroundService';
import { registerSocketDisconnectCallback, unregisterSocketDisconnectCallback } from '@/hooks/useSocketInit';

// Global registry to track which socket+room combos have listeners registered
// This prevents duplicate listeners when multiple ChatRoomInstance components are mounted
const roomSocketListenersRegistry = new Map<string, boolean>();
let lastKnownSocketId: string | null = null;

// Reset the registry when socket disconnects or socket.id changes
const resetRoomSocketListeners = () => {
  roomSocketListenersRegistry.clear();
  devLog('🔌 Room socket listeners registry cleared');
};

// Clear entries for old socket.id when socket.id changes (for reconnect scenarios)
const handleSocketIdChange = (newSocketId: string | undefined) => {
  if (!newSocketId) return;
  if (lastKnownSocketId && lastKnownSocketId !== newSocketId) {
    // Socket reconnected with new ID - clear old entries
    const oldEntries = Array.from(roomSocketListenersRegistry.keys()).filter(
      key => key.startsWith(`${lastKnownSocketId}:`)
    );
    oldEntries.forEach(key => roomSocketListenersRegistry.delete(key));
    devLog(`🔄 Cleared ${oldEntries.length} old listener entries for socket ${lastKnownSocketId}`);
  }
  lastKnownSocketId = newSocketId;
};

interface UseRoomSocketOptions {
  roomId: string;
  onRoomJoined?: (data: any) => void;
  onUsersUpdated?: (users: string[]) => void;
}

export function useRoomSocket({ roomId, onRoomJoined, onUsersUpdated }: UseRoomSocketOptions) {
  const socket = useRoomTabsStore(state => state.socket);
  const currentUsername = useRoomTabsStore(state => state.currentUsername);
  const currentUserId = useRoomTabsStore(state => state.currentUserId);
  const addMessage = useRoomTabsStore(state => state.addMessage);
  const updateRoomName = useRoomTabsStore(state => state.updateRoomName);
  const updateRoomBackground = useRoomTabsStore(state => state.updateRoomBackground);
  const markRoomJoined = useRoomTabsStore(state => state.markRoomJoined);
  const markRoomLeft = useRoomTabsStore(state => state.markRoomLeft);
  const isRoomJoined = useRoomTabsStore(state => state.isRoomJoined);
  
  // Track socket.id to force re-register listeners on reconnect
  const socketIdRef = useRef<string | undefined>(socket?.id);
  const [socketId, setSocketId] = useState<string | undefined>(socket?.id);
  const prependHistoryMessages = useRoomTabsStore(state => state.prependHistoryMessages);
  
  // Use refs to store latest values without causing useEffect re-runs
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  
  const currentUsernameRef = useRef(currentUsername);
  currentUsernameRef.current = currentUsername;
  
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;
  
  const addMessageRef = useRef(addMessage);
  addMessageRef.current = addMessage;
  
  const updateRoomNameRef = useRef(updateRoomName);
  updateRoomNameRef.current = updateRoomName;
  
  const updateRoomBackgroundRef = useRef(updateRoomBackground);
  updateRoomBackgroundRef.current = updateRoomBackground;
  
  const markRoomLeftRef = useRef(markRoomLeft);
  markRoomLeftRef.current = markRoomLeft;
  
  const onRoomJoinedRef = useRef(onRoomJoined);
  onRoomJoinedRef.current = onRoomJoined;
  
  const onUsersUpdatedRef = useRef(onUsersUpdated);
  onUsersUpdatedRef.current = onUsersUpdated;
  
  const prependHistoryMessagesRef = useRef(prependHistoryMessages);
  prependHistoryMessagesRef.current = prependHistoryMessages;
  
  // Track recent bot messages for deduplication at socket level
  const recentBotMessagesRef = useRef<Map<string, number>>(new Map());

  // Register disconnect callback on mount (only once per hook instance)
  const disconnectCallbackRegistered = useRef(false);
  useEffect(() => {
    if (!disconnectCallbackRegistered.current) {
      registerSocketDisconnectCallback(resetRoomSocketListeners);
      disconnectCallbackRegistered.current = true;
    }
    return () => {
      // Don't unregister on unmount - let it stay until socket disconnects
    };
  }, []);

  // Track socket.id changes to trigger listener re-registration on reconnect
  useEffect(() => {
    if (!socket) return;
    
    const handleConnect = () => {
      if (socket.id && socket.id !== socketIdRef.current) {
        devLog(`🔄 [useRoomSocket] Socket reconnected with new ID: ${socket.id}`);
        // Clear old listener entries before updating state
        handleSocketIdChange(socket.id);
        socketIdRef.current = socket.id;
        setSocketId(socket.id);

        // Re-join room on connect to ensure we're in the room and get backlog
        if (roomIdRef.current && !roomIdRef.current.startsWith('private:') && !roomIdRef.current.startsWith('pm_')) {
          devLog(`📤 [Room ${roomIdRef.current}] Re-joining on connect`);
          socket.emit('join_room', {
            roomId: roomIdRef.current,
            userId: currentUserIdRef.current,
            username: currentUsernameRef.current,
            silent: true
          });
        }
      }
    };
    
    // Check immediately in case socket is already connected
    if (socket.connected && socket.id && socket.id !== socketIdRef.current) {
      handleSocketIdChange(socket.id);
      socketIdRef.current = socket.id;
      setSocketId(socket.id);
    }
    
    socket.on('connect', handleConnect);
    
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket]);

  // Handle AppState changes - force listener re-registration on app resume (Android 14-15 fix)
  useEffect(() => {
    if (!socket || !roomId) return;
    
    let lastBackgroundTime = 0;
    
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        const backgroundDuration = Date.now() - lastBackgroundTime;
        
        // Only force re-register if app was in background for 5+ seconds (Android aggressive disconnect)
        if (backgroundDuration > 5000 && socket.connected && socket.id) {
          devLog(`📱 [Room ${roomId}] App resumed after ${Math.round(backgroundDuration / 1000)}s, forcing listener check`);
          
          const listenerKey = `${socket.id}:${roomId}`;
          
          // If listener already registered, force a re-check by clearing and re-triggering
          if (!roomSocketListenersRegistry.has(listenerKey)) {
            devLog(`📱 [Room ${roomId}] Listener not registered, triggering re-registration`);
            // Trigger re-registration by updating socketId state
            setSocketId(prev => prev === socket.id ? `${socket.id}_resume` : socket.id);
            // Immediately reset to correct value to re-trigger effect
            setTimeout(() => setSocketId(socket.id), 50);
          }
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastBackgroundTime = Date.now();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket || !currentUsername || !currentUserId || !roomId) {
      return;
    }

    // Only proceed if socket is connected with valid id
    if (!socket.connected || !socket.id) {
      devLog(`🔌 [Room ${roomId}] Socket not connected yet, waiting...`);
      return;
    }

    // Skip room socket logic for PM tabs - they don't need room:join
    const isPmTab = roomId.startsWith('private:') || roomId.startsWith('pm_');
    if (isPmTab) {
      devLog(`📩 [PM ${roomId}] Skipping room socket setup for PM tab`);
      return;
    }

    // Create unique key for this socket+room combo
    const listenerKey = `${socket.id}:${roomId}`;
    
    // Always register listeners fresh - remove old ones first and add new ones
    // This ensures listeners work correctly after reconnect/resume
    const alreadyRegistered = roomSocketListenersRegistry.has(listenerKey);
    if (alreadyRegistered) {
      devLog(`🔄 [Room ${roomId}] Re-registering listeners (key: ${listenerKey})`);
    } else {
      devLog(`🔌 [Room ${roomId}] Registering socket listeners (key: ${listenerKey})`);
    }
    
    // Mark this combo as registered in global registry
    roomSocketListenersRegistry.set(listenerKey, true);
    

    // Define handlers inside useEffect using refs for latest values
    const handleSystemMessage = (data: { roomId: string; message: string; type: string }) => {
      if (data.roomId !== roomIdRef.current) return;
      
      devLog("MESSAGE RECEIVE", data.roomId, data.message);
      
      const isError = data.type === 'warning' || data.type === 'error';
      
      const newMessage: Message = {
        id: `sys-${Date.now()}-${Math.random()}`,
        username: isError ? 'ERROR' : 'System',
        message: data.message,
        isSystem: true,
      };
      addMessageRef.current(data.roomId, newMessage);
    };

    const handleChatMessage = (data: any) => {
      const targetRoomId = data.roomId || roomIdRef.current;
      if (targetRoomId !== roomIdRef.current) return;
      
      devLog("MESSAGE RECEIVE RAW", data);
      
      // Message deduplication at socket level (before logging) - for bots and system messages
      const isBotMessage = data.botType || data.username === 'FlagBot' || data.username === 'DiceBot' || data.username === 'LowCardBot';
      const isSystemMessage = data.type === 'system' || data.messageType === 'system' || data.messageType === 'presence' || data.type === 'presence';
      const isWelcomeMessage = data.message?.includes('Welcome to') || data.message?.includes('Currently users in the room') || data.message?.includes('has entered');
      
      if ((isBotMessage || isSystemMessage || isWelcomeMessage) && data.message) {
        const dedupeKey = `${data.username || 'System'}:${data.message}`;
        const lastSeen = recentBotMessagesRef.current.get(dedupeKey);
        const now = Date.now();
        
        if (lastSeen && (now - lastSeen) < 3000) {
          return;
        }
        
        recentBotMessagesRef.current.set(dedupeKey, now);
        
        // Cleanup old entries (keep map from growing too large)
        if (recentBotMessagesRef.current.size > 100) {
          const entries = Array.from(recentBotMessagesRef.current.entries());
          for (const [key, time] of entries) {
            if (now - time > 5000) {
              recentBotMessagesRef.current.delete(key);
            }
          }
        }
      }
      
      // Check if it's our own message by checking both username AND userId if available
      const isOwnMessage = data.username === currentUsernameRef.current || 
                         (data.userId && data.userId === currentUserIdRef.current);
      
      devLog("MESSAGE RECEIVE", targetRoomId, data.message, "own:", isOwnMessage);
      
      const appState = AppState.currentState;
      if (appState !== 'active' && !isOwnMessage) {
        showNewMessageNotification();
      }
      
      const cmdTypes = ['cmd', 'cmdMe', 'cmdRoll', 'cmdGift', 'cmdShower', 'cmdGoal', 'cmdGo'];
      const isCommandMessage = cmdTypes.includes(data.messageType) || cmdTypes.includes(data.type);
      const isPresenceMessage = data.messageType === 'presence' || data.type === 'presence';
      
      const newMessage: Message = {
        id: data.id || `msg-${Date.now()}-${Math.random()}`,
        username: data.username,
        usernameColor: data.usernameColor,
        messageColor: data.messageColor,
        message: data.message,
        isOwnMessage: isOwnMessage,
        isSystem: (data.isSystem || data.messageType === 'system' || data.type === 'system') && !isPresenceMessage,
        isNotice: data.messageType === 'notice',
        isCmd: isCommandMessage,
        isPresence: isPresenceMessage,
        timestamp: data.timestamp,
        messageType: data.messageType || data.type,
        type: data.type,
        botType: data.botType,
        hasTopMerchantBadge: data.hasTopMerchantBadge,
        isTop1User: data.isTop1User,
        hasTopLikeReward: data.hasTopLikeReward,
        topLikeRewardExpiry: data.topLikeRewardExpiry,
        userType: data.userType || (data.isModerator ? 'moderator' : (data.isCreator ? 'creator' : 'normal')),
        bigEmoji: data.bigEmoji,
        hasFlags: data.hasFlags,
      };
      
      addMessageRef.current(targetRoomId, newMessage);
    };

    const handleRoomJoined = (data: any) => {
      const joinedRoomId = data.roomId || roomIdRef.current;
      if (joinedRoomId !== roomIdRef.current) return;
      
      const roomName = data.room?.name || 'Chat Room';
      
      setCurrentRoomName(roomName);
      
      if (data.room?.name) {
        updateRoomNameRef.current(joinedRoomId, data.room.name);
      }
      
      if (data.room?.background_image) {
        updateRoomBackgroundRef.current(joinedRoomId, data.room.background_image);
      }
      
      const usernames = data.users 
        ? data.users.map((u: any) => u.username || u)
        : data.currentUsers || [];
      
      if (onRoomJoinedRef.current) {
        onRoomJoinedRef.current(data);
      }
      
      if (onUsersUpdatedRef.current) {
        onUsersUpdatedRef.current(usernames);
      }
    };

    const handleRoomUsers = (data: { roomId: string; users: any[]; count: number }) => {
      if (data.roomId !== roomIdRef.current) return;
      
      const usernames = data.users.map((u: any) => u.username || u);
      if (onUsersUpdatedRef.current) {
        onUsersUpdatedRef.current(usernames);
      }
    };

    const handleUserJoined = (data: { roomId: string; user: any; users: any[] }) => {
      if (data.roomId !== roomIdRef.current) return;
      
      const usernames = data.users.map((u: any) => u.username || u);
      if (onUsersUpdatedRef.current) {
        onUsersUpdatedRef.current(usernames);
      }
    };

    const handleUserLeft = (data: { roomId: string; username: string; users: any[] }) => {
      if (data.roomId !== roomIdRef.current) return;
      
      const usernames = Array.isArray(data.users) 
        ? data.users.map((u: any) => typeof u === 'string' ? u : u.username)
        : [];
      if (onUsersUpdatedRef.current) {
        onUsersUpdatedRef.current(usernames);
      }
    };

    const handleModeratorsUpdate = (data: { roomId: string; moderators: string[] }) => {
      if (data.roomId !== roomIdRef.current) return;
      devLog(`🛡️ [Room ${data.roomId}] Moderators updated:`, data.moderators);
    };

    const handleForceLeave = (data: any) => {
      if (data?.roomId !== roomIdRef.current) return;
      console.error(`❌ Force leave from room: ${data.message}`);
      markRoomLeftRef.current(roomIdRef.current);
    };

    const handleChatBacklog = (data: { roomId: string; messages: any[]; isBacklog: boolean; syncType?: string }) => {
      if (data.roomId !== roomIdRef.current) return;
      
      devLog(`📜 [Room ${data.roomId}] Received ${data.messages.length} backlog messages (${data.syncType || 'sync'})`);
      
      for (const msg of data.messages) {
        const newMessage: Message = {
          id: msg.id || `backlog-${Date.now()}-${Math.random()}`,
          username: msg.username,
          usernameColor: msg.usernameColor,
          messageColor: msg.messageColor,
          message: msg.message,
          isOwnMessage: msg.username === currentUsernameRef.current,
          isSystem: msg.messageType === 'system',
          timestamp: msg.timestamp,
          messageType: msg.messageType,
          userType: msg.userType || 'normal',
        };
        addMessageRef.current(data.roomId, newMessage);
      }
    };

    // Remove existing listeners first to prevent duplicates (belt and suspenders)
    socket.off('system:message', handleSystemMessage);
    socket.off('chat:message', handleChatMessage);
    socket.off('room:joined', handleRoomJoined);
    socket.off('room:users', handleRoomUsers);
    socket.off('room:user:joined', handleUserJoined);
    socket.off('room:user:left', handleUserLeft);
    socket.off('room:force-leave', handleForceLeave);
    socket.off('room:moderators:update', handleModeratorsUpdate);

    // Register listeners
    socket.on('system:message', handleSystemMessage);
    socket.on('chat:message', handleChatMessage);
    socket.on('room:joined', handleRoomJoined);
    socket.on('room:users', handleRoomUsers);
    socket.on('room:user:joined', handleUserJoined);
    socket.on('room:user:left', handleUserLeft);
    socket.on('room:force-leave', handleForceLeave);
    socket.on('room:moderators:update', handleModeratorsUpdate);

    if (!isRoomJoined(roomId)) {
      devLog(`📤 [Room ${roomId}] Joining room`);
      
      useRoomTabsStore.setState(state => ({
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: []
        }
      }));

      (async () => {
        try {
          const userData = await AsyncStorage.getItem('user_data');
          const invisibleMode = await AsyncStorage.getItem('invisible_mode');
          const parsedData = userData ? JSON.parse(userData) : {};
          const userRole = parsedData.role || 'user';
          const isInvisible = invisibleMode === 'true' && userRole === 'admin';
          
          socket.emit('join_room', { 
            roomId, 
            userId: currentUserId, 
            username: currentUsername,
            invisible: isInvisible,
            role: userRole
          });
        } catch (err) {
          socket.emit('join_room', { 
            roomId, 
            userId: currentUserId, 
            username: currentUsername
          });
        }
      })();
      markRoomJoined(roomId);
    }

    const heartbeatInterval = setInterval(() => {
      if (socket && roomIdRef.current && currentUserIdRef.current) {
        socket.emit('room:heartbeat', {
          roomId: roomIdRef.current,
          userId: currentUserIdRef.current,
          timestamp: Date.now()
        });
        devLog(`💓 [Room ${roomIdRef.current}] Heartbeat sent`);
      }
    }, 28000);

    // NOTE: AppState listener for silent reconnect is handled globally in chatroom/[id].tsx
    // to prevent duplicate rejoin events when multiple useRoomSocket hooks are active

    return () => {
      devLog(`🔌 [Room ${roomId}] Cleaning up socket listeners`);
      // Remove from global registry
      roomSocketListenersRegistry.delete(listenerKey);
      
      clearInterval(heartbeatInterval);
      socket.off('system:message', handleSystemMessage);
      socket.off('chat:message', handleChatMessage);
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:users', handleRoomUsers);
      socket.off('room:user:joined', handleUserJoined);
      socket.off('room:user:left', handleUserLeft);
      socket.off('room:force-leave', handleForceLeave);
      socket.off('room:moderators:update', handleModeratorsUpdate);
    };
  }, [socket, socketId, currentUsername, currentUserId, roomId, isRoomJoined, markRoomJoined]);

  const sendMessage = useCallback((message: string) => {
    if (!socket || !message.trim() || !currentUserId) return;
    
    const trimmedMessage = message.trim();
    const clientMsgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticMessage: Message = {
      id: clientMsgId,
      username: currentUsername || '',
      message: trimmedMessage,
      isOwnMessage: true,
      timestamp: new Date().toISOString(),
    };
    addMessage(roomId, optimisticMessage);
    
    if (!socket.connected) {
      devLog('⚠️ Socket disconnected, reconnecting and queueing message...');
      socket.connect();
      
      setTimeout(() => {
        if (socket.connected) {
          devLog('✅ Reconnected, sending queued message');
          socket.emit('chat:message', {
            roomId,
            userId: currentUserId,
            username: currentUsername,
            message: trimmedMessage,
            clientMsgId,
          });
        } else {
          console.error('❌ Failed to reconnect socket for message send');
        }
      }, 1500);
      return;
    }
    
    devLog("MESSAGE SEND", roomId, trimmedMessage, "id:", clientMsgId);
    
    socket.emit('chat:message', {
      roomId,
      userId: currentUserId,
      username: currentUsername,
      message: trimmedMessage,
      clientMsgId,
    });
  }, [socket, currentUserId, currentUsername, roomId, addMessage]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    
    devLog(`🚪 [Room ${roomId}] Leaving room`);
    socket.emit('leave_room', { 
      roomId, 
      username: currentUsername, 
      userId: currentUserId 
    });
    markRoomLeft(roomId);
    setCurrentRoomName(null);
  }, [socket, roomId, currentUsername, currentUserId, markRoomLeft]);

  return {
    sendMessage,
    leaveRoom,
    isConnected: socket?.connected || false,
  };
}
