import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import type { ChatMessage } from '@/lib/types';

/** Bolha de conversa (user / jarvis / system). */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.speaker === 'user';
  const isSystem = message.speaker === 'system';

  const bubbleStyle = isSystem
    ? styles.systemBubble
    : isUser
      ? styles.userBubble
      : styles.jarvisBubble;
  const textStyle = isSystem ? styles.systemText : isUser ? styles.userText : styles.jarvisText;

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowLeft,
      ]}
    >
      <View style={bubbleStyle}>
        <Text style={textStyle}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, marginHorizontal: 12, flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  userBubble: {
    backgroundColor: theme.colors.bubbleUser,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    borderTopRightRadius: 4,
  },
  jarvisBubble: {
    backgroundColor: theme.colors.bubbleJarvis,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopLeftRadius: 4,
  },
  systemBubble: {
    backgroundColor: theme.colors.bubbleSystem,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  userText: { color: '#eafffb', fontSize: 15, lineHeight: 20 },
  jarvisText: { color: theme.colors.text, fontSize: 15, lineHeight: 20 },
  systemText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
