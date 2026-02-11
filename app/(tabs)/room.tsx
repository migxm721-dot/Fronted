import { StyleSheet, View, SafeAreaView } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { RoomHeader } from '@/components/room/RoomHeader';
import { RoomList } from '@/components/room/RoomList';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';

export default function RoomScreen() {
  const { theme } = useThemeCustom();

  // Dummy functions for RoomHeader and RoomList props
  const handleCreateRoom = () => {
    // Implementation for creating a room
  };

  const handleRoomPress = (roomId: string) => {
    // Implementation for handling room press
  };

  const handleRefresh = () => {
    // Implementation for refreshing the room list
  };

  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <RoomHeader onCreateRoom={handleCreateRoom} />
        <RoomList
          onRoomPress={handleRoomPress}
          onRefresh={handleRefresh}
        />
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