import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/theme';
import type { ConnectionStatus } from '@/lib/types';

/**
 * Pill de ligação ao PC — toque para religar.
 * Estados: ONLINE / A LIGAR… / OFFLINE / ERRO.
 */
export function ConnectionPill({
  status,
  onPress,
}: {
  status: ConnectionStatus;
  onPress?: () => void;
}) {
  const map: Record<ConnectionStatus, { color: string; text: string }> = {
    connected: { color: theme.colors.success, text: 'ONLINE' },
    connecting: { color: theme.colors.warning, text: 'A LIGAR…' },
    disconnected: { color: theme.colors.textFaint, text: 'OFFLINE' },
    error: { color: theme.colors.danger, text: 'ERRO' },
  };
  const { color, text } = map[status] || map.disconnected;

  const pillStyle = [styles.pill, { borderColor: color + '55', backgroundColor: color + '14' }];
  const inner = (
    <>
      <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={pillStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Estado da ligação: ${text}. Toca para religar.`}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={pillStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});