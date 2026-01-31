import { StyleSheet, View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { Header } from '@/components/home/Header';
import { ContactList } from '@/components/home/ContactList';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';
import { UserProfileSection } from '@/components/home/UserProfileSection';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';

import { useRoomTabsStore } from '@/stores/useRoomTabsStore';

export default function HomeScreen() {
  const { theme } = useThemeCustom();
  const setDarkTheme = useRoomTabsStore(state => state.setDarkTheme);

  useEffect(() => {
    // Check if background is dark or theme explicitly says it is
    const isDark = theme.background === '#000000' || theme.card === '#1a1a1a';
    setDarkTheme(isDark);
  }, [theme.background, theme.card, setDarkTheme]);

  const [refreshing, setRefreshing] = useState(false);
  const contactListRef = useRef<any>(null);

  useEffect(() => {
    checkAnnouncements();
  }, []);

  const checkAnnouncements = async () => {
    try {
      const lastAlertId = await AsyncStorage.getItem('last_announcement_id');
      const response = await fetch(`${API_BASE_URL}/api/announcements/active`);
      const data = await response.json();

      if (data.announcement && data.announcement.id.toString() !== lastAlertId) {
        Alert.alert(
          data.announcement.title || 'Pemberitahuan',
          data.announcement.content,
          [{ 
            text: 'OK', 
            onPress: () => AsyncStorage.setItem('last_announcement_id', data.announcement.id.toString()) 
          }]
        );
      }
    } catch (error) {
      console.error('Error checking announcements:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger ContactList refresh
      if (contactListRef.current?.refreshContacts) {
        await contactListRef.current.refreshContacts();
      }
      // Add a small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.text}
              colors={['#0a5229']}
            />
          }
        >
          <UserProfileSection />
          <ContactList ref={contactListRef} />
        </ScrollView>
      </View>
    </SwipeableScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
