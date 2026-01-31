
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

interface VoteKickButtonProps {
  target: string;
  remainingVotes: number;
  remainingSeconds: number;
  hasVoted: boolean;
  onVote: () => void;
}

export function VoteKickButton({ target, remainingVotes, remainingSeconds, hasVoted, onVote }: VoteKickButtonProps) {
  const { theme } = useThemeCustom();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: hasVoted ? theme.secondary : '#EF4444' }
        ]}
        onPress={onVote}
        disabled={hasVoted}
      >
        <Text style={styles.buttonText}>
          {hasVoted ? 'Voted' : `Vote Kick ${target}`}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.info, { color: theme.text }]}>
        {remainingVotes} more votes needed. {remainingSeconds}s remaining.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
});
