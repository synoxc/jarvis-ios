import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { theme, stateColor, stateLabel } from '@/theme';
import type { ConnectionStatus } from '@/lib/types';
import type { AvatarState } from './JarvisAvatar';

interface DynamicBarProps {
  status: ConnectionStatus;
  state: AvatarState;
  /** Toca para religar quando não está online. */
  onPress?: () => void;
}

const STATUS_MAP: Record<ConnectionStatus, { color: string; text: string }> = {
  connected: { color: theme.colors.success, text: 'ONLINE' },
  connecting: { color: theme.colors.warning, text: 'A LIGAR…' },
  disconnected: { color: theme.colors.textFaint, text: 'OFFLINE' },
  error: { color: theme.colors.danger, text: 'ERRO' },
};

/**
 * Barra superior estilo Dynamic Island (in-app).
 *
 * Cápsula preta flutuante com indicador de estado pulsante, rótulo do
 * assistente, visualizador de ondas animado e estado da ligação.
 */
export function DynamicBar({ status, state, onPress }: DynamicBarProps) {
  const color = stateColor(state);
  const label = stateLabel(state);
  const active = state === 'listening' || state === 'speaking' || state === 'processing';
  const conn = STATUS_MAP[status];

  const pulse = useRef(new Animated.Value(1)).current;
  const bar1 = useRef(new Animated.Value(4)).current;
  const bar2 = useRef(new Animated.Value(9)).current;
  const bar3 = useRef(new Animated.Value(6)).current;
  const bar4 = useRef(new Animated.Value(11)).current;

  useEffect(() => {
    if (!active) {
      pulse.setValue(1);
      bar1.setValue(4);
      bar2.setValue(4);
      bar3.setValue(4);
      bar4.setValue(4);
      return;
    }
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    const mk = (v: Animated.Value, hi: number, dur: number, lo = 3) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: hi, duration: dur, useNativeDriver: false }),
          Animated.timing(v, { toValue: lo, duration: dur, useNativeDriver: false }),
        ]),
      );
    const loops = [
      mk(bar1, 10, 260),
      mk(bar2, 17, 340),
      mk(bar3, 13, 290),
      mk(bar4, 19, 380),
    ];
    pulseLoop.start();
    loops.forEach((l) => l.start());
    return () => {
      pulseLoop.stop();
      loops.forEach((l) => l.stop());
    };
  }, [active, pulse, bar1, bar2, bar3, bar4]);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.pill, { borderColor: color + '66' }]}
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={`JARVIS: ${label}. Ligação: ${conn.text}`}
      >
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: color, shadowColor: color, transform: [{ scale: pulse }] },
          ]}
        />
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>

        <View style={styles.bars}>
          <Animated.View style={[styles.bar, { height: bar1, backgroundColor: color }]} />
          <Animated.View style={[styles.bar, { height: bar2, backgroundColor: color }]} />
          <Animated.View style={[styles.bar, { height: bar3, backgroundColor: color }]} />
          <Animated.View style={[styles.bar, { height: bar4, backgroundColor: color }]} />
        </View>

        <View style={[styles.sep, { backgroundColor: conn.color + '44' }]} />
        <View style={[styles.connDot, { backgroundColor: conn.color, shadowColor: conn.color }]} />
        <Text style={[styles.connText, { color: conn.color }]}>{conn.text}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    maxWidth: 420,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginLeft: 8,
    flexShrink: 1,
    fontFamily: theme.font.mono,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
    marginLeft: 10,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  sep: {
    flex: 1,
    height: 1,
    marginHorizontal: 10,
    minWidth: 8,
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  connText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: 5,
  },
});