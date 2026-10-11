import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { theme } from '@/theme';

const QUICK_ACTIONS = [
  'Que horas são?',
  'Como está o tempo?',
  'Conta uma piada',
  'Abre o bloco de notas',
  'Quem és tu?',
];

export function Composer({
  onSend,
  onCameraPress,
  onStopPress,
  speaking,
  disabled,
}: {
  onSend: (text: string) => void;
  onCameraPress?: () => void;
  onMicPress?: () => void;
  onLivePress?: () => void;
  onSpeakPress?: () => void;
  onStopPress: () => void;
  busy?: boolean;
  micActive?: boolean;
  liveActive?: boolean;
  speaking: boolean;
  disabled: boolean;
  dictationAvailable?: boolean;
  liveAudioAvailable?: boolean;
}) {
  const [text, setText] = useState('');

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
  };

  const handleChip = (prompt: string) => {
    if (disabled) return;
    onSend(prompt);
  };

  return (
    <View style={styles.wrap}>
      {/* Quick Action Chips */}
      {!disabled && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {QUICK_ACTIONS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              style={styles.chip}
              onPress={() => handleChip(prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        {onCameraPress && !disabled ? (
          <TouchableOpacity
            style={styles.camBtn}
            onPress={onCameraPress}
            activeOpacity={0.7}
          >
            <Text style={styles.camIcon}>📸</Text>
          </TouchableOpacity>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder={disabled ? 'Sem ligação ao PC...' : 'Mensagem ao JARVIS (ou usa mic do teclado)...'}
          placeholderTextColor="#475569"
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="send"
          editable={!disabled}
        />

        {speaking ? (
          <TouchableOpacity
            style={[styles.btn, styles.stopBtn]}
            onPress={onStopPress}
            activeOpacity={0.7}
          >
            <Text style={styles.stopBtnText}>PARAR</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.sendBtn, (!text.trim() || disabled) && styles.btnDisabled]}
            onPress={submit}
            disabled={disabled || !text.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mic Hint */}
      <View style={styles.hintRow}>
        <Text style={styles.hintText}>
          Dica: toca no microfone do teclado do iPhone para ditar em voz alta
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#070b13',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  chipScroll: {
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  camBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camIcon: {
    fontSize: 18,
  },
  btn: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 44,
    backgroundColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  stopBtn: {
    paddingHorizontal: 14,
    backgroundColor: '#f43f5e',
  },
  stopBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sendIcon: {
    color: '#070b13',
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 2,
  },
  btnDisabled: {
    backgroundColor: '#1e293b',
    shadowOpacity: 0,
  },
  hintRow: {
    marginTop: 6,
    alignItems: 'center',
  },
  hintText: {
    color: '#475569',
    fontSize: 11,
    fontStyle: 'italic',
  },
});