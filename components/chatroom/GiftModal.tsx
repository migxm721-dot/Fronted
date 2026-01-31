import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Modal, Image, ScrollView, Dimensions, ActivityIndicator, Pressable } from 'react-native';
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

const GiftItem = memo(({ gift, itemSize, theme }: { gift: Gift, itemSize: number, theme: any }) => (
  <View style={[styles.giftItem, { width: itemSize }]}>
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
), (prevProps, nextProps) => {
  return prevProps.gift.id === nextProps.gift.id && prevProps.theme.background === nextProps.theme.background;
});

export function GiftModal({ visible, onClose }: GiftModalProps) {
  const { theme } = useThemeCustom();
  const screenWidth = Dimensions.get('window').width;
  const itemsPerRow = 5;
  const itemSize = (screenWidth - 30) / itemsPerRow;
  
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGift, setShowGift] = useState(false);

  useEffect(() => {
    if (visible) {
      loadGifts();
      const timer = setTimeout(() => setShowGift(true), 100);
      return () => {
        clearTimeout(timer);
        setShowGift(false);
      };
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
      console.error('Error loading gifts:', err);
      setError('Failed to load gifts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.modal, { backgroundColor: theme.background }]}
          >
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]}>Send Gift</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
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
              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={styles.verticalScrollView}
                contentContainerStyle={styles.scrollContent}
                removeClippedSubviews={true}
              >
                <View style={styles.giftGrid}>
                  {showGift && gifts.map((gift) => (
                    <GiftItem key={gift.id} gift={gift} itemSize={itemSize} theme={theme} />
                  ))}
                </View>
              </ScrollView>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '65%',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 0,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    paddingVertical: 12,
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
  verticalScrollView: {
    paddingHorizontal: 15,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  giftItem: {
    alignItems: 'center',
    marginBottom: 15,
  },
  giftImageContainer: {
    width: '90%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    padding: 8,
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