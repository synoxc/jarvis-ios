import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import type { ConnectionStatus } from '@/lib/types';

/** Pill de estado da ligação ao PC. */
export function ConnectionPill({ status }: { status: ConnectionStatus }) {
  const map: Record<ConnectionStatus, { color: string; text: string }> = {
    connected: { color: theme.colors.success, text: 'Ligado ao PC' },
    connecting: { color: theme.colors.warning, text: 'A ligar…' },
    disconnected: { color: theme.colors.textDim, text: 'Desligado' },
    error: { color: theme.colors.danger, text: 'Erro de ligação' },
  };
  const { color, text } = map[status];
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
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
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '600' },
});
