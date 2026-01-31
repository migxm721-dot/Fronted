import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

interface FeedMediaProps {
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | string | null;
  onPress?: () => void;
  url?: string;
  type?: string;
}

const FeedMedia: React.FC<FeedMediaProps> = ({ mediaUrl, mediaType, url, type, onPress }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const videoRef = useRef<Video>(null);

  const finalUrl = mediaUrl || url;
  const finalType = mediaType || type || 'image';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active' && videoRef.current) {
        videoRef.current.pauseAsync();
      }
    });

    return () => {
      subscription.remove();
      if (videoRef.current) {
        videoRef.current.stopAsync();
      }
    };
  }, []);

  if (!finalUrl) {
    return null;
  }

  const isVideo = finalType === 'video' || (typeof finalUrl === 'string' && finalUrl.match(/\.(mp4|mov|avi|wmv)$|video/i));

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!status.isPlaying && status.positionMillis > 0) {
        videoRef.current?.setIsMutedAsync(true);
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {!isVideo ? (
        <Image
          source={{ uri: finalUrl }}
          style={styles.media}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      ) : (
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: finalUrl }}
            style={styles.media}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            shouldPlay={false}
            isMuted={false}
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={() => {
              setError(true);
              setLoading(false);
            }}
          />
        </View>
      )}
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="image-outline" size={40} color="gray" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default FeedMedia;
