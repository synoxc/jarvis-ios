import { useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJarvis } from '@/state/JarvisContext';
import { theme } from '@/theme';
import { JarvisAvatar } from '@/components/JarvisAvatar';
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
    capabilities,
    autoSpeak,
    toggleAutoSpeak,
    sendText,
    clearMessages,
    stopSpeaking,
    speakText,
    speakLast,
    startDictation,
    stopDictation,
    startLiveAudio,
    stopLiveAudio,
    uploadAndAnalyze,
  } = useJarvis();

  const micActive = voiceMode === 'dictating';
  const liveActive = voiceMode === 'live-audio';

  const handleMicPress = () => {
    if (micActive) stopDictation();
    else void startDictation();
  };

  const handleLivePress = () => {
    if (liveActive) stopLiveAudio();
    else void startLiveAudio();
  };

  const avatarState =
    status === 'error'
      ? 'error'
      : status !== 'connected'
        ? 'offline'
        : voiceMode === 'dictating' || voiceMode === 'live-audio'
          ? 'listening'
          : voiceMode === 'speaking'
            ? 'speaking'
            : assistantState === 'processing'
              ? 'processing'
              : 'idle';

  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          <Text style={styles.title}>JARVIS</Text>
          <ConnectionPill status={status} />
        </View>

        <View style={styles.headerActions}>
          {/* Voice Toggle */}
          <TouchableOpacity
            onPress={toggleAutoSpeak}
            style={[styles.iconBtn, autoSpeak && styles.iconBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>{autoSpeak ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>

          {/* Fitness */}
          <TouchableOpacity
            onPress={() => router.push('/fitness')}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>⚡</Text>
          </TouchableOpacity>

          {/* Clear */}
          <TouchableOpacity
            onPress={clearMessages}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>🗑️</Text>
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!paired ? (
        <View style={styles.center}>
          <View style={styles.unpairedCard}>
            <View style={styles.unpairedRing}>
              <Text style={styles.unpairedIcon}>🌐</Text>
            </View>
            <Text style={styles.notPaired}>JARVIS NEURAL LINK</Text>
            <Text style={styles.notPairedSub}>
              Liga o teu iPhone ao PC para ativar a inteligência artificial, voz e controlo remoto.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/pair')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Emparelhar agora</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Avatar do JARVIS com estados reais */}
          <View style={styles.hero}>
            <JarvisAvatar state={avatarState} size={150} />
          </View>

          {/* Dynamic Island In-App HUD */}
          <AssistantOrb state={assistantState} mode={voiceMode} />

          {/* Conversation List */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} onSpeak={speakText} />
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />

          {error ? (
            <View style={styles.errorBar}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Modern Composer */}
          <Composer
            onSend={sendText}
            onCameraPress={uploadAndAnalyze}
            onMicPress={handleMicPress}
            onLivePress={handleLivePress}
            onSpeakPress={speakLast}
            onStopPress={stopSpeaking}
            speaking={voiceMode === 'speaking'}
            micActive={micActive}
            liveActive={liveActive}
            disabled={status !== 'connected'}
            dictationAvailable={capabilities.dictation}
            liveAudioAvailable={capabilities.liveAudio}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050811',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#22d3ee',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2.5,
    fontFamily: theme.font.mono,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0e1726',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: '#22d3ee',
    backgroundColor: '#083344',
  },
  iconText: {
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  listContent: {
    paddingVertical: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  unpairedCard: {
    backgroundColor: '#0c1322',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  unpairedRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#082f49',
    borderWidth: 1.5,
    borderColor: '#22d3ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  unpairedIcon: {
    fontSize: 28,
  },
  notPaired: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: theme.font.mono,
    textAlign: 'center',
  },
  notPairedSub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#22d3ee',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 22,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  primaryBtnText: {
    color: '#070b13',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  errorBar: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#2b0f16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f43f5e44',
  },
  errorText: {
    color: '#fb7185',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});