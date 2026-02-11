import { StyleSheet, View, SafeAreaView } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { MigxworldContent } from '@/components/migxworld/MigxworldContent';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';

export default function ChatScreen() {
  const { theme } = useThemeCustom();
  
  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <MigxworldContent />
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
