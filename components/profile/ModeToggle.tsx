import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeCustom } from '@/theme/provider';

const MoonIcon = ({ size = 24, color = "#4A90E2" }: { size?: number; color?: string }) => {
  try {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path 
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" 
          fill={color} 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </Svg>
    );
  } catch (e) {
    return <Text style={{ fontSize: 18 }}>🌙</Text>;
  }
};

export function ModeToggle() {
  const { theme, isDark, toggleTheme } = useThemeCustom();

  return (
    <View>
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: theme.card }]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#3E3E3E' : '#E8E8E8' }]}>
          <MoonIcon size={24} color={isDark ? '#FFD700' : '#4A90E2'} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Dark Mode</Text>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isDark ? '#f5dd4b' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </TouchableOpacity>
      <View style={[styles.divider, { backgroundColor: isDark ? '#3E3E3E' : '#E8E8E8' }]} />
    </View>
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
