import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';

const NOTIFICATION_ID = 'migx-foreground-notification';
const MESSAGE_NOTIFICATION_ID = 'migx-new-message';

let notificationId: string | null = null;
let messageNotificationId: string | null = null;
let permissionsRequested = false;
let isAppInBackground = false;
let currentRoomName: string | null = null;
let hasNewMessageNotification = false;
let socketListenerRegistered = false;
let isUserLoggedIn = false;

const checkUserLoggedIn = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  } catch {
    return false;
  }
};

export const setUserLoggedIn = (loggedIn: boolean) => {
  isUserLoggedIn = loggedIn;
  if (!loggedIn) {
    stopForegroundService();
  }
};

export const requestNotificationPermissions = async () => {
  if (Platform.OS !== 'android' || permissionsRequested) {
    return true;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    permissionsRequested = true;
    console.log('Notification permission status:', finalStatus);
    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

export const startForegroundService = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted, skipping foreground service');
      return;
    }

    await Notifications.setNotificationChannelAsync('foreground-service', {
      name: 'App Status',
      importance: Notifications.AndroidImportance.LOW, // Changed from MIN to LOW for better visibility
      vibrationPattern: [],
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Changed from SECRET
    });

    const notification = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Migx is running',
        body: 'Connected and ready for messages',
        sticky: true,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW, // Changed from MIN
        vibrate: [],
        color: '#043311',
      },
      trigger: null,
      identifier: NOTIFICATION_ID,
    });

    notificationId = notification;
    hasNewMessageNotification = false;
    console.log('Foreground service notification started:', notification);
  } catch (error) {
    console.error('Error starting foreground service:', error);
  }
};

export const setCurrentRoomName = (roomName: string | null) => {
  currentRoomName = roomName;
};

export const showNewMessageNotification = async (roomName?: string) => {
  if (Platform.OS !== 'android') {
    return;
  }
  
  const currentAppState = AppState.currentState;
  if (currentAppState === 'active') {
    return;
  }

  if (hasNewMessageNotification) {
    return;
  }
  
  hasNewMessageNotification = true;

  // Map terminology for notification body
  let displayRoomName = roomName || currentRoomName || 'Chat Room';
  let notificationBody = `You have new message from ${displayRoomName}`;
  
  if (displayRoomName.toLowerCase().includes('pm')) {
    displayRoomName = displayRoomName.replace(/pm/gi, 'DM');
    notificationBody = `You have new DM from ${displayRoomName}`;
  } else if (roomName) {
    // If it's a person's name (direct message), use DM terminology
    notificationBody = `You have new DM from ${roomName}`;
  }

  try {
    await Notifications.setNotificationChannelAsync('new-messages', {
      name: 'Chat Messages',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    if (messageNotificationId) {
      await Notifications.dismissNotificationAsync(messageNotificationId);
    }

    const notification = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Migx',
        body: notificationBody,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sound: true,
        badge: 1,
      },
      trigger: null,
      identifier: MESSAGE_NOTIFICATION_ID,
    });

    messageNotificationId = notification;
    console.log('📱 New message notification shown (once per background)');
  } catch (error) {
    console.error('Error showing new message notification:', error);
    hasNewMessageNotification = false;
  }
};

export const stopForegroundService = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    if (notificationId) {
      await Notifications.dismissNotificationAsync(notificationId);
      notificationId = null;
    }
    if (messageNotificationId) {
      await Notifications.dismissNotificationAsync(messageNotificationId);
      messageNotificationId = null;
    }
    hasNewMessageNotification = false;
    await Notifications.dismissAllNotificationsAsync();
    console.log('Foreground service notification stopped');
  } catch (error) {
    console.error('Error stopping foreground service:', error);
  }
};

export const resetNewMessageNotificationFlag = () => {
  hasNewMessageNotification = false;
};

const handleNotifNewMessage = (data: { fromUsername: string; type?: string }) => {
  if (isAppInBackground) {
    showNewMessageNotification(data.fromUsername);
  }
};

const handlePmMessage = (data: { fromUsername: string }) => {
  if (isAppInBackground) {
    showNewMessageNotification(data.fromUsername);
  }
};

export const setupForegroundServiceHandler = () => {
  if (Platform.OS !== 'android') {
    return;
  }

  let currentState = AppState.currentState;

  const subscription = AppState.addEventListener('change', async (nextAppState) => {
    // Android foreground service should start immediately when app goes to background
    // BUT only if user is logged in
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      isAppInBackground = true;
      const loggedIn = isUserLoggedIn || await checkUserLoggedIn();
      if (loggedIn) {
        await startForegroundService();
      }
    } else if (nextAppState === 'active') {
      isAppInBackground = false;
      hasNewMessageNotification = false;
      await stopForegroundService();
    }
    currentState = nextAppState;
  });

  const registerSocketListener = () => {
    const socket = useRoomTabsStore.getState().socket;
    if (socket && !socketListenerRegistered) {
      socket.off('notif:new_message', handleNotifNewMessage);
      socket.on('notif:new_message', handleNotifNewMessage);
      socket.off('pm:message', handlePmMessage);
      socket.on('pm:message', handlePmMessage);
      socketListenerRegistered = true;
    }
  };

  registerSocketListener();

  const unsubscribeStore = useRoomTabsStore.subscribe((state, prevState) => {
    if (state.socket !== prevState.socket) {
      socketListenerRegistered = false;
      registerSocketListener();
    }
  });

  return () => {
    subscription.remove();
    unsubscribeStore();
    const socket = useRoomTabsStore.getState().socket;
    if (socket) {
      socket.off('notif:new_message', handleNotifNewMessage);
      socket.off('pm:message', handlePmMessage);
    }
    socketListenerRegistered = false;
  };
};
