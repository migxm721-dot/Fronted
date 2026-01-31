import { StyleSheet, View, SafeAreaView } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatList } from '@/components/chat/ChatList';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';

export default function ChatScreen() {
  const { theme } = useThemeCustom();
  
  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <ChatHeader />
          <ChatList />
        </SafeAreaView>
      </View>
    </SwipeableScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
