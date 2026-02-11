import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { ChatIcon, CloseXIcon, UserProfileIcon } from '@/components/ui/SvgIcons';

interface ActiveRoom {
  id: string;
  name: string;
}

interface ActiveRoomsModalProps {
  visible: boolean;
  onClose: () => void;
  activeRooms: ActiveRoom[];
  onRoomPress: (roomId: string, name: string) => void;
}

export function ActiveRoomsModal({ visible, onClose, activeRooms, onRoomPress }: ActiveRoomsModalProps) {
  const { theme } = useThemeCustom();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Active Rooms</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <CloseXIcon color={theme.text} size={20} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.roomList} showsVerticalScrollIndicator={false}>
            {activeRooms.length > 0 ? (
              activeRooms.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={[styles.roomItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    onRoomPress(room.id, room.name);
                    onClose();
                  }}
                >
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                    {room.id.startsWith('private:') ? (
                      <UserProfileIcon color={theme.primary} size={20} />
                    ) : (
                      <ChatIcon color={theme.primary} size={20} />
                    )}
                  </View>
                  <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
                    {room.name}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.secondary }]}>No active rooms</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '60%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  roomList: {
    padding: 8,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
