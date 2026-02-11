import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Image, FlatList, Dimensions, ActivityIndicator, Pressable } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import API_BASE_URL from '@/utils/api';

interface Gift {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
}

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
}

const ITEMS_PER_ROW = 5;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - 30) / ITEMS_PER_ROW;

const GiftItem = memo(({ gift, theme }: { gift: Gift; theme: any }) => (
  <View style={styles.giftItem}>
    <View style={[styles.giftImageContainer, { backgroundColor: theme.card }]}>
      {gift.image_url ? (
        <Image
          source={{ uri: gift.image_url }}
          style={styles.giftImage}
          resizeMode="contain"
          fadeDuration={0}
        />
      ) : (
        <Text style={styles.giftPlaceholder}>🎁</Text>
      )}
    </View>
    <Text style={[styles.giftName, { color: theme.text }]} numberOfLines={1}>
      {gift.name}
    </Text>
    <Text style={[styles.giftPrice, { color: theme.text }]}>
      {gift.price} COINS
    </Text>
  </View>
));

function chunkArray(arr: Gift[], size: number): Gift[][] {
  const chunks: Gift[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const GiftRow = memo(({ row, theme }: { row: Gift[]; theme: any }) => (
  <View style={styles.giftRow}>
    {row.map((gift) => (
      <GiftItem key={gift.id} gift={gift} theme={theme} />
    ))}
    {row.length < ITEMS_PER_ROW &&
      Array.from({ length: ITEMS_PER_ROW - row.length }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.giftItem} />
      ))}
  </View>
));

export function GiftModal({ visible, onClose }: GiftModalProps) {
  const { theme } = useThemeCustom();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && gifts.length === 0) {
      loadGifts();
    }
  }, [visible]);

  const loadGifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/gifts`);
      const data = await response.json();
      if (data.success && data.gifts) {
        setGifts(data.gifts);
      } else {
        setError('Failed to load gifts');
      }
    } catch (err) {
      setError('Failed to load gifts');
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => chunkArray(gifts, ITEMS_PER_ROW), [gifts]);

  const renderRow = useCallback(
    ({ item }: { item: Gift[] }) => <GiftRow row={item} theme={theme} />,
    [theme]
  );

  const keyExtractor = useCallback(
    (_: Gift[], index: number) => `row-${index}`,
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_SIZE + 15,
      offset: (ITEM_SIZE + 15) * index,
      index,
    }),
    []
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.topArea} onPress={onClose} />
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Send Gift</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.secondary }]}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.instructionContainer}>
            <Text style={[styles.instructionText, { color: theme.secondary }]}>
              Use command to send gift:
            </Text>
            <Text style={[styles.commandText, { color: '#4CAF50' }]}>
              /gift [gift_name] [username]
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a5229" />
              <Text style={[styles.loadingText, { color: theme.secondary }]}>Loading gifts...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.secondary }]}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={loadGifts}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : gifts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.secondary }]}>No gifts available</Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              renderItem={renderRow}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              style={styles.listStyle}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={8}
              windowSize={5}
              initialNumToRender={6}
              bounces={true}
              overScrollMode="always"
              nestedScrollEnabled={true}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  topArea: {
    flex: 1,
  },
  modal: {
    height: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  instructionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 13,
    marginBottom: 4,
  },
  commandText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listStyle: {
    flex: 1,
    paddingHorizontal: 15,
  },
  listContent: {
    paddingBottom: 30,
    paddingTop: 4,
  },
  giftRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  giftItem: {
    width: ITEM_SIZE,
    alignItems: 'center',
    marginBottom: 15,
  },
  giftImageContainer: {
    width: ITEM_SIZE * 0.85,
    height: ITEM_SIZE * 0.85,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    padding: 6,
  },
  giftImage: {
    width: '100%',
    height: '100%',
  },
  giftPlaceholder: {
    fontSize: 32,
  },
  giftName: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  giftPrice: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0a5229',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
