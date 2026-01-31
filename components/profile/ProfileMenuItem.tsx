import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

interface ProfileMenuItemProps {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
  showDivider?: boolean;
}

export function ProfileMenuItem({ icon, title, onPress, showDivider = true }: ProfileMenuItemProps) {
  const { theme, isDark } = useThemeCustom();

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: theme.card }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2A2A2A' : theme.border }]}>
          {icon}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </TouchableOpacity>
      {showDivider && <View style={[styles.divider, { backgroundColor: isDark ? '#2A2A2A' : theme.border }]} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    flex: 1,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
});
