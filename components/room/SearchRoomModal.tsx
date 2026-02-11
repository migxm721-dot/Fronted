import React, { useState, useCallback } from 'react';
import { Modal, View, TextInput, TouchableOpacity, ScrollView, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { API_ENDPOINTS } from '@/utils/api';
import Svg, { Path, Circle } from 'react-native-svg';

const CloseIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface Room {
  id: string;
  name: string;
  description?: string;
  userCount: number;
  maxUsers?: number;
  max_users?: number;
}

interface SearchRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onRoomPress: (roomId: string, roomName: string) => void;
}

export function SearchRoomModal({ visible, onClose, onRoomPress }: SearchRoomModalProps) {
  const { theme } = useThemeCustom();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.ROOM.SEARCH(query));
      const data = await response.json();
      
      if (data.success && Array.isArray(data.rooms)) {
        setSearchResults(data.rooms);
      } else if (Array.isArray(data)) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Failed to search rooms:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRoomSelect = (roomId: string, roomName: string) => {
    onRoomPress(roomId, roomName);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#0a5229', borderBottomColor: theme.border }]}>
          <Text style={styles.headerTitle}>Search Rooms</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <CloseIcon color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]}
            placeholder="Type room name..."
            placeholderTextColor={theme.secondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>

        {/* Results */}
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : searchResults.length > 0 ? (
            searchResults.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={[styles.roomItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
                onPress={() => handleRoomSelect(room.id, room.name)}
              >
                <View style={styles.roomInfo}>
                  <Text style={[styles.roomName, { color: theme.text }]}>{room.name}</Text>
                  {room.description && (
                    <Text style={[styles.roomDescription, { color: theme.secondary }]} numberOfLines={1}>
                      {room.description}
                    </Text>
                  )}
                </View>
                <Text style={[styles.userCount, { color: theme.secondary }]}>
                  ({room.userCount || 0}/{room.maxUsers || room.max_users || 50})
                </Text>
              </TouchableOpacity>
            ))
          ) : searchQuery.trim().length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.secondary }]}>No rooms found</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.secondary }]}>Type to search rooms</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  roomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
    borderRadius: 6,
    borderBottomWidth: 1,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 12,
  },
  userCount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
  },
});
