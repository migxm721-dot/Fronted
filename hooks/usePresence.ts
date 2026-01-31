import { devLog } from '@/utils/devLog';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'invisible';

const PRESENCE_STORAGE_KEY = 'user_presence_status';

interface UsePresenceReturn {
  status: PresenceStatus;
  setStatus: (status: PresenceStatus) => Promise<void>;
  isConnected: boolean;
  isUpdating: boolean;
}

export function usePresence(username?: string): UsePresenceReturn {
  const [status, setStatusState] = useState<PresenceStatus>('online');
  const [isConnected, setIsConnected] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isInitialized, setIsInitialized] = useState(false);
  const socketRef = useRef<any>(null);
  const manualStatusRef = useRef<PresenceStatus | null>(null);

  // Load saved status from storage on mount
  useEffect(() => {
    const loadSavedStatus = async () => {
      try {
        const savedStatus = await AsyncStorage.getItem(PRESENCE_STORAGE_KEY);
        if (savedStatus && ['online', 'away', 'busy', 'invisible'].includes(savedStatus)) {
          devLog('📱 Loaded saved presence status:', savedStatus);
          setStatusState(savedStatus as PresenceStatus);
          manualStatusRef.current = savedStatus as PresenceStatus;
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load saved presence status:', error);
        setIsInitialized(true);
      }
    };
    loadSavedStatus();
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!username || !isInitialized) return;

    const socket = useRoomTabsStore.getState().socket;
    if (!socket) return;
    
    socketRef.current = socket;

    const handleConnect = () => {
      setIsConnected(true);
      devLog('🟢 Presence socket connected');
      const currentStatus = manualStatusRef.current || status;
      socket.emit('presence:update', { username, status: currentStatus });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      devLog('🔴 Presence socket disconnected');
    };

    const handlePresenceUpdated = (data: any) => {
      devLog('📡 Presence updated confirmation:', data);
    };

    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('presence:updated', handlePresenceUpdated);
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('presence:updated', handlePresenceUpdated);
    
    if (socket.connected) {
      setIsConnected(true);
      const currentStatus = manualStatusRef.current || status;
      socket.emit('presence:update', { username, status: currentStatus });
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('presence:updated', handlePresenceUpdated);
    };
  }, [username, isInitialized]);

  // Send presence update to server when status changes
  useEffect(() => {
    if (!username || !socketRef.current) return;

    const updatePresenceOnServer = () => {
      try {
        if (socketRef.current?.connected) {
          socketRef.current.emit('presence:update', { username, status });
          devLog('📡 Emitted presence:update', { username, status });
        } else {
          devLog('⏳ Socket not connected, waiting...');
        }
      } catch (error) {
        console.error('Failed to update presence:', error);
      }
    };

    updatePresenceOnServer();
  }, [username, status]);

  // Keep-alive: refresh presence every 90 seconds (before 2 min TTL expires)
  useEffect(() => {
    if (!username) return;

    const keepAliveInterval = setInterval(() => {
      if (status !== 'offline' && socketRef.current?.connected) {
        socketRef.current.emit('presence:update', { username, status });
        devLog('🔄 Keep-alive presence refresh:', { username, status });
      }
    }, 90000);

    return () => {
      clearInterval(keepAliveInterval);
    };
  }, [username, status]);

  // Auto-away detection disabled - user controls status manually
  // Status will persist as user set it until they manually change it

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - refresh activity but DON'T change status
        setLastActivity(Date.now());
        // Only refresh presence to server, don't change the status
        if (socketRef.current?.connected && username) {
          const currentStatus = manualStatusRef.current || status;
          socketRef.current.emit('presence:update', { username, status: currentStatus });
          devLog('📱 App active - refreshing presence:', currentStatus);
        }
      }
      // Don't auto-change to away on background - user's manual status should persist
    });

    return () => {
      subscription.remove();
    };
  }, [status, username]);

  const setStatus = useCallback(async (newStatus: PresenceStatus): Promise<void> => {
    setIsUpdating(true);
    try {
      setStatusState(newStatus);
      manualStatusRef.current = newStatus;
      setLastActivity(Date.now());
      
      // Emit to server immediately
      if (socketRef.current?.connected && username) {
        socketRef.current.emit('presence:update', { username, status: newStatus });
        devLog('📡 Emitted presence:update immediately:', { username, status: newStatus });
      }
      
      // Persist to storage for next session
      await AsyncStorage.setItem(PRESENCE_STORAGE_KEY, newStatus);
      devLog('💾 Saved presence status:', newStatus);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to save presence status:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [username]);

  return {
    status,
    setStatus,
    isConnected,
    isUpdating,
  };
}
