import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ConnectionStatus } from '@/lib/types';

export function ConnectionPill({ status }: { status: ConnectionStatus }) {
  const map: Record<ConnectionStatus, { color: string; text: string }> = {
    connected: { color: '#34d399', text: 'ONLINE' },
    connecting: { color: '#fbbf24', text: 'A LIGAR...' },
    disconnected: { color: '#64748b', text: 'OFFLINE' },
    error: { color: '#f87171', text: 'ERRO' },
  };
  const { color, text } = map[status] || map.disconnected;

  return (
    <View style={[styles.pill, { borderColor: color + '44' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0e17',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});