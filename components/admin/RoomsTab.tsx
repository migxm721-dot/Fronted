import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';

interface Room {
  id: number;
  name: string;
  category: string;
  max_users: number;
  maxUsers?: number;
  owner_name?: string;
  description?: string;
}

interface RoomsTabProps {
  theme: any;
  loading: boolean;
  rooms: Room[];
  onCreateRoom: () => void;
  onEditRoom: (room: Room) => void;
  onDeleteRoom: (room: Room) => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
}

export function RoomsTab({
  theme,
  loading,
  rooms,
  onCreateRoom,
  onEditRoom,
  onDeleteRoom,
  searchQuery,
  onSearchChange,
}: RoomsTabProps) {
  return (
    <>
      <View style={[styles.roomHeader, { backgroundColor: theme.card }]}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]}
            placeholder="Search rooms..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: '#0a5229' }]}
          onPress={onCreateRoom}
        >
          <Text style={styles.createButtonText}>+ Create Room</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a5229" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {rooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.secondary }]}>No rooms yet</Text>
            </View>
          ) : (
            rooms.map(room => (
              <View key={room.id} style={[styles.roomCard, { backgroundColor: theme.card }]}>
                <View style={styles.roomInfo}>
                  <Text style={[styles.roomName, { color: theme.text }]}>{room.name}</Text>
                  <Text style={[styles.roomMeta, { color: theme.secondary }]}>
                    Category: {room.category || 'global'}
                  </Text>
                  <Text style={[styles.roomMeta, { color: theme.secondary }]}>
                    Capacity: {room.max_users || room.maxUsers || 0}
                  </Text>
                  {room.owner_name && (
                    <Text style={[styles.roomMeta, { color: theme.secondary }]}>
                      Owner: {room.owner_name}
                    </Text>
                  )}
                </View>
                <View style={styles.roomActions}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: '#3498DB' }]}
                    onPress={() => onEditRoom(room)}
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: '#E74C3C' }]}
                    onPress={() => onDeleteRoom(room)}
                  >
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  roomHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  searchContainer: {
    width: '100%',
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  roomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  roomMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  roomActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
