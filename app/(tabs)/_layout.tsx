import { devLog } from '@/utils/devLog';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform, Alert, Modal, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useThemeCustom } from '@/theme/provider';
import { HomeIcon, ChatIcon, RoomIcon, FeedIcon, WorldIcon } from '@/components/ui/SvgIcons';
import { useSocketInit } from '@/hooks/useSocketInit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 500;

const TAB_CONFIG: Record<string, { title: string; icon: (props: { color: string; size: number }) => React.ReactNode }> = {
  'index': { title: 'Home', icon: HomeIcon },
  'feed': { title: 'Feed', icon: FeedIcon },
  'chat': { title: 'World', icon: WorldIcon },
  'room': { title: 'Room', icon: RoomIcon },
};

const VISIBLE_TABS = ['index', 'feed', 'chat', 'room'];
const TOTAL_TABS = VISIBLE_TABS.length;
const MAX_TAB_INDEX = TOTAL_TABS - 1;

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { theme, isDark } = useThemeCustom();
  const insets = useSafeAreaInsets();
  
  const currentRouteName = state.routes[state.index]?.name || 'index';
  
  // Find visual index based on VISIBLE_TABS order
  const currentVisualIdx = VISIBLE_TABS.indexOf(currentRouteName);
  const currentIdx = currentVisualIdx !== -1 ? currentVisualIdx : state.index;
  
  const animatedIndex = useSharedValue(currentIdx);

  const TAB_WIDTH = SCREEN_WIDTH / TOTAL_TABS;
  const INDICATOR_WIDTH = 40;
  const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    animatedIndex.value = withSpring(currentIdx, {
      damping: 18,
      stiffness: 180,
      mass: 0.25,
    });
  }, [currentIdx]);

  const indicatorStyle = useAnimatedStyle(() => {
    const basePosition = animatedIndex.value * TAB_WIDTH + INDICATOR_OFFSET;
    return {
      transform: [{ translateX: basePosition }],
    };
  });

  const navigateToTab = useCallback((targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= TOTAL_TABS) return;
    
    const targetRoute = VISIBLE_TABS[targetIdx];
    if (targetRoute) {
      if (Platform.OS === 'ios') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
      }
      navigation.navigate(targetRoute);
    }
  }, [navigation]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-50, 50])
    .failOffsetY([-10, 10])
    .maxPointers(1)
    .minDistance(30)
    .averageTouches(true)
    .onStart(() => {
      'worklet';
      animatedIndex.value = currentIdx;
    })
    .onUpdate((event) => {
      'worklet';
      const progress = -event.translationX / SCREEN_WIDTH;
      const newIdx = Math.max(0, Math.min(TOTAL_TABS - 1, currentIdx + progress));
      animatedIndex.value = newIdx;
    })
    .onEnd((event) => {
      'worklet';
      const vx = event.velocityX;
      const tx = event.translationX;
      
      let targetIdx = currentIdx;

      if ((tx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && currentIdx < MAX_TAB_INDEX) {
        targetIdx = currentIdx + 1;
        runOnJS(navigateToTab)(targetIdx);
      } 
      else if ((tx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && currentIdx > 0) {
        targetIdx = currentIdx - 1;
        runOnJS(navigateToTab)(targetIdx);
      }
      
      animatedIndex.value = withSpring(targetIdx, {
        damping: 20,
        stiffness: 200,
        mass: 0.3,
      });
    });

  return (
    <View pointerEvents="box-none" style={{ width: '100%' }}>
      <GestureDetector gesture={panGesture}>
        <LinearGradient 
          colors={['#082919', '#082919']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }}
          style={[
            styles.tabBar, 
            { 
              paddingBottom: Math.max(insets.bottom, 8),
              borderTopColor: '#082919',
            }
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              { backgroundColor: '#FFFFFF' },
              indicatorStyle,
            ]}
          />

          <View style={styles.tabsRow}>
            {VISIBLE_TABS.map((tabName, index) => {
              const config = TAB_CONFIG[tabName];
              if (!config) return null;
              
              const isActive = currentIdx === index;
              const color = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)';

              return (
                <TouchableOpacity
                  key={tabName}
                  style={styles.tab}
                  onPress={() => navigateToTab(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tabContent}>
                    {config.icon({ color, size: 24 })}
                    <Text style={[styles.tabLabel, { color }]}>{config.title}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>
      </GestureDetector>
    </View>
  );
}

function NoInternetModal({ visible, onRetry }: { visible: boolean; onRetry: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.noInternetOverlay}>
        <View style={styles.noInternetModal}>
          <Text style={styles.noInternetIcon}>📡</Text>
          <Text style={styles.noInternetTitle}>Tidak Ada Koneksi Internet</Text>
          <Text style={styles.noInternetMessage}>
            Periksa koneksi internet Anda dan coba lagi
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showNoInternet, setShowNoInternet] = useState(false);
  const [userData, setUserData] = useState<{ id: number; username: string } | null>(null);
  const authChecked = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const hasRestoredRef = useRef(false);
  
  useSocketInit(userData?.id, userData?.username);

  // DISABLED: Auto-restore to chatroom was causing app to be heavy on resume
  // Users will manually navigate to chatroom if needed
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const checkNetworkAndAuth = useCallback(async () => {
    try {
      // First check if user is authenticated - this is the priority
      // Don't redirect to login just because network is slow
      const userDataStr = await AsyncStorage.getItem('user_data');
      const authToken = await AsyncStorage.getItem('auth_token');
      
      if (!userDataStr || !authToken) {
        devLog('❌ No user data or token found - redirecting to login');
        router.replace('/login');
        return;
      }

      try {
        const parsedUserData = JSON.parse(userDataStr);
        if (!parsedUserData.username || !parsedUserData.id || parsedUserData.username === 'guest') {
          devLog('❌ Invalid user data - redirecting to login');
          await AsyncStorage.removeItem('user_data');
          await AsyncStorage.removeItem('auth_token');
          router.replace('/login');
          return;
        }
        
        devLog('✅ User authenticated:', parsedUserData.username);
        setUserData({ id: parsedUserData.id, username: parsedUserData.username });
        setIsLoading(false);
        
        // Check network in background - don't block UI or redirect to login
        // User can still use cached data/offline features
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          await fetch('https://www.google.com/favicon.ico', { 
            method: 'HEAD',
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          devLog('✅ Network connectivity confirmed');
        } catch (networkError) {
          clearTimeout(timeoutId);
          // Don't show no internet modal - just log it
          // Socket will handle reconnection automatically
          devLog('⚠️ Network check failed, but user is authenticated - continuing');
        }
      } catch (parseError) {
        devLog('❌ Failed to parse user data - redirecting to login');
        await AsyncStorage.removeItem('user_data');
        await AsyncStorage.removeItem('auth_token');
        router.replace('/login');
        return;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Only show no internet if we couldn't even check AsyncStorage
      setShowNoInternet(true);
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked.current) {
      authChecked.current = true;
      checkNetworkAndAuth();
    }
  }, [checkNetworkAndAuth]);

  const handleRetry = () => {
    setShowNoInternet(false);
    setIsLoading(true);
    authChecked.current = false;
    checkNetworkAndAuth();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a5229" />
      </View>
    );
  }

  return (
    <>
      <NoInternetModal visible={showNoInternet} onRetry={handleRetry} />
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 100,
          lazy: false,
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
        <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
        <Tabs.Screen name="room" options={{ title: 'Room' }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noInternetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noInternetModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
  },
  noInternetIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noInternetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noInternetMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#0a5229',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    borderTopWidth: 0.5,
    position: 'relative',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    borderRadius: 1.5,
  },
});