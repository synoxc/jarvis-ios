import { useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJarvis } from '@/state/JarvisContext';
import { theme } from '@/theme';
import { AssistantOrb } from '@/components/AssistantOrb';
import { ConnectionPill } from '@/components/ConnectionPill';
import { MessageBubble } from '@/components/MessageBubble';
import { Composer } from '@/components/Composer';

export default function HomeScreen() {
  const router = useRouter();
  const {
    status,
    assistantState,
    messages,
    paired,
    error,
    voiceMode,
    sendText,
    clearMessages,
    startDictation,
    stopDictation,
    startLiveAudio,
    stopLiveAudio,
    speakLast,
    stopSpeaking,
    disconnect,
  } = useJarvis();

  const listRef = useRef<FlatList>(null);
  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>JARVIS</Text>
          <ConnectionPill status={status} />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/fitness')} style={styles.iconBtn}>
            <Text style={styles.iconText}>🏃</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearMessages} style={styles.iconBtn}>
            <Text style={styles.iconText}>🧹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconBtn}>
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!paired ? (
        <View style={styles.center}>
          <Text style={styles.notPaired}>Sem emparelhar.</Text>
          <Text style={styles.notPairedSub}>
            Liga o JARVIS ao teu PC para começar.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/pair')}
          >
            <Text style={styles.primaryBtnText}>Emparelhar agora</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Orb + conversa */}
          <AssistantOrb state={assistantState} mode={voiceMode} />
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            style={styles.list}
            contentContainerStyle={{ paddingVertical: 8 }}
          />

          {error ? (
            <TouchableOpacity style={styles.errorBar} onPress={() => {}}>
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          <Composer
            onSend={sendText}
            onMicPress={() => (voiceMode === 'dictating' ? stopDictation() : startDictation())}
            onLivePress={() => (voiceMode === 'live-audio' ? stopLiveAudio() : startLiveAudio())}
            onSpeakPress={speakLast}
            onStopPress={stopSpeaking}
            busy={assistantState === 'processing'}
            micActive={voiceMode === 'dictating'}
            liveActive={voiceMode === 'live-audio'}
            speaking={voiceMode === 'speaking'}
            disabled={status !== 'connected'}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  list: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notPaired: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  notPairedSub: {
    color: theme.colors.textDim,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  primaryBtnText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
  errorBar: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    backgroundColor: '#2a1414',
    borderRadius: theme.radius.sm,
  },
  errorText: { color: theme.colors.danger, fontSize: 13, textAlign: 'center' },
});
