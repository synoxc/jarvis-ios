import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@/theme';

/** Barra de entrada de texto + botões de voz. */
export function Composer({
  onSend,
  onMicPress,
  onLivePress,
  onSpeakPress,
  onStopPress,
  busy,
  micActive,
  liveActive,
  speaking,
  disabled,
}: {
  onSend: (text: string) => void;
  onMicPress: () => void;
  onLivePress: () => void;
  onSpeakPress: () => void;
  onStopPress: () => void;
  busy: boolean;
  micActive: boolean;
  liveActive: boolean;
  speaking: boolean;
  disabled: boolean;
}) {
  const [text, setText] = useState('');

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={disabled ? 'Sem ligação ao PC…' : 'Escreve ao JARVIS…'}
          placeholderTextColor={theme.colors.textDim}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="send"
          editable={!disabled}
        />
        <TouchableOpacity
          style={[styles.btn, styles.sendBtn, disabled && styles.btnDisabled]}
          onPress={submit}
          disabled={disabled || !text.trim()}
        >
          <Text style={styles.btnText}>➤</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <ActionBtn
          label={micActive ? 'Parar ditado' : 'Ditado'}
          icon={micActive ? '⏹' : '🎙️'}
          active={micActive}
          onPress={onMicPress}
          disabled={disabled}
        />
        <ActionBtn
          label={liveActive ? 'Parar vivo' : 'Voz ao vivo'}
          icon={liveActive ? '⏹' : '🎤'}
          active={liveActive}
          onPress={onLivePress}
          disabled={disabled}
        />
        <ActionBtn
          label={speaking ? 'Parar' : 'Ouvir'}
          icon={speaking ? '⏹' : '🔊'}
          active={speaking}
          onPress={speaking ? onStopPress : onSpeakPress}
          disabled={disabled}
        />
        {busy ? <ActivityIndicator color={theme.colors.primary} style={{ marginLeft: 'auto' }} /> : null}
      </View>
    </View>
  );
}

function ActionBtn({
  label,
  icon,
  active,
  onPress,
  disabled,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, active && styles.actionBtnActive, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, active && { color: theme.colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 15,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtn: { backgroundColor: theme.colors.primary },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: theme.colors.bg, fontSize: 18, fontWeight: '700' },
  actionRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBtnActive: { borderColor: theme.colors.primary },
  actionIcon: { fontSize: 16, marginRight: 6 },
  actionLabel: { color: theme.colors.textDim, fontSize: 13, fontWeight: '600' },
});
