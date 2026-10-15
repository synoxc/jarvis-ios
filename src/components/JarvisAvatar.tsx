import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, stateColor, stateLabel } from '@/theme';

/** Avatar do JARVIS — halo, núcleo com olhos, anel orbital e ondas. */
export type AvatarState =
  | 'offline'
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

interface JarvisAvatarProps {
  state: AvatarState;
  size?: number;
  showLabel?: boolean;
}

export function JarvisAvatar({ state, size = 160, showLabel = true }: JarvisAvatarProps) {
  const color = stateColor(state);
  const label = stateLabel(state);

  const breathe = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const waveA = useRef(new Animated.Value(0)).current;
  const waveB = useRef(new Animated.Value(0)).current;
  const waveC = useRef(new Animated.Value(0)).current;
  const eyeGlow = useRef(new Animated.Value(0.6)).current;

  // "Respiração" — ritmo conforme o estado.
  useEffect(() => {
    if (state === 'offline') {
      breathe.setValue(0);
      return;
    }
    const speed =
      state === 'processing' ? 900 : state === 'listening' ? 1400 : state === 'speaking' ? 800 : 2600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(breathe, { toValue: 0, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, breathe]);

  // Órbita do anel — rota constante (parada no offline).
  useEffect(() => {
    if (state === 'offline') {
      orbit.setValue(0);
      return;
    }
    const dur = state === 'processing' ? 2600 : state === 'speaking' ? 3400 : 9000;
    const loop = Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: dur, useNativeDriver: true, easing: Easing.linear }),
    );
    loop.start();
    return () => loop.stop();
  }, [state, orbit]);

  // Ondas sonoras — só a ouvir/falar, fases distintas.
  useEffect(() => {
    const active = state === 'listening' || state === 'speaking';
    if (!active) {
      waveA.setValue(0);
      waveB.setValue(0);
      waveC.setValue(0);
      return;
    }
    const mk = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 620, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const loops = [mk(waveA, 0), mk(waveB, 200), mk(waveC, 400)];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [state, waveA, waveB, waveC]);

  // Pulso dos "olhos".
  useEffect(() => {
    if (state === 'offline') {
      eyeGlow.setValue(0.25);
      return;
    }
    const speed = state === 'speaking' ? 380 : state === 'listening' ? 900 : 2200;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(eyeGlow, { toValue: 1, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(eyeGlow, { toValue: 0.45, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, eyeGlow]);

  const haloScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const coreScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const orbitSpin = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const waveStyle = (val: Animated.Value) => ({
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.35] }) }],
  });

  const core = size * 0.52;
  const halo = size;
  const grad =
    state === 'listening'
      ? theme.gradient.orbListening
      : state === 'processing'
        ? theme.gradient.orbProcessing
        : state === 'speaking'
          ? theme.gradient.orbSpeaking
          : state === 'error'
            ? theme.gradient.orbError
            : theme.gradient.orbIdle;

  return (
    <View style={[styles.wrap, { width: size, height: size + (showLabel ? 30 : 0) }]}>
      {/* Halo de energia */}
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { width: halo, height: halo, borderRadius: halo / 2, opacity: state === 'offline' ? 0.3 : 1, transform: [{ scale: haloScale }] }]}
      >
        <LinearGradient colors={[...grad] as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Ondas sonoras */}
      {(state === 'listening' || state === 'speaking') && (
        <>
          <Animated.View pointerEvents="none" style={[styles.wave, { width: core + 26, height: core + 26, borderRadius: (core + 26) / 2, borderColor: color }, waveStyle(waveA)]} />
          <Animated.View pointerEvents="none" style={[styles.wave, { width: core + 26, height: core + 26, borderRadius: (core + 26) / 2, borderColor: color }, waveStyle(waveB)]} />
          <Animated.View pointerEvents="none" style={[styles.wave, { width: core + 26, height: core + 26, borderRadius: (core + 26) / 2, borderColor: color }, waveStyle(waveC)]} />
        </>
      )}

      {/* Anel orbital com satélite */}
      <Animated.View
        pointerEvents="none"
        style={[styles.orbit, { width: core + 18, height: core + 18, borderRadius: (core + 18) / 2, transform: [{ rotate: orbitSpin }] }]}
      >
        <View style={[styles.satellite, { backgroundColor: color, shadowColor: color, opacity: state === 'offline' ? 0.35 : 1 }]} />
      </Animated.View>

      {/* Núcleo de energia com olhos */}
      <Animated.View
        style={[styles.core, { width: core, height: core, borderRadius: core / 2, backgroundColor: theme.colors.bgAlt, borderColor: color, shadowColor: color, transform: [{ scale: coreScale }], opacity: state === 'offline' ? 0.6 : 1 }]}
      >
        <Animated.View style={[styles.eye, { backgroundColor: color, shadowColor: color, opacity: eyeGlow }]} />
        <Animated.View style={[styles.eye, { backgroundColor: color, shadowColor: color, opacity: eyeGlow }]} />
        <View style={[styles.coreDot, { backgroundColor: color, shadowColor: color }]} />
      </Animated.View>

      {showLabel ? (
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', top: 0 },
  wave: { position: 'absolute', borderWidth: 1.5 },
  orbit: { position: 'absolute', alignItems: 'flex-start', justifyContent: 'center' },
  satellite: { width: 7, height: 7, borderRadius: 4, marginTop: -3.5, shadowOpacity: 0.9, shadowRadius: 6 },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOpacity: 0.8,
    shadowRadius: 22,
    elevation: 12,
  },
  eye: { width: 26, height: 5, borderRadius: 3, marginVertical: 4, shadowOpacity: 0.9, shadowRadius: 5 },
  coreDot: { width: 10, height: 10, borderRadius: 5, marginTop: 8, shadowOpacity: 0.9, shadowRadius: 6 },
  label: { position: 'absolute', bottom: -26, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
});