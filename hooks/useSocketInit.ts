import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoomTabsStore, buildConversationId } from '@/stores/useRoomTabsStore';
import { devLog } from '@/utils/devLog';
import API_BASE_URL, { getCurrentRoom, getLastMessageId, setBackgroundTimestamp, getBackgroundTimestamp } from '@/utils/api';

let globalSocket: Socket | null = null;
let heartbeatInterval: any = null;
let backgroundReconnectInterval: any = null;
let isAppInBackground = false;
let lastBackgroundTime = 0;
let lastActiveRoomId: string | null = null;
let isReconnecting = false;
let isCreatingSocket = false;

let pendingMessages: Array<{ event: string; data: any; userId: number }> = [];
let pendingMessagesUserId: number | null = null;
const MAX_PENDING_MESSAGES = 50;

export const queueMessage = (event: string, data: any) => {
  if (!lastInitUserId) {
    devLog('Cannot queue message: no user context');
    return;
  }
  
  if (pendingMessagesUserId !== null && pendingMessagesUserId !== lastInitUserId) {
    pendingMessages = [];
  }
  
  pendingMessagesUserId = lastInitUserId;
  
  if (pendingMessages.length >= MAX_PENDING_MESSAGES) {
    pendingMessages.shift();
  }
  pendingMessages.push({ event, data, userId: lastInitUserId });
  devLog('Message queued (offline):', event);
};

const flushPendingMessages = (currentUserId: number) => {
  if (!globalSocket?.connected || pendingMessages.length === 0) return;
  
  if (pendingMessagesUserId !== currentUserId) {
    pendingMessages = [];
    pendingMessagesUserId = null;
    return;
  }
  
  devLog(`Flushing ${pendingMessages.length} queued messages...`);
  const messages = [...pendingMessages];
  pendingMessages = [];
  pendingMessagesUserId = null;
  
  messages.forEach(({ event, data }) => {
    globalSocket?.emit(event, data);
  });
};

export const isSocketReady = () => globalSocket?.connected ?? false;

const clearAllTimers = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (backgroundReconnectInterval) {
    clearInterval(backgroundReconnectInterval);
    backgroundReconnectInterval = null;
  }
};

const startHeartbeat = (sock: Socket) => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  const heartbeatMs = Platform.OS === 'android' ? 8000 : 15000;
  
  heartbeatInterval = setInterval(() => {
    if (sock !== globalSocket) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
      return;
    }
    if (sock.connected) {
      sock.emit('ping');
    } else if (isAppInBackground && !isReconnecting) {
      devLog('Socket disconnected in background, attempting reconnect...');
      sock.connect();
    }
  }, heartbeatMs);
};

const startBackgroundReconnect = () => {
  if (backgroundReconnectInterval) return;
  
  backgroundReconnectInterval = setInterval(async () => {
    if (!isAppInBackground || isReconnecting || isCreatingSocket) return;
    
    if (globalSocket && !globalSocket.connected) {
      devLog('Background reconnect: chat socket...');
      globalSocket.connect();
    }
  }, 15000);
};

export const setLastActiveRoom = (roomId: string | null) => {
  lastActiveRoomId = roomId;
  if (roomId) {
    AsyncStorage.setItem('socket_last_active_room', roomId).catch(() => {});
  }
};

export const getLastActiveRoom = async (): Promise<string | null> => {
  if (lastActiveRoomId) return lastActiveRoomId;
  try {
    return await AsyncStorage.getItem('socket_last_active_room');
  } catch {
    return null;
  }
};

const stopBackgroundReconnect = () => {
  if (backgroundReconnectInterval) {
    clearInterval(backgroundReconnectInterval);
    backgroundReconnectInterval = null;
  }
};

export const getGlobalSocket = () => globalSocket;

let onSocketDisconnectCallbacks: (() => void)[] = [];

export const registerSocketDisconnectCallback = (callback: () => void) => {
  if (!onSocketDisconnectCallbacks.includes(callback)) {
    onSocketDisconnectCallbacks.push(callback);
  }
};

export const unregisterSocketDisconnectCallback = (callback: () => void) => {
  onSocketDisconnectCallbacks = onSocketDisconnectCallbacks.filter(cb => cb !== callback);
};

export const clearPendingMessages = () => {
  if (pendingMessages.length > 0) {
    devLog(`Clearing ${pendingMessages.length} pending messages (user switch/logout)`);
  }
  pendingMessages = [];
  pendingMessagesUserId = null;
};

export const disconnectGlobalSocket = () => {
  clearAllTimers();
  clearPendingMessages();
  isReconnecting = false;
  isCreatingSocket = false;
  if (globalSocket) {
    globalSocket.removeAllListeners();
    globalSocket.disconnect();
    globalSocket = null;
  }
  onSocketDisconnectCallbacks.forEach(cb => cb());
  useRoomTabsStore.getState().setSocket(null);
  lastInitUserId = null;
};

export const resetSocketOnLogout = () => {
  clearPendingMessages();
  disconnectGlobalSocket();
};

let lastInitUserId: number | null = null;

const waitForConnection = (timeoutMs: number): Promise<boolean> => {
  return new Promise((resolve) => {
    if (globalSocket?.connected) { resolve(true); return; }
    const checkInterval = setInterval(() => {
      if (globalSocket?.connected) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(globalSocket?.connected || false);
    }, timeoutMs);
  });
};

export function useSocketInit(userId?: number, username?: string) {
  const appStateSubscription = useRef<any>(null);

  useEffect(() => {
    if (!userId || !username) {
      if (lastInitUserId !== null) {
        devLog('User logged out, disconnecting socket');
        disconnectGlobalSocket();
        lastInitUserId = null;
      }
      return;
    }
    
    if (lastInitUserId !== null && lastInitUserId !== userId) {
      devLog('User changed from', lastInitUserId, 'to', userId, ', disconnecting old socket');
      disconnectGlobalSocket();
    }
    
    if (globalSocket?.connected && lastInitUserId === userId) return;
    
    lastInitUserId = userId;

    const destroySocket = (sock: Socket | null) => {
      if (!sock) return;
      try {
        sock.removeAllListeners();
        sock.disconnect();
      } catch (e) {
        devLog('Error destroying socket:', e);
      }
    };

    const createSocket = (): Socket | null => {
      if (isCreatingSocket) {
        devLog('⚠️ Socket creation already in progress, skipping duplicate');
        return globalSocket;
      }
      isCreatingSocket = true;

      if (globalSocket) {
        devLog('🔌 Destroying old socket before creating new one');
        destroySocket(globalSocket);
        globalSocket = null;
      }

      const isAndroid = Platform.OS === 'android';
      
      const sock = io(`${API_BASE_URL}/chat`, {
        auth: { userId, username },
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: isAndroid ? 500 : 1000,
        reconnectionDelayMax: isAndroid ? 3000 : 5000,
        timeout: isAndroid ? 10000 : 15000,
        forceNew: true,
        autoConnect: true,
        multiplex: false,
      });
      
      sock.io.opts.transports = ['websocket'];
      sock.io.opts.upgrade = false;

      sock.on('connect', () => {
        devLog('Chat socket connected, id:', sock.id);
        if (sock !== globalSocket) {
          devLog('⚠️ Stale socket connected, destroying');
          destroySocket(sock);
          return;
        }
        isCreatingSocket = false;
        sock.emit('auth:login', { userId, username });
        
        const currentRoomId = getCurrentRoom();
        if (currentRoomId) {
          sock.emit('room:silent_rejoin', {
            roomId: currentRoomId,
            userId,
            username,
            lastMessageId: getLastMessageId(),
          });
        }
        
        flushPendingMessages(userId);
        startHeartbeat(sock);
        useRoomTabsStore.getState().setSocket(sock);
      });

      sock.on('disconnect', (reason) => {
        devLog('Chat socket disconnected:', reason);
        if (sock !== globalSocket) return;
      });

      sock.on('connect_error', (error) => {
        devLog('Socket connect error:', error.message);
        isCreatingSocket = false;
        if (sock !== globalSocket) {
          destroySocket(sock);
          return;
        }
      });

      sock.on('session:replaced', () => {
        devLog('⚠️ Session replaced by another connection - not reconnecting');
        if (sock === globalSocket) {
          globalSocket = null;
          isCreatingSocket = false;
        }
        destroySocket(sock);
      });

      sock.on('dm:receive', (data: any) => {
        if (sock !== globalSocket) return;
        const store = useRoomTabsStore.getState();
        const storeUserId = store.currentUserId;
        if (!storeUserId) return;
        if (String(data.toUserId) !== String(storeUserId)) return;

        const senderId = String(data.fromUserId);
        const senderUsername = data.fromUsername;
        if (!senderUsername || !data.message) return;

        const conversationId = buildConversationId(storeUserId, senderId);
        const isAlreadyOpen = store.openRoomIds.includes(conversationId);

        store.openRoom(conversationId, senderUsername);

        const roleToUserType = (role: string): 'admin' | 'mentor' | 'merchant' | 'normal' | 'moderator' => {
          if (role === 'admin') return 'admin';
          if (role === 'mentor') return 'mentor';
          if (role === 'merchant') return 'merchant';
          if (role === 'customer_service' || role === 'moderator') return 'moderator';
          return 'normal';
        };

        const pmMessage = {
          id: data.id || `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          username: senderUsername,
          message: data.message,
          isOwnMessage: false,
          userType: roleToUserType(data.fromRole || 'user'),
          timestamp: data.timestamp || new Date().toISOString(),
          messageType: 'dm' as const,
          type: data.type,
          messageColor: data.messageColor,
        };

        store.addPrivateMessage(senderId, pmMessage);
        store.markUnread(conversationId);
        store.incrementUnreadPm(senderId);

        devLog('Global DM received from:', senderUsername, 'tab:', isAlreadyOpen ? 'exists' : 'created');
      });

      sock.on('dm:sent', (data: any) => {
        if (sock !== globalSocket) return;
        const store = useRoomTabsStore.getState();
        const storeUserId = store.currentUserId;
        if (!storeUserId) return;

        const targetUserId = String(data.toUserId);
        const conversationId = buildConversationId(storeUserId, targetUserId);

        if (!store.openRoomIds.includes(conversationId)) {
          store.openRoom(conversationId, data.toUsername || `User ${targetUserId}`);
        }

        const pmMessage = {
          id: data.id || `pm_sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          username: store.currentUsername || username,
          message: data.message,
          isOwnMessage: true,
          userType: 'normal' as const,
          timestamp: data.timestamp || new Date().toISOString(),
          messageType: 'dm' as const,
        };

        store.addPrivateMessage(targetUserId, pmMessage);
      });

      return sock;
    };

    const initSocket = async () => {
      if (globalSocket?.connected && lastInitUserId === userId) {
        devLog('Socket already connected, reusing');
        useRoomTabsStore.getState().setSocket(globalSocket);
        return;
      }

      if (isCreatingSocket) {
        devLog('⚠️ Socket creation in progress, skipping initSocket');
        return;
      }

      devLog('Creating new /chat socket for user:', username);
      const newSock = createSocket();
      if (newSock) {
        globalSocket = newSock;
        useRoomTabsStore.getState().setSocket(globalSocket);
      }
    };

    const rejoinRoomAndSync = async (sock: Socket) => {
      if (sock !== globalSocket) return;
      
      let roomToJoin = getCurrentRoom();
      if (!roomToJoin) {
        roomToJoin = await getLastActiveRoom();
      }
      
      if (roomToJoin && sock === globalSocket && sock.connected) {
        devLog(`Rejoining room ${roomToJoin} after resume...`);
        sock.emit('room:silent_rejoin', {
          roomId: roomToJoin,
          userId,
          username,
          lastMessageId: getLastMessageId(),
        });
        
        let bgTimestamp = getBackgroundTimestamp();
        if (!bgTimestamp) {
          try {
            const storedTs = await AsyncStorage.getItem('socket_background_timestamp');
            if (storedTs) {
              bgTimestamp = parseInt(storedTs, 10);
            }
          } catch {}
        }
        
        if (bgTimestamp && sock === globalSocket) {
          devLog(`Requesting message sync since ${new Date(bgTimestamp).toISOString()}`);
          sock.emit('room:messages:sync', {
            roomId: roomToJoin,
            since: bgTimestamp,
            limit: 200
          });
          setBackgroundTimestamp(null);
          AsyncStorage.removeItem('socket_background_timestamp').catch(() => {});
        }
      }
    };

    const forceReconnect = async (): Promise<boolean> => {
      if (isReconnecting || isCreatingSocket) return false;
      isReconnecting = true;
      
      try {
        clearAllTimers();
        
        devLog('Force creating new socket after long background...');
        const newSock = createSocket();
        if (!newSock) {
          isReconnecting = false;
          return false;
        }
        globalSocket = newSock;
        useRoomTabsStore.getState().setSocket(globalSocket);
        
        const connected = await waitForConnection(8000);
        
        if (connected && globalSocket?.connected) {
          await rejoinRoomAndSync(globalSocket);
          flushPendingMessages(userId);
          isReconnecting = false;
          return true;
        }
        
        isReconnecting = false;
        return false;
      } catch (err) {
        isReconnecting = false;
        isCreatingSocket = false;
        return false;
      }
    };

    initSocket();

    const handleAppStateChange = async (state: AppStateStatus) => {
      if (state === 'active') {
        isAppInBackground = false;
        stopBackgroundReconnect();
        
        const backgroundDuration = Date.now() - lastBackgroundTime;
        const backgroundSeconds = Math.round(backgroundDuration / 1000);
        const backgroundMinutes = Math.round(backgroundDuration / 60000);
        devLog(`App resumed after ${backgroundMinutes}m ${backgroundSeconds % 60}s`);
        
        if (isReconnecting || isCreatingSocket) {
          devLog('Reconnect already in progress, skipping...');
          return;
        }
        
        if (!globalSocket) {
          devLog('No socket found, creating new one...');
          await initSocket();
          return;
        }
        
        if (!globalSocket.connected) {
          devLog('Socket disconnected, reconnecting...');
          isReconnecting = true;
          
          globalSocket.connect();
          const connected = await waitForConnection(5000);
          
          isReconnecting = false;
          
          if (connected && globalSocket?.connected) {
            devLog('Socket reconnected, re-authenticating...');
            globalSocket.emit('auth:login', { userId, username });
            await rejoinRoomAndSync(globalSocket);
            flushPendingMessages(userId);
          } else {
            devLog('Reconnect failed, force recreating socket...');
            await forceReconnect();
          }
        } else {
          const reAuthThreshold = Platform.OS === 'android' ? 5000 : 30000;
          if (backgroundDuration > reAuthThreshold) {
            devLog('Re-authenticating after background...');
            globalSocket.emit('auth:login', { userId, username });
            await rejoinRoomAndSync(globalSocket);
          }
        }
      } else if (state === 'background' || state === 'inactive') {
        isAppInBackground = true;
        lastBackgroundTime = Date.now();
        
        const bgTimestamp = Date.now();
        setBackgroundTimestamp(bgTimestamp);
        AsyncStorage.setItem('socket_background_timestamp', bgTimestamp.toString()).catch(() => {});
        
        const currentRoomId = getCurrentRoom();
        if (currentRoomId) {
          lastActiveRoomId = currentRoomId;
          AsyncStorage.setItem('socket_last_active_room', currentRoomId).catch(() => {});
        }
        
        devLog('App went to background');
        
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
