import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Dimensions, Pressable, Clipboard, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeCustom } from '@/theme/provider';
import { parseEmojiMessage } from '@/utils/emojiParser';
import { roleColors } from '@/utils/roleColors';
import { cardImages, parseCardTags, hasCardTags } from '@/utils/cardImages';
import { flagImages, parseFlagTags, hasFlagTags } from '@/utils/flagImages';
import { diceImages, parseDiceTags, hasDiceTags } from '@/utils/diceImages';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatMessageProps {
  username: string;
  usernameColor?: string;
  messageColor?: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
  isPresence?: boolean;
  isError?: boolean;
  userType?: 'creator' | 'admin' | 'normal' | 'mentor' | 'merchant' | 'moderator' | 'customer_service' | 'cs';
  isOwnMessage?: boolean;
  messageType?: string;
  type?: string;
  botType?: string;
  hasTopMerchantBadge?: boolean;
  isTop1User?: boolean;
  hasTopLikeReward?: boolean;
  topLikeRewardExpiry?: string;
  hasBackground?: boolean;
  bigEmoji?: boolean;
  hasFlags?: boolean;
  voucherCode?: string;
  voucherCodeColor?: string;
  expiresIn?: number;
}

const BadgeTop1 = () => (
  <Image 
    source={require('@/assets/badge role/bd-top1.png')} 
    style={{ width: 16, height: 16, marginLeft: 4 }}
    resizeMode="contain"
  />
);

const RoleBadge = ({ userType }: { userType?: string }) => {
  const badgeStyle = { width: 20, height: 20, marginHorizontal: 2 };
  
  if (userType === 'admin') {
    return <Image source={require('@/assets/badge role/ic_admin.png')} style={badgeStyle} resizeMode="contain" />;
  }
  if (userType === 'mentor') {
    return <Image source={require('@/assets/badge role/ic_mentor.png')} style={badgeStyle} resizeMode="contain" />;
  }
  if (userType === 'merchant') {
    return <Image source={require('@/assets/badge role/ic_merchant.png')} style={badgeStyle} resizeMode="contain" />;
  }
  if (userType === 'customer_service' || userType === 'cs') {
    return <Image source={require('@/assets/badge role/badge_cs.png')} style={badgeStyle} resizeMode="contain" />;
  }
  return null;
};

const parseImageTags = (message: string): { hasImage: boolean; imageUrl: string | null; textContent: string } => {
  const imgRegex = /\[img\](.*?)\[\/img\]/i;
  const match = message.match(imgRegex);
  if (match) {
    return {
      hasImage: true,
      imageUrl: match[1],
      textContent: message.replace(imgRegex, '').trim()
    };
  }
  return { hasImage: false, imageUrl: null, textContent: message };
};

const VoucherMessage = ({ message, voucherCode, voucherCodeColor, expiresIn, hasBackground }: { 
  message: string; 
  voucherCode?: string; 
  voucherCodeColor?: string; 
  expiresIn?: number;
  hasBackground?: boolean;
}) => {
  const { scaleSize } = useThemeCustom();

  const textShadowStyle = hasBackground ? {
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } : {};

  const codeColor = voucherCodeColor || '#FF8C00';
  const codeMatch = message.match(/\/c (\d+)/i);
  const extractedCode = codeMatch ? codeMatch[1] : (voucherCode || '');
  const displayExpiry = expiresIn || 60;

  return (
    <View style={styles.messageContainer}>
      <Text style={[styles.voucherText, { fontSize: scaleSize(13) }, textShadowStyle]}>
        <Text style={{ color: '#FFD700' }}>🎁 Free! Claim voucher </Text>
        <Text style={{ color: codeColor, fontWeight: 'bold' }}>{extractedCode}</Text>
        <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}> [{displayExpiry}s]</Text>
        <Text style={{ color: '#FFD700' }}> Claim type CMD </Text>
        <Text style={{ color: codeColor, fontWeight: 'bold' }}>/c {extractedCode}</Text>
      </Text>
    </View>
  );
};

const ChatImageMessage = ({ imageUrl, username, usernameColor }: { imageUrl: string; username: string; usernameColor: string }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useThemeCustom();

  return (
    <>
      <View style={styles.imageMessageContainer}>
        <Text style={[styles.username, { color: usernameColor }]}>
          {username}:
        </Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.chatImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.imageModalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </>
  );
};

export const ChatMessage = React.memo(({
  username,
  usernameColor,
  messageColor,
  message,
  timestamp,
  isSystem,
  isNotice,
  isCmd,
  isPresence,
  isError,
  userType,
  isOwnMessage,
  messageType,
  type,
  botType,
  hasTopMerchantBadge,
  isTop1User,
  hasTopLikeReward,
  topLikeRewardExpiry,
  hasBackground,
  bigEmoji,
  hasFlags,
  voucherCode,
  voucherCodeColor,
  expiresIn
}: ChatMessageProps) => {
  
  const { theme, scaleSize, fontSize } = useThemeCustom();
  
  const textShadowStyle = hasBackground ? {
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } : {};
  
  const dynamicStyles = {
    messageWrapper: {
      fontSize: scaleSize(13),
      lineHeight: scaleSize(18),
    },
    username: {
      fontSize: scaleSize(13),
    },
    message: {
      fontSize: scaleSize(13),
    },
    cmdText: {
      fontSize: scaleSize(13),
    },
    errorText: {
      fontSize: scaleSize(13),
    },
    noticeText: {
      fontSize: scaleSize(13),
    },
  };

  const getUsernameColor = () => {
    if (isSystem) return '#FF8C00';
    if (isPresence) return '#FF8C00';
    
    if (type === 'bot' && botType === 'dicebot') return '#64ab41';
    if (type === 'bot' && botType === 'lowcard') return '#719c35';
    if (type === 'bot' && botType === 'flagbot') return '#64ab41';
    
    // Top 1 users in any leaderboard category get pink username color
    if (isTop1User && userType !== 'merchant') {
      return '#ff69b4'; // Pink for Top 1
    }
    
    if (hasTopLikeReward && topLikeRewardExpiry) {
      const expiry = new Date(topLikeRewardExpiry);
      if (expiry > new Date()) {
        if (userType !== 'merchant') {
          return '#ff69b4'; // pink
        }
      }
    }

    if (userType === 'mentor') return roleColors.mentor;
    if (userType === 'merchant') return roleColors.merchant;
    if (userType === 'admin') return roleColors.admin;
    if (userType === 'customer_service' || userType === 'cs') return roleColors.customer_service;
    if (userType === 'moderator') return roleColors.moderator;
    if (userType === 'creator') return roleColors.creator;
    
    if (usernameColor) return usernameColor;
    if (isOwnMessage) return roleColors.own;
    return roleColors.normal;
  };

  const getMessageColor = () => {
    if (messageColor) return messageColor;
    if (type === 'bot' && botType === 'dicebot') return '#4889c7';
    if (type === 'bot' && botType === 'lowcard') return '#347499';
    if (type === 'bot' && botType === 'flagbot') return '#4889c7';
    if (type === 'bot' && botType) return messageColor || '#347499';
    if (isSystem) return theme.text;
    if (isCmd && (message.includes("now is moderator in room") || message.includes("Roll's target has been set to") || message.includes("has been kicked by administrator") || message.includes("has bumped by") || message.includes("has been unbanned by administrator") || message.includes("has banned by administrator"))) {
      return '#000000';
    }
    // For DM messages, return normal theme text color unless specifically set
    if (messageType === 'dm') return theme.text;
    return theme.text;
  };

  const isGift = (messageType === 'gift' || (messageType === 'dm' && (message.toLowerCase().includes('sent a gift') || message.includes('gives a'))));
  const isCommand = isCmd || (message.startsWith('**') && message.endsWith('**')) || (message.startsWith('<<') && message.endsWith('>>')) || messageType === 'cmdMe';

  if (isSystem) {
    const isDarkMode = theme.card === '#1a1a1a' || theme.card === '#000000' || theme.background === '#000000';
    const systemContentColor = isDarkMode ? '#FFFFFF' : theme.text;
    
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.systemText, { fontSize: scaleSize(13) }]}>
          <Text style={{ color: '#FF8C00', fontWeight: 'bold' }}>{username}: </Text>
          <Text style={{ color: systemContentColor }}>{message}</Text>
        </Text>
      </View>
    );
  }

  // Handle gift/command color (brown)
  const isSpecialColor = isCommand || isGift;
  const specialColor = '#A52A2A'; // Brown

  // Handle standard DM messages with username prefix and role color
  if (messageType === 'dm') {
    const { hasImage, imageUrl } = parseImageTags(message);
    if (hasImage && imageUrl) {
      return (
        <ChatImageMessage
          imageUrl={imageUrl}
          username={username}
          usernameColor={getUsernameColor()}
        />
      );
    }

    const handleDMContent = () => {
      // Check if text is defined
      if (!message) return null;
      
      // Handle gift/command color (brown)
      const displayColor = isSpecialColor ? '#87522a' : getMessageColor();
      // Handle [img:url] pattern for gifts/shower
      const giftImgRegex = /\[img:(https?:\/\/.*?)\]/g;
      if (giftImgRegex.test(message)) {
        const parts = message.split(/\[img:https?:\/\/.*?\]/g);
        const matches = message.match(giftImgRegex);
        
        const content = [];
        for (let i = 0; i < parts.length; i++) {
          // Add text part
          if (parts[i]) {
            content.push(<Text key={`gift-text-${i}`} style={[styles.message, dynamicStyles.message, { color: displayColor }, textShadowStyle]}>{parts[i]}</Text>);
          }
          // Add image part
          if (matches && matches[i]) {
            const url = matches[i].replace('[img:', '').replace(']', '');
            content.push(
              <View key={`gift-img-container-${i}`} style={{ width: 30, height: 30, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 }}>
                <Image
                  source={{ uri: url }}
                  style={{ width: 30, height: 30 }}
                  resizeMode="contain"
                />
              </View>
            );
          }
        }
        return content;
      }

      if (hasFlags || hasFlagTags(message)) {
        const { parts } = parseFlagTags(message);
        return parts.map((part, idx) => {
          if (part.type === 'flag' && part.flagKey && flagImages[part.flagKey]) {
            return (
              <Image 
                key={`flag-${idx}`} 
                source={flagImages[part.flagKey]} 
                style={bigEmoji ? styles.bigFlagImage : styles.flagImage}
                resizeMode="contain"
              />
            );
          }
          const parsed = parseEmojiMessage(part.content || '');
          return parsed.map((item) => {
            if (item.type === 'emoji') {
              return (
                <Text key={`emoji-${idx}-${item.key}`}>
                  <Image source={item.src} style={[styles.emojiImage, { width: fontSize, height: fontSize }]} resizeMode="contain" />
                  {' '}
                </Text>
              );
            }
            return (
              <Text key={`text-${idx}-${item.key}`} style={[
                styles.message, dynamicStyles.message, { color: displayColor }, textShadowStyle,
                bigEmoji && styles.bigEmojiText
              ]}>
                {item.content}
              </Text>
            );
          });
        });
      }
      
      const parsedMessage = parseEmojiMessage(message);
      return parsedMessage.map((item) => {
        if (item.type === 'emoji') {
          return (
            <Text key={item.key}>
              <Image source={item.src} style={[styles.emojiImage, { width: fontSize, height: fontSize }]} resizeMode="contain" />
              {' '}
            </Text>
          );
        }
        if (item.type === 'bigEmoji') {
          return (
            <Text key={item.key} style={[styles.bigEmojiText, textShadowStyle]}>
              {item.content}
            </Text>
          );
        }
        return (
          <Text key={item.key} style={[
            styles.message, dynamicStyles.message, { color: displayColor }, textShadowStyle,
            bigEmoji && styles.bigEmojiText
          ]}>
            {item.content}
          </Text>
        );
      });
    };

    return (
      <TouchableOpacity 
        style={styles.messageContainer} 
        onLongPress={() => {
          if (isSystem || isNotice || isPresence || isError) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Clipboard.setString(`${username}: ${message}`);
          Alert.alert('Success', 'Message with username copied to clipboard');
        }}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        <Text style={[styles.messageWrapper, dynamicStyles.messageWrapper]}>
          {!(isSpecialColor || (message.startsWith('**') && message.endsWith('**'))) && (
            <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
              {username}:{' '}
            </Text>
          )}
          {handleDMContent()}
        </Text>
      </TouchableOpacity>
    );
  }

  if (messageType === 'voucher' || type === 'voucher') {
    return (
      <VoucherMessage
        message={message}
        voucherCode={voucherCode}
        voucherCodeColor={voucherCodeColor}
        expiresIn={expiresIn}
        hasBackground={hasBackground}
      />
    );
  }

  // Handle announcement messages with orange color (no username prefix)
  if (messageType === 'announce' || type === 'announce' || messageType === 'announcement' || type === 'announcement') {
    const announceColor = '#FF8C00';
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: announceColor }, textShadowStyle]}>
          {message}
        </Text>
      </View>
    );
  }

  // Handle roll target and roll win messages
  if (messageType === 'rollTarget' || type === 'rollTarget' || messageType === 'rollWin' || type === 'rollWin') {
    const isDarkMode = theme.card === '#1a1a1a' || theme.card === '#000000' || theme.background === '#000000';
    
    const messageTextColor = isDarkMode ? '#FF8C00' : '#c48731';
    // Orange color for admin/cs role username
    const usernameRoleColor = '#FF8C00';
    
    // Parse message to extract username prefix (format: "username: message")
    const colonIndex = message.indexOf(':');
    if (colonIndex > 0) {
      const usernamePrefix = message.substring(0, colonIndex);
      const restOfMessage = message.substring(colonIndex);
      return (
        <View style={styles.messageContainer}>
          <Text style={[styles.cmdText, dynamicStyles.cmdText, textShadowStyle]}>
            <Text style={{ color: usernameRoleColor }}>{usernamePrefix}</Text>
            <Text style={{ color: messageTextColor }}>{restOfMessage}</Text>
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: messageTextColor }, textShadowStyle]}>
          {message}
        </Text>
      </View>
    );
  }

  const isCommandMessage = isCmd || 
    messageType === 'cmd' || 
    messageType === 'cmdMe' || 
    messageType === 'cmdRoll' || 
    messageType === 'cmdGift' ||
    messageType === 'cmdShower' ||
    messageType === 'cmdFollow' ||
    messageType === 'cmdUnfollow' ||
    messageType === 'modPromotion' ||
    messageType === 'modRemoval' ||
    messageType === 'suspend' ||
    messageType === 'unsuspend';

  if (isCommandMessage) {
    let cmdTextColor = '#8B6F47';
    let displayUsername = username;
    let displayMessage = message;

    if (messageType === 'suspend' || messageType === 'unsuspend') {
      cmdTextColor = '#FFFFFF';
      return (
        <View style={styles.messageContainer}>
          <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: cmdTextColor }, textShadowStyle]}>
            {message}
          </Text>
        </View>
      );
    }
    
    if (messageType === 'cmdGift' || messageType === 'cmdShower' || (messageType === 'dm' && (message.includes('[GIFT_IMAGE:') || message.includes('[img:http')))) {
      const giftImageRegex = /\[GIFT_IMAGE:(.*?)\]/;
      const imgTagRegex = /\[img:(https?:\/\/.*?)\]/;
      
      let displayMessage = message;
      let giftImageUrl = '';
      
      const giftMatch = message.match(giftImageRegex);
      const imgMatch = message.match(imgTagRegex);
      
      if (giftMatch) {
        giftImageUrl = giftMatch[1];
        displayMessage = message.replace(giftImageRegex, '');
      } else if (imgMatch) {
        giftImageUrl = imgMatch[1];
        displayMessage = message.replace(imgTagRegex, '');
      }
      
      if (giftImageUrl) {
        const isImageUrl = giftImageUrl.startsWith('http');
        
        // Extract before/after based on where the URL was
        let beforeGift = '';
        let afterGift = '';
        
        if (giftMatch) {
          const splitParts = message.split(giftImageRegex);
          beforeGift = splitParts[0];
          afterGift = splitParts[2] || '';
        } else if (imgMatch) {
          const splitParts = message.split(imgTagRegex);
          beforeGift = splitParts[0];
          afterGift = splitParts[2] || '';
        }
        
        // Check for comment (it starts with " - ")
        let textContent = afterGift;
        let comment = '';
        const dashIndex = afterGift.indexOf(' - ');
        if (dashIndex !== -1) {
          textContent = afterGift.substring(0, dashIndex);
          comment = afterGift.substring(dashIndex);
        } else if (afterGift.includes(' >>')) {
          const endTagIndex = afterGift.indexOf(' >>');
          textContent = afterGift.substring(0, endTagIndex);
        }

        const content = (
          <View style={[styles.messageContainer, styles.giftMessageContainer, messageType === 'dm' && { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }]}>
            {messageType === 'dm' && (
              <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
                {username}:{' '}
              </Text>
            )}
            <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: cmdTextColor || getMessageColor() }, textShadowStyle]}>
              {beforeGift}
            </Text>
            {isImageUrl ? (
              <Image 
                source={{ uri: giftImageUrl }} 
                style={styles.giftImage} 
                resizeMode="contain" 
              />
            ) : (
              <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: cmdTextColor || getMessageColor() }, textShadowStyle]}>
                {giftImageUrl}
              </Text>
            )}
            <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: cmdTextColor || getMessageColor() }, textShadowStyle]}>
              {textContent}
            </Text>
            {comment ? (
              <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: cmdTextColor || getMessageColor(), fontStyle: 'italic' }, textShadowStyle]}>
                {comment}
              </Text>
            ) : null}
          </View>
        );

        if (messageType === 'dm') {
          return (
            <TouchableOpacity 
              style={styles.messageContainer} 
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Clipboard.setString(`${username}: ${message}`);
                Alert.alert('Success', 'Message with username copied to clipboard');
              }}
              delayLongPress={500}
              activeOpacity={0.8}
            >
              {content}
            </TouchableOpacity>
          );
        }
        return content;
      }
    }
    
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: cmdTextColor }, textShadowStyle]}>
          {message}
        </Text>
      </View>
    );
  }

  if (isNotice) {
    return (
      <View style={[styles.noticeContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.noticeText, dynamicStyles.noticeText, { color: theme.primary }]}>{message}</Text>
      </View>
    );
  }

  const { hasImage, imageUrl } = parseImageTags(message);
  if (hasImage && imageUrl) {
    return (
      <ChatImageMessage
        imageUrl={imageUrl}
        username={username}
        usernameColor={getUsernameColor()}
      />
    );
  }

  if (isPresence) {
    const levelMatch = message.match(/^(.+?\s*\[\d+\])(.*)$/);
    const isDarkMode = theme.card === '#1a1a1a' || theme.card === '#000000' || theme.background === '#000000';
    const presenceContentColor = isDarkMode ? '#FFFFFF' : getMessageColor();
    
    if (levelMatch) {
      const beforeBadge = levelMatch[1];
      const afterBadge = levelMatch[2];
      // Extract username and level from "username [level] has entered"
      const usernameMatch = beforeBadge.match(/^(.+?)\s*\[(\d+)\]$/);
      const enteredUsername = usernameMatch ? usernameMatch[1] : beforeBadge;
      const levelPart = usernameMatch ? ` [${usernameMatch[2]}]` : '';
      
      return (
        <View style={styles.presenceRow}>
          <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
            {username}:{' '}
          </Text>
          <Text style={[styles.message, dynamicStyles.message, { color: presenceContentColor }, textShadowStyle]}>
            {enteredUsername}
          </Text>
          {hasTopMerchantBadge && <BadgeTop1 />}
          <RoleBadge userType={userType} />
          <Text style={[styles.message, dynamicStyles.message, { color: presenceContentColor }, textShadowStyle]}>
            {levelPart}{afterBadge}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.presenceRow}>
        <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
          {username}:{' '}
        </Text>
        <Text style={[styles.message, dynamicStyles.message, { color: presenceContentColor }, textShadowStyle]}>
          {message}
        </Text>
        {hasTopMerchantBadge && <BadgeTop1 />}
      </View>
    );
  }

  if (hasCardTags(message)) {
    const parsedCards = parseCardTags(message);
    return (
      <View style={styles.messageContainer}>
        <View style={styles.cardMessageWrapper}>
          <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
            {username}:{' '}
          </Text>
          {parsedCards.map((item) => {
            if (item.type === 'card') {
              const cardImage = cardImages[item.content];
              if (cardImage) {
                return (
                  <Image
                    key={item.key}
                    source={cardImage}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                );
              }
              return <Text key={item.key} style={[styles.message, { color: getMessageColor() }]}>[{item.content}]</Text>;
            }
            return (
              <Text key={item.key} style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>
                {item.content}
              </Text>
            );
          })}
        </View>
      </View>
    );
  }

  if (hasDiceTags(message)) {
    const parsedDice = parseDiceTags(message);
    return (
      <View style={styles.messageContainer}>
        <View style={styles.cardMessageWrapper}>
          <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
            {username}:{' '}
          </Text>
          {parsedDice.map((item) => {
            if (item.type === 'dice') {
              const diceImage = diceImages[item.content];
              if (diceImage) {
                return (
                  <Image
                    key={item.key}
                    source={diceImage}
                    style={styles.diceImage}
                    resizeMode="contain"
                  />
                );
              }
              return <Text key={item.key} style={[styles.message, { color: getMessageColor() }]}>[{item.content}]</Text>;
            }
            return (
              <Text key={item.key} style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>
                {item.content}
              </Text>
            );
          })}
        </View>
      </View>
    );
  }

  if (hasFlags || hasFlagTags(message)) {
    const { parts } = parseFlagTags(message);
    const textParts = parts.filter(p => p.type === 'text' && p.content?.trim());
    const flagParts = parts.filter(p => p.type === 'flag' && p.flagKey && flagImages[p.flagKey]);
    
    return (
      <View style={styles.messageContainer}>
        <View style={styles.flagMessageColumn}>
          <View style={styles.flagTextRow}>
            <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
              {username}:{' '}
            </Text>
            {textParts.map((part, idx) => (
              <Text key={`text-${idx}`} style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>
                {part.content}
              </Text>
            ))}
          </View>
          <View style={styles.flagImagesRow}>
            {flagParts.map((part, idx) => (
              <Image
                key={`flag-${idx}`}
                source={flagImages[part.flagKey!]}
                style={bigEmoji ? styles.bigFlagImage : styles.flagImage}
                resizeMode="contain"
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  const renderMessageContent = (text: string, isBigEmoji: boolean = false, forceFlags: boolean = false) => {
    // Check if text is defined
    if (!text) return null;
    
    // Handle [img:url] pattern for gifts/shower
    const giftImgRegex = /\[img:(https?:\/\/.*?)\]/g;
    if (giftImgRegex.test(text)) {
      const parts = text.split(/\[img:https?:\/\/.*?\]/g);
      const matches = text.match(giftImgRegex);
      
      const content = [];
      for (let i = 0; i < parts.length; i++) {
        // Add text part
        if (parts[i]) {
          content.push(<Text key={`gift-text-${i}`} style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>{parts[i]}</Text>);
        }
        // Add image part
        if (matches && matches[i]) {
          const url = matches[i].replace('[img:', '').replace(']', '');
          content.push(
            <View key={`gift-img-container-${i}`} style={{ width: 30, height: 30, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 }}>
              <Image
                source={{ uri: url }}
                style={{ width: 30, height: 30 }}
                resizeMode="contain"
              />
            </View>
          );
        }
      }
      return content;
    }

    if (forceFlags || hasFlagTags(text)) {
      const { parts } = parseFlagTags(text);
      return parts.map((part, idx) => {
        if (part.type === 'flag' && part.flagKey && flagImages[part.flagKey]) {
          return (
            <Image 
              key={`flag-${idx}`} 
              source={flagImages[part.flagKey]} 
              style={isBigEmoji ? styles.bigFlagImage : styles.flagImage}
              resizeMode="contain"
            />
          );
        }
        const parsed = parseEmojiMessage(part.content || '');
        return parsed.map((item) => {
          if (item.type === 'emoji') {
            return (
              <Text key={`emoji-${idx}-${item.key}`}>
                <Image source={item.src} style={[styles.emojiImage, { width: fontSize, height: fontSize }]} resizeMode="contain" />
                {' '}
              </Text>
            );
          }
          return (
            <Text key={`text-${idx}-${item.key}`} style={[
              styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle,
              isBigEmoji && styles.bigEmojiText
            ]}>
              {item.content}
            </Text>
          );
        });
      });
    }
    
    const parsedMessage = parseEmojiMessage(text);
    return parsedMessage.map((item) => {
      if (item.type === 'emoji') {
        return (
          <Text key={item.key}>
            <Image source={item.src} style={[styles.emojiImage, { width: fontSize, height: fontSize }]} resizeMode="contain" />
            {' '}
          </Text>
        );
      }
      if (item.type === 'bigEmoji') {
        return (
          <Text key={item.key} style={[styles.bigEmojiText, textShadowStyle]}>
            {item.content}
          </Text>
        );
      }
      return (
        <Text key={item.key} style={[
          styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle,
          isBigEmoji && styles.bigEmojiText
        ]}>
          {item.content}
        </Text>
      );
    });
  };

  const handleLongPress = () => {
    if (isSystem || isNotice || isPresence || isError) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Clipboard.setString(`${username}: ${message}`);
    Alert.alert('Success', 'Message with username copied to clipboard');
  };

  return (
    <TouchableOpacity 
      style={styles.messageContainer} 
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <Text style={[styles.messageWrapper, dynamicStyles.messageWrapper]}>
        {username ? (
          <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
            {username}:{' '}
          </Text>
        ) : null}
        {renderMessageContent(message, bigEmoji, hasFlags)}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  messageContainer: {
    paddingVertical: 1,
    paddingHorizontal: 12,
    marginRight: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 1,
    paddingHorizontal: 12,
    marginRight: 1,
  },
  messageWrapper: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 13,
  },
  emojiImage: {
    width: 18,
    height: 18,
    transform: [{ translateY: 3 }],
    marginRight: 2,
  },
  bigEmojiText: {
    fontSize: 28,
    lineHeight: 36,
  },
  flagImage: {
    width: 24,
    height: 18,
    marginHorizontal: 2,
    marginBottom: -5,
  },
  giftImage: {
    width: 30,
    height: 30,
    marginHorizontal: 4,
  },
  bigFlagImage: {
    width: 30,
    height: 32,
    marginHorizontal: 4,
    marginVertical: 8,
  },
  noticeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  noticeText: {
    fontSize: 13,
    textAlign: 'center',
  },
  cmdText: {
    color: '#C96F4A',
    fontStyle: 'italic',
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorText: {
    color: '#FF3333',
    fontWeight: 'bold',
    fontSize: 13,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 1,
  },
  imageMessageContainer: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 1,
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginTop: 4,
    backgroundColor: '#333',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  giftMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardMessageWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  flagMessageWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  flagMessageColumn: {
    flexDirection: 'column',
  },
  flagTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  flagImagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    marginLeft: 4,
  },
  cardImage: {
    width: 18,
    height: 24,
    marginHorizontal: 2,
  },
  diceImage: {
    width: 20,
    height: 20,
    marginHorizontal: 1,
  },
  voucherText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
