import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { UserProfileIcon, BlockIcon, GiftIcon, TrashIcon, CloseXIcon } from '@/components/ui/SvgIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrivateChatMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onBlockUser: () => void;
  onSendGift: () => void;
  onClearChat: () => void;
  onCloseChat: () => void;
  username?: string;
}

export function PrivateChatMenuModal({
  visible,
  onClose,
  onViewProfile,
  onBlockUser,
  onSendGift,
  onClearChat,
  onCloseChat,
  username,
}: PrivateChatMenuModalProps) {
  const { theme } = useThemeCustom();

  const menuItems = [
    { label: 'View Profile', onPress: onViewProfile, Icon: UserProfileIcon, color: theme.text },
    { label: 'Block User', onPress: onBlockUser, Icon: BlockIcon, color: '#FF4444', danger: true },
    { label: 'Send Gift', onPress: onSendGift, Icon: GiftIcon, color: theme.text },
    { label: 'Clear Chat', onPress: onClearChat, Icon: TrashIcon, color: theme.text },
    { label: 'Close Chat', onPress: onCloseChat, Icon: CloseXIcon, color: theme.text },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
              {username && (
                <View style={styles.header}>
                  <Text style={styles.headerText}>
                    {username}
                  </Text>
                </View>
              )}
              
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                  onPress={() => {
                    item.onPress();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconContainer}>
                    <item.Icon color={item.color} size={20} />
                  </View>
                  <Text
                    style={[
                      styles.menuText,
                      { color: item.danger ? '#FF4444' : theme.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 12,
  },
  menuContainer: {
    width: SCREEN_WIDTH * 0.55,
    maxWidth: 220,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#0a5229',
  },
  headerText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
  },
  menuText: {
    fontSize: 15,
  },
});
