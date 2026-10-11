import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '@/theme';

interface AssistantOrbProps {
  state: 'active' | 'sleeping' | 'processing';
  mode: string;
}

/**
 * HUD do JARVIS estilo Dynamic Island (In-App).
 * Visualizador responsivo com pulsacao de neon e barras de frequencia animadas.
 */
export function AssistantOrb({ state, mode }: AssistantOrbProps) {
  const isSpeaking = mode === 'speaking';
  const isListening = mode === 'dictating' || mode === 'live-audio';
  const isProcessing = state === 'processing';
  const isActive = state === 'active' || isSpeaking || isListening || isProcessing;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bar1 = useRef(new Animated.Value(6)).current;
  const bar2 = useRef(new Animated.Value(14)).current;
  const bar3 = useRef(new Animated.Value(8)).current;
  const bar4 = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (isSpeaking || isProcessing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSpeaking, isProcessing, pulseAnim]);

  useEffect(() => {
    if (isSpeaking) {
      const anims = [
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar1, { toValue: 18, duration: 250, useNativeDriver: false }),
            Animated.timing(bar1, { toValue: 4, duration: 250, useNativeDriver: false }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar2, { toValue: 6, duration: 320, useNativeDriver: false }),
            Animated.timing(bar2, { toValue: 22, duration: 320, useNativeDriver: false }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar3, { toValue: 20, duration: 280, useNativeDriver: false }),
            Animated.timing(bar3, { toValue: 5, duration: 280, useNativeDriver: false }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar4, { toValue: 8, duration: 350, useNativeDriver: false }),
            Animated.timing(bar4, { toValue: 19, duration: 350, useNativeDriver: false }),
          ]),
        ),
      ];
      anims.forEach((a) => a.start());
      return () => anims.forEach((a) => a.stop());
    } else {
      bar1.setValue(4);
      bar2.setValue(8);
      bar3.setValue(4);
      bar4.setValue(6);
    }
  }, [isSpeaking, bar1, bar2, bar3, bar4]);

  const stateColor = isSpeaking
    ? '#22d3ee'
    : isProcessing
      ? '#fbbf24'
      : isListening
        ? '#34d399'
        : isActive
          ? '#22d3ee'
          : '#475569';

  const statusLabel = isSpeaking
    ? 'A FALAR...'
    : isProcessing
      ? 'A PENSAR...'
      : isListening
        ? 'A OUVIR...'
        : isActive
          ? 'ONLINE'
          : 'STANDBY';

  return (
    <View style={styles.container}>
      {/* Dynamic Island In-App Capsule */}
      <View style={[styles.capsule, { borderColor: stateColor + '55' }]}>
        {/* Core Reactor Indicator */}
        <Animated.View
          style={[
            styles.core,
            {
              backgroundColor: stateColor,
              shadowColor: stateColor,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.coreInner} />
        </Animated.View>

        {/* State Label */}
        <View style={styles.textWrap}>
          <Text style={[styles.statusText, { color: stateColor }]}>
            {statusLabel}
          </Text>
          <Text style={styles.subText}>MARK LV NEURAL LINK</Text>
        </View>

        {/* Audio Wave Bars */}
        <View style={styles.waveWrap}>
          <Animated.View style={[styles.bar, { height: bar1, backgroundColor: stateColor }]} />
          <Animated.View style={[styles.bar, { height: bar2, backgroundColor: stateColor }]} />
          <Animated.View style={[styles.bar, { height: bar3, backgroundColor: stateColor }]} />
          <Animated.View style={[styles.bar, { height: bar4, backgroundColor: stateColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0e17',
    borderWidth: 1.5,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  core: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  coreInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  textWrap: {
    flex: 1,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: theme.font.mono,
  },
  subText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  waveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingRight: 4,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
  },
});