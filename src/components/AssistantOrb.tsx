import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '@/theme';

/** Indicador de estado circular do assistente (Escutar/Processar/Responder). */
export function AssistantOrb({
  state,
  mode,
}: {
  state: 'active' | 'sleeping' | 'processing';
  mode: string;
}) {
  const active = state !== 'sleeping' || mode !== 'idle';
  const color =
    mode === 'dictating' || mode === 'live-audio'
      ? theme.colors.primary
      : mode === 'speaking'
        ? theme.colors.success
        : active
          ? theme.colors.primary
          : theme.colors.textDim;

  return (
    <View style={styles.wrap}>
      <View style={[styles.outer, { borderColor: color }]}>
        <View style={[styles.inner, { backgroundColor: color }]}>
          {mode === 'dictating' || mode === 'live-audio' ? (
            <Text style={styles.icon}>🎤</Text>
          ) : mode === 'speaking' ? (
            <Text style={styles.icon}>🔊</Text>
          ) : active ? (
            <ActivityIndicator color={theme.colors.bg} />
          ) : (
            <Text style={styles.icon}>💤</Text>
          )}
        </View>
      </View>
      <Text style={[styles.label, { color }]}>{labelFor(state, mode)}</Text>
    </View>
  );
}

function labelFor(state: string, mode: string): string {
  if (mode === 'dictating') return 'A ouvir…';
  if (mode === 'live-audio') return 'Voz ao vivo…';
  if (mode === 'speaking') return 'A responder…';
  if (state === 'processing') return 'A processar…';
  if (state === 'active') return 'Ativo';
  return 'Em espera';
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  outer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 40 },
  label: { marginTop: 12, fontSize: 15, fontWeight: '600' },
});
