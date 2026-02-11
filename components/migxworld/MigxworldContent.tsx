import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/utils/api';

interface Celebrity {
  id: number;
  username: string;
  name: string;
  description: string;
  avatarUrl: string;
  total_comments: number;
}

interface TrendingFeed {
  id: string;
  username: string;
  content: string;
  avatarUrl: string;
  likes_count: number;
  userId: number;
}

export function MigxworldContent() {
  const { theme, isDark } = useThemeCustom();
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [trending, setTrending] = useState<TrendingFeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [celebritiesRes, trendingRes] = await Promise.all([
        fetch(API_ENDPOINTS.FEED.CELEBRITIES, { headers }),
        fetch(API_ENDPOINTS.FEED.TRENDING, { headers }),
      ]);

      const celebritiesData = await celebritiesRes.json();
      const trendingData = await trendingRes.json();

      if (celebritiesData.success) {
        setCelebrities(celebritiesData.celebrities || []);
      }
      if (trendingData.success) {
        setTrending(trendingData.trending || []);
      }
    } catch (error) {
      console.error('Error fetching migxworld data:', error);
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ title, onPress }: { title: string; onPress?: () => void }) => (
    <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
      <Text style={[styles.sectionTitle, { color: '#8d9094' }]}>{title}</Text>
      <ChevronRight size={20} color="#0a5229" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a5229" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#d3d9de' }]}>
      <View style={[styles.header, { backgroundColor: '#08361c' }]}>
        <Text style={[styles.headerText, { color: '#ffffff' }]}>Migxworld</Text>
      </View>

      <SectionHeader title="Celebrities" />
      {celebrities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No celebrities yet</Text>
        </View>
      ) : (
        celebrities.map((item, index) => (
          <TouchableOpacity key={`celeb-${item.id}-${index}`} style={[styles.itemContainer, { backgroundColor: isDark ? '#2a2a2a' : '#ffffff' }]}>
            <Image source={{ uri: item.avatarUrl || 'https://via.placeholder.com/40' }} style={styles.avatar} />
            <View style={styles.textContainer}>
              <Text style={[styles.name, { color: '#3b8058' }]}>{item.name || item.username}</Text>
              <Text style={[styles.description, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={3}>
                {item.description || `Popular user with ${item.total_comments} comments`}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <View style={styles.divider} />

      <SectionHeader title="Trending Members" />
      {trending.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trending feeds yet</Text>
        </View>
      ) : (
        trending.map((item, index) => (
          <TouchableOpacity key={`trend-${item.id}-${index}`} style={[styles.itemContainer, { backgroundColor: isDark ? '#2a2a2a' : '#ffffff' }]}>
            <Image source={{ uri: item.avatarUrl || 'https://via.placeholder.com/60' }} style={styles.avatar} />
            <View style={styles.textContainer}>
              <Text style={[styles.name, { color: '#3b8058' }]}>{item.username}</Text>
              <Text style={[styles.handle, { color: isDark ? '#888' : '#999' }]}>@{item.username?.toUpperCase()}</Text>
              <Text style={[styles.content, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
                {item.content || 'Posted a feed'}
              </Text>
              <Text style={[styles.likes, { color: '#0a5229' }]}>{item.likes_count} likes</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#113b23',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0a4528',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0a5229',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ddd',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  handle: {
    fontSize: 13,
  },
  content: {
    fontSize: 12,
    marginTop: 4,
  },
  likes: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    height: 8,
    backgroundColor: '#0a5229',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
});
