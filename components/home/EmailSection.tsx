
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path, Rect } from 'react-native-svg';

const EmailIcon = ({ size = 20, color = '#4A90E2' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M3 7l9 6 9-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export function EmailSection() {
  const { theme } = useThemeCustom();
  
  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
      <EmailIcon color={theme.primary} />
      <Text style={[styles.text, { color: theme.text }]}>Email (0)</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
