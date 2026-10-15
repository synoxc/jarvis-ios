import React from 'react';
import { VStack, Text, Spacer } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import {
  createLiveActivity,
  type LiveActivityComponent,
  type LiveActivityEnvironment,
} from 'expo-widgets';
import type { JARVISAttributes } from './types';

/**
 * Identidade visual do JARVIS aplicada ao Dynamic Island.
 *
 * Se o repositório não tiver asset do avatar, usamos o "J" de cor ciano
 * (primary) — padrão de palavra-chave. Substituir por `Image` com o
 * asset original na pasta `assets` quando disponível.
 */
export const JARVIS_LABEL = 'J';
export const JARVIS_ACCENT = '#22d3ee';
export const JARVIS_DARK = '#0e1219';
export const JARVIS_WHITE = '#e6edf3';

/** Cor de destaque por estado — mantém a identidade ciano do JARVIS. */
const STATE_COLORS: Record<string, string> = {
  inactive: '#8b9ab1',
  connecting: '#fbbf24',
  listening: '#34d399',
  processing: '#fbbf24',
  speaking: '#38bdf8',
  error: '#fb7185',
};

/**
 * Componente do Live Activity (Dynamic Island).
 *
 * Marcado com o `'widget'` directive: o corpo é renderizado num runtime
 * isolado do WidgetKit (nenhum hook, nenhum estado da app, sem acesso ao
 * WebSocket). As props são `JARVISAttributes` atualizadas via
 * `LiveActivity.update(...)` no `JarvisLiveActivityManager`.
 */
export const JarvisLiveActivityComponent: LiveActivityComponent<JARVISAttributes> = (
  props,
  _env,
) => {
  'widget';

  const state = props?.state ?? 'inactive';
  const stateLabel = props?.stateLabel ?? 'Inactivo';
  const summary = props?.summary ?? 'JARVIS em espera';
  const modeLabel = props?.modeLabel ?? 'idle';
  const accent = STATE_COLORS[state] ?? JARVIS_ACCENT;

  return {
    // Banner principal (Notification Center) — required pelo LiveActivityLayout.
    banner: (
      <VStack spacing={3}>
        <Text modifiers={[font({ size: 30 }), foregroundStyle(accent)]}>
          {JARVIS_LABEL}
        </Text>
        <Text modifiers={[font({ size: 14 })]}>{stateLabel}</Text>
        <Text modifiers={[font({ size: 12 })]}>{summary}</Text>
      </VStack>
    ),
    // Banner pequeno (CarPlay / watchOS; faz fallback para `banner`).
    bannerSmall: (
      <Text modifiers={[font({ size: 12 }), foregroundStyle(accent)]}>{stateLabel}</Text>
    ),

    // Compact form (Dynamic Island fechada): leading + trailing.
    compactLeading: (
      <Text modifiers={[font({ size: 20 }), foregroundStyle(accent)]}>
        {JARVIS_LABEL}
      </Text>
    ),
    compactTrailing: (
      <Text modifiers={[font({ size: 11 }), foregroundStyle(accent)]}>{stateLabel}</Text>
    ),

    // Formato expandido (top e bottom da Dynamic Island)
    expandedCenter: (
      <VStack spacing={3}>
        <Text modifiers={[font({ size: 30 }), foregroundStyle(accent)]}>{JARVIS_LABEL}</Text>
        <Text modifiers={[font({ size: 14 }), foregroundStyle(accent)]}>{stateLabel}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 })]}>{summary}</Text>
      </VStack>
    ),
    expandedLeading: (
      <VStack spacing={2}>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(accent)]}>{stateLabel}</Text>
        <Text modifiers={[font({ size: 11 })]}>{summary}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <Text modifiers={[font({ size: 12 }), foregroundStyle(accent)]}>{modeLabel}</Text>
    ),
    expandedBottom: (
      <Text modifiers={[font({ size: 12 })]}>{modeLabel}</Text>
    ),

    // Minimal (Lock Screen, forma mais compacta)
    minimal: (
      <VStack spacing={2}>
        <Text modifiers={[font({ size: 12 })]}>{stateLabel}</Text>
        <Text modifiers={[font({ size: 10 })]}>{summary}</Text>
      </VStack>
    ),
  };
};

/** Factory registrada no app config com `name: "JarvisLiveActivity"`. */
export const JarvisLiveActivityFactory = createLiveActivity(
  'JarvisLiveActivity',
  JarvisLiveActivityComponent,
);
