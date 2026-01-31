import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInput as TextInputType,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path } from 'react-native-svg';
import { EmojiPicker } from './EmojiPicker';
import * as ImagePicker from 'expo-image-picker';
import API_BASE_URL from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrivateChatInputProps {
  onSend: (message: string) => void;
  onImageSend?: (imageUrl: string) => void;
  onEmojiPress?: () => void;
  emojiPickerVisible?: boolean;
  emojiPickerHeight?: number;
}

export interface PrivateChatInputRef {
  insertEmoji: (code: string) => void;
}

const EmojiIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth="2" />
    <Path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const SendIcon = ({ size = 22, color = '#8B5CF6' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ImageIcon = ({ size = 22, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
      stroke={color}
      strokeWidth="2"
    />
    <Path
      d="M21 15l-5-5L5 21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PrivateChatInput = forwardRef<PrivateChatInputRef, PrivateChatInputProps>(({ 
  onSend,
  onImageSend,
  onEmojiPress,
  emojiPickerVisible = false,
  emojiPickerHeight = 0,
}, ref) => {
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(42);
  const [uploading, setUploading] = useState(false);
  const { theme, scaleSize } = useThemeCustom();
  const textInputRef = useRef<TextInputType>(null);

  useImperativeHandle(ref, () => ({
    insertEmoji: (code: string) => {
      setMessage((prev) => prev + code);
      textInputRef.current?.focus();
    },
  }));

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
      setInputHeight(42);
    }
  };

  const handleContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const newHeight = Math.max(42, Math.min(e.nativeEvent.contentSize.height, 100));
    setInputHeight(newHeight);
  };

  const handleImagePick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];
        
        const formData = new FormData();
        formData.append('image', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'chat_image.jpg',
        } as any);

        const token = await AsyncStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/api/upload/chat-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await response.json();
        if (data.success && data.imageUrl) {
          if (onImageSend) {
            onImageSend(data.imageUrl);
          }
        } else {
          Alert.alert('Error', 'Failed to upload image');
        }
        setUploading(false);
      }
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Error', 'Failed to pick image');
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={onEmojiPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <EmojiIcon size={22} color={theme.secondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.iconButton}
          onPress={handleImagePick}
          disabled={uploading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={theme.secondary} />
          ) : (
            <ImageIcon size={22} color={theme.secondary} />
          )}
        </TouchableOpacity>

        <TextInput
          ref={textInputRef}
          style={[
            styles.input,
            { 
              color: theme.text,
              height: inputHeight,
              fontSize: scaleSize(15),
            }
          ]}
          placeholder="Type a message..."
          placeholderTextColor={theme.secondary}
          value={message}
          onChangeText={setMessage}
          multiline
          scrollEnabled={false}
          onContentSizeChange={handleContentSizeChange}
        />

        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!message.trim()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SendIcon size={22} color={message.trim() ? '#8B5CF6' : '#CCC'} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 40 : 14,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 12,
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
});
