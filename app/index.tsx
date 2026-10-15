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
import { LinearGradient } from 'expo-linear-gradient';
import { useJarvis } from '@/state/JarvisContext';
import { theme } from '@/theme';
import { JarvisAvatar } from '@/components/JarvisAvatar';
import { DynamicBar } from '@/components/DynamicBar';
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
    alwaysOnDictation,
    setAlwaysOnDictation,
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
    reconnect,
  } = useJarvis();

  const micActive = voiceMode === 'dictating';
  const liveActive = voiceMode === 'live-audio';

  const handleMicPress = () => {
    if (micActive) stopDictation();
    else {
      setAlwaysOnDictation(true);
      void startDictation({ continuous: true });
    }
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

  const handleBarPress = () => {
    if (status !== 'connected') void reconnect();
  };

  return (
    <LinearGradient colors={[...theme.gradient.bg]} style={styles.safe}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Dynamic Island bar — estado do JARVIS em tempo real */}
        <DynamicBar status={status} state={avatarState} onPress={handleBarPress} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandWrap}>
            <Text style={styles.title}>JARVIS</Text>
            <ConnectionPill status={status} onPress={() => void reconnect()} />
            {alwaysOnDictation && capabilities.dictation ? (
              <View style={styles.alwaysOnChip}>
                <Text style={styles.alwaysOnText}>SEMPRE ATIVO</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggleAutoSpeak}
              style={[styles.iconBtn, autoSpeak && styles.iconBtnActive]}
              activeOpacity={0.7}
              accessibilityLabel={autoSpeak ? 'Desativar respostas por voz' : 'Ativar respostas por voz'}
            >
              <Text style={styles.iconText}>{autoSpeak ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/fitness')}
              style={styles.iconBtn}
              activeOpacity={0.7}
              accessibilityLabel="Fitness"
            >
              <Text style={styles.iconText}>⚡</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearMessages}
              style={styles.iconBtn}
              activeOpacity={0.7}
              accessibilityLabel="Limpar conversa"
            >
              <Text style={styles.iconText}>🗑️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={styles.iconBtn}
              activeOpacity={0.7}
              accessibilityLabel="Definições"
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
              <JarvisAvatar state={avatarState} size={130} />
            </View>

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2.5,
    fontFamily: theme.font.mono,
  },
  alwaysOnChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.listening + '66',
    backgroundColor: theme.colors.listening + '1a',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  alwaysOnText: {
    color: theme.colors.listening,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: theme.colors.primary,
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
    paddingTop: 2,
    paddingBottom: 2,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  unpairedCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
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
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  unpairedIcon: {
    fontSize: 28,
  },
  notPaired: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: theme.font.mono,
    textAlign: 'center',
  },
  notPairedSub: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 22,
    ...theme.glow.soft,
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
    color: theme.colors.danger,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
