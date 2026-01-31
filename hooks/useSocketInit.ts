import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';
import { devLog } from '@/utils/devLog';
import API_BASE_URL, { getCurrentRoom, getLastMessageId } from '@/utils/api';

let globalSocket: Socket | null = null;
let heartbeatInterval: any = null;
let backgroundReconnectInterval: any = null;
let isAppInBackground = false;
let lastBackgroundTime = 0;

// Message queue for offline state - scoped by userId to prevent cross-user leakage
let pendingMessages: Array<{ event: string; data: any; userId: number }> = [];
let pendingMessagesUserId: number | null = null;
const MAX_PENDING_MESSAGES = 50;

// Add message to queue when disconnected
export const queueMessage = (event: string, data: any) => {
  // Only queue if we have a valid user context
  if (!lastInitUserId) {
    devLog('⚠️ Cannot queue message: no user context');
    return;
  }
  
  // If user changed, clear old messages first
  if (pendingMessagesUserId !== null && pendingMessagesUserId !== lastInitUserId) {
    devLog('🧹 Clearing old user messages before queueing');
    pendingMessages = [];
  }
  
  pendingMessagesUserId = lastInitUserId;
  
  if (pendingMessages.length >= MAX_PENDING_MESSAGES) {
    pendingMessages.shift(); // Remove oldest
  }
  pendingMessages.push({ event, data, userId: lastInitUserId });
  devLog('📤 Message queued (offline):', event);
};

// Flush queued messages when reconnected - only for matching user
const flushPendingMessages = (currentUserId: number) => {
  if (!globalSocket?.connected || pendingMessages.length === 0) return;
  
  // Only flush if user ID matches to prevent cross-user leakage
  if (pendingMessagesUserId !== currentUserId) {
    devLog('⚠️ Clearing queued messages: user mismatch');
    pendingMessages = [];
    pendingMessagesUserId = null;
    return;
  }
  
  devLog(`📤 Flushing ${pendingMessages.length} queued messages...`);
  const messages = [...pendingMessages];
  pendingMessages = [];
  pendingMessagesUserId = null;
  
  messages.forEach(({ event, data }) => {
    globalSocket?.emit(event, data);
  });
};

// Check if socket is ready to send
export const isSocketReady = () => globalSocket?.connected ?? false;

const startHeartbeat = (sock: Socket) => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  // Android 14-15: More frequent heartbeat (8s instead of 15s)
  // When in background, heartbeat keeps the socket alive
  const heartbeatMs = Platform.OS === 'android' ? 8000 : 15000;
  
  heartbeatInterval = setInterval(() => {
    if (sock.connected) {
      // Send ping to keep server connection alive
      sock.emit('ping');
      if (isAppInBackground) {
        devLog('💓 Background Heartbeat: ping sent');
      }
    } else if (isAppInBackground) {
      devLog('🔄 Socket disconnected in background, attempting reconnect...');
      sock.connect();
    }
  }, heartbeatMs);
};

const startBackgroundReconnect = () => {
  if (backgroundReconnectInterval) return;
  
  // Android 14-15: More aggressive background reconnect (10s instead of 30s)
  backgroundReconnectInterval = setInterval(async () => {
    if (!isAppInBackground) return;
    
    if (globalSocket && !globalSocket.connected) {
      devLog('🔄 Background reconnect: chat socket...');
      globalSocket.connect();
    }
  }, 10000);
};

const stopBackgroundReconnect = () => {
  if (backgroundReconnectInterval) {
    clearInterval(backgroundReconnectInterval);
    backgroundReconnectInterval = null;
  }
};

export const getGlobalSocket = () => globalSocket;

// Callback to reset external listener registries (like chatroomListenersSocketId)
let onSocketDisconnectCallbacks: (() => void)[] = [];

export const registerSocketDisconnectCallback = (callback: () => void) => {
  onSocketDisconnectCallbacks.push(callback);
};

export const unregisterSocketDisconnectCallback = (callback: () => void) => {
  onSocketDisconnectCallbacks = onSocketDisconnectCallbacks.filter(cb => cb !== callback);
};

// Clear pending messages (on logout/user switch)
export const clearPendingMessages = () => {
  if (pendingMessages.length > 0) {
    devLog(`🧹 Clearing ${pendingMessages.length} pending messages (user switch/logout)`);
  }
  pendingMessages = [];
  pendingMessagesUserId = null;
};

export const disconnectGlobalSocket = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  stopBackgroundReconnect();
  // Clear pending messages to prevent cross-user leakage
  clearPendingMessages();
  if (globalSocket) {
    globalSocket.removeAllListeners();
    globalSocket.disconnect();
    globalSocket = null;
  }
  // Call all registered disconnect callbacks
  onSocketDisconnectCallbacks.forEach(cb => cb());
  useRoomTabsStore.getState().setSocket(null);
  lastInitUserId = null;
};

// Reset all socket state on logout
export const resetSocketOnLogout = () => {
  clearPendingMessages();
  disconnectGlobalSocket();
};

let lastInitUserId: number | null = null;

export function useSocketInit(userId?: number, username?: string) {
  const appStateSubscription = useRef<any>(null);

  useEffect(() => {
    if (!userId || !username) {
      // User logged out - disconnect socket
      if (lastInitUserId !== null) {
        devLog('🔌 User logged out, disconnecting socket');
        disconnectGlobalSocket();
        lastInitUserId = null;
      }
      return;
    }
    
    // User changed - disconnect old socket
    if (lastInitUserId !== null && lastInitUserId !== userId) {
      devLog('🔌 User changed from', lastInitUserId, 'to', userId, ', disconnecting old socket');
      disconnectGlobalSocket();
    }
    
    if (globalSocket?.connected && lastInitUserId === userId) return;
    
    lastInitUserId = userId;

    const initSocket = async () => {
      if (globalSocket?.connected) {
        devLog('🔌 Socket already connected, reusing');
        useRoomTabsStore.getState().setSocket(globalSocket);
        return;
      }

      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }

      devLog('🔌 Creating new /chat socket for user:', username);
      
      // Android 14-15 optimized: faster reconnection
      const isAndroid = Platform.OS === 'android';
      
      globalSocket = io(`${API_BASE_URL}/chat`, {
        auth: { userId, username },
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: isAndroid ? 1500 : 3000,
        reconnectionDelayMax: isAndroid ? 6000 : 10000,
        timeout: isAndroid ? 15000 : 20000,
        forceNew: false,
        autoConnect: true,
      });

      // Bonus: Ensure websocket only
      globalSocket.io.opts.transports = ['websocket'];
      globalSocket.io.opts.upgrade = false;

      globalSocket.on('connect', () => {
        devLog('✅ Chat socket connected, id:', globalSocket?.id);
        globalSocket?.emit('auth:login', { userId, username });
        
        const currentRoomId = getCurrentRoom();
        if (currentRoomId) {
          globalSocket?.emit('room:silent_rejoin', {
            roomId: currentRoomId,
            userId,
            username,
            lastMessageId: getLastMessageId(),
          });
        }
        
        // Flush any queued messages from offline state (with user validation)
        flushPendingMessages(userId);
        
        startHeartbeat(globalSocket!);
        useRoomTabsStore.getState().setSocket(globalSocket);
      });

      globalSocket.on('disconnect', (reason) => {
        devLog('❌ Chat socket disconnected:', reason);
        if (reason === 'transport close' || reason === 'transport error' || reason === 'ping timeout') {
          // Android 14-15: Immediate reconnect attempt (no delay)
          const reconnectDelay = Platform.OS === 'android' ? 500 : 5000;
          setTimeout(() => {
            if (globalSocket && !globalSocket.connected) {
              devLog('🔄 Attempting auto-reconnect...');
              globalSocket.connect();
            }
          }, reconnectDelay);
        }
      });

      globalSocket.on('connect_error', (error) => {
        devLog('⚠️ Socket connect error:', error.message);
        // Android 14-15: Faster retry on connect error
        const retryDelay = Platform.OS === 'android' ? 1000 : 5000;
        setTimeout(() => {
          if (globalSocket && !globalSocket.connected) {
            globalSocket.connect();
          }
        }, retryDelay);
      });

      useRoomTabsStore.getState().setSocket(globalSocket);
    };

    initSocket();

    const handleAppStateChange = async (state: AppStateStatus) => {
      if (state === 'active') {
        isAppInBackground = false;
        stopBackgroundReconnect();
        
        const backgroundDuration = Date.now() - lastBackgroundTime;
        devLog(`📱 App resumed after ${Math.round(backgroundDuration / 1000)}s`);
        
        // Android 14-15: Immediate reconnect on resume (no waiting)
        if (globalSocket && !globalSocket.connected) {
          devLog('🔄 Reconnecting socket immediately after resume...');
          globalSocket.connect();
        }
        
        // Android: Re-auth after even short background (5s+) due to aggressive disconnects
        const reAuthThreshold = Platform.OS === 'android' ? 5000 : 60000;
        if (backgroundDuration > reAuthThreshold && getCurrentRoom()) {
          devLog('🔄 Re-authenticating after background...');
          globalSocket?.emit('auth:login', { userId, username });
          globalSocket?.emit('room:silent_rejoin', {
            roomId: getCurrentRoom(),
            userId,
            username,
            lastMessageId: getLastMessageId(),
          });
        }
      } else if (state === 'background' || state === 'inactive') {
        isAppInBackground = true;
        lastBackgroundTime = Date.now();
        devLog('📱 App went to background');
        
        if (Platform.OS === 'android') {
          startBackgroundReconnect();
        }
      }
    };

    appStateSubscription.current = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (appStateSubscription.current) {
        appStateSubscription.current.remove();
        appStateSubscription.current = null;
      }
    };
  }, [userId, username]);
}
