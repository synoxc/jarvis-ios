import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/theme';
import type { ChatMessage } from '@/lib/types';

interface MessageBubbleProps {
  message: ChatMessage;
  onSpeak?: (text: string) => void;
}

export function MessageBubble({ message, onSpeak }: MessageBubbleProps) {
  const isUser = message.speaker === 'user';
  const isSystem = message.speaker === 'system';

  const timeStr = new Date(message.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <View style={styles.systemBubble}>
          <Text style={styles.systemText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  if (isUser) {
    return (
      <View style={[styles.row, styles.rowUser]}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
          <Text style={styles.userTime}>{timeStr}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowJarvis]}>
      <View style={styles.jarvisBubble}>
        <View style={styles.jarvisHeader}>
          <View style={styles.jarvisBadge}>
            <View style={styles.jarvisDot} />
            <Text style={styles.jarvisBadgeText}>JARVIS</Text>
          </View>
          {onSpeak ? (
            <TouchableOpacity
              onPress={() => onSpeak(message.text)}
              style={styles.speakBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.speakBtnText}>Ouvir</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.jarvisText}>{message.text}</Text>
        <Text style={styles.jarvisTime}>{timeStr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 6,
    marginHorizontal: 14,
    flexDirection: 'row',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowJarvis: {
    justifyContent: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#0f3d3e',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 11,
    maxWidth: '82%',
    borderWidth: 1,
    borderColor: '#14b8a644',
  },
  userText: {
    color: '#f0fdf4',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  userTime: {
    color: '#5eead488',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  jarvisBubble: {
    backgroundColor: '#0d131f',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderLeftWidth: 3,
    borderLeftColor: '#22d3ee',
  },
  jarvisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  jarvisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jarvisDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22d3ee',
  },
  jarvisBadgeText: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: theme.font.mono,
  },
  speakBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  speakBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  jarvisText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  jarvisTime: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 6,
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  systemBubble: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  systemText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});