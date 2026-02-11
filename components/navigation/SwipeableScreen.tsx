import React, { useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 500;
const MAX_TAB_INDEX = 3;

const PATH_TO_INDEX: Record<string, number> = {
  '/': 0,
  '/index': 0,
  '/feed': 1,
  '/chat': 2,
  '/room': 3,
  '/(tabs)': 0,
  '/(tabs)/index': 0,
  '/(tabs)/feed': 1,
  '/(tabs)/chat': 2,
  '/(tabs)/room': 3,
};

const INDEX_TO_ROUTE: Record<number, string> = {
  0: '/(tabs)',
  1: '/(tabs)/feed',
  2: '/(tabs)/chat',
  3: '/(tabs)/room',
};

interface SwipeableScreenProps {
  children: React.ReactNode;
}

export function SwipeableScreen({ children }: SwipeableScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const translateX = useSharedValue(0);
  const isNavigating = useRef(false);
  
  const currentIndex = PATH_TO_INDEX[pathname] ?? 0;
  const currentIndexShared = useSharedValue(currentIndex);
  
  useEffect(() => {
    currentIndexShared.value = currentIndex;
  }, [currentIndex]);

  const doNavigation = useCallback((nextIndex: number) => {
    if (isNavigating.current) return;
    if (nextIndex < 0 || nextIndex > MAX_TAB_INDEX) return;
    
    isNavigating.current = true;
    
    const route = INDEX_TO_ROUTE[nextIndex];
    if (route) {
      if (Platform.OS === 'ios') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
      }
      
      try {
        router.replace(route as any);
      } catch (e) {}
    }
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 150);
  }, [router]);

  const doNavigationJS = useCallback((nextIndex: number) => {
    doNavigation(nextIndex);
  }, [doNavigation]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-10, 10])
    .minDistance(20)
    .onUpdate((event) => {
      'worklet';
      const idx = currentIndexShared.value;
      const canRight = idx > 0;
      const canLeft = idx < MAX_TAB_INDEX;
      
      const normalizedX = event.translationX / SCREEN_WIDTH;
      let tx = normalizedX * 80;
      
      if (!canRight && tx > 0) {
        tx *= 0.15;
      }
      if (!canLeft && tx < 0) {
        tx *= 0.15;
      }
      
      translateX.value = Math.max(-35, Math.min(35, tx));
    })
    .onEnd((event) => {
      'worklet';
      const idx = currentIndexShared.value;
      const canLeft = idx < MAX_TAB_INDEX;
      const canRight = idx > 0;
      
      const tx = event.translationX;
      const vx = event.velocityX;
      
      const shouldGoNext = (tx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && canLeft;
      const shouldGoPrev = (tx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && canRight;
      
      if (shouldGoNext) {
        runOnJS(doNavigationJS)(idx + 1);
      } else if (shouldGoPrev) {
        runOnJS(doNavigationJS)(idx - 1);
      }
      
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, 35],
      [1, 0.97],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
