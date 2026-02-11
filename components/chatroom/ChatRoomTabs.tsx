import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView, { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { useRoomTabsStore, useActiveIndex, useOpenRooms } from '@/stores/useRoomTabsStore';
import { ChatRoomInstance } from './ChatRoomInstance';
import { PrivateChatInstance } from './PrivateChatInstance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatRoomTabsProps {
  bottomPadding?: number;
  renderVoteButton?: () => React.ReactNode;
}

export function ChatRoomTabs({
  bottomPadding = 110, // Increased to 110 to balance with the top header spacing
  renderVoteButton,
}: ChatRoomTabsProps) {
  const openRooms = useOpenRooms();
  const activeIndex = useActiveIndex();
  const setActiveIndex = useRoomTabsStore(state => state.setActiveIndex);
  const currentUserId = useRoomTabsStore(state => state.currentUserId);
  
  const pagerRef = useRef<PagerView>(null);
  const lastSyncedIndex = useRef(activeIndex);
  
  useEffect(() => {
    if (activeIndex !== lastSyncedIndex.current && pagerRef.current) {
      lastSyncedIndex.current = activeIndex;
      pagerRef.current.setPageWithoutAnimation(activeIndex);
    }
  }, [activeIndex]);
  
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const newIndex = event.nativeEvent.position;
    lastSyncedIndex.current = newIndex;
    setActiveIndex(newIndex);
  }, [setActiveIndex]);
  
  if (openRooms.length === 0) {
    return null;
  }
  
  const pagerKey = openRooms.map(r => r.roomId).join('-');
  
  return (
    <View style={styles.container}>
      <PagerView
        key={pagerKey}
        ref={pagerRef}
        style={styles.pager}
        initialPage={activeIndex}
        onPageSelected={handlePageSelected}
        overdrag={false}
        offscreenPageLimit={1}
      >
        {openRooms.map((room, index) => {
          // Use private: prefix for DM tabs
          const isPrivateChat = room.roomId.startsWith('private:');
          
          let targetUsername = '';
          let targetUserId = '';
          
          if (isPrivateChat) {
            targetUsername = room.name || '';
            const parts = room.roomId.split(':');
            if (parts.length === 3) {
              targetUserId = `${parts[1]}:${parts[2]}`;
            }
          }
          
          return (
            <View key={room.roomId} style={styles.page}>
              {isPrivateChat ? (
                <PrivateChatInstance
                  roomId={room.roomId}
                  targetUsername={targetUsername}
                  targetUserId={targetUserId}
                  bottomPadding={bottomPadding}
                  isActive={index === activeIndex}
                />
              ) : (
                <ChatRoomInstance
                  roomId={room.roomId}
                  roomName={room.name}
                  bottomPadding={bottomPadding}
                  isActive={index === activeIndex}
                  renderVoteButton={renderVoteButton}
                  backgroundImage={room.backgroundImage}
                />
              )}
            </View>
          );
        })}
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
