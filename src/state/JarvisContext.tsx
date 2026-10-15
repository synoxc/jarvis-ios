import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { JarvisSocket } from '@/lib/socket';
import {
  LiveAudioService,
  isLiveAudioAvailable,
  LIVE_AUDIO_UNAVAILABLE_MESSAGE,
} from '@/lib/liveAudio';
import * as api from '@/lib/api';
import * as voice from '@/lib/voice';
import { pickAndUploadImage } from '@/lib/imageUpload';
import { isDictationAvailable, DICTATION_UNAVAILABLE_MESSAGE } from '@/lib/voice';
import {
  loadConnectionConfig,
  saveConnectionConfig,
  clearConnectionConfig,
} from '@/lib/storage';
import {
  startJarvisLiveActivity,
  stopJarvisLiveActivity,
  updateJarvisLiveActivityAttributes,
  mapToJarvisLiveActivityAttributes,
  isLiveActivityAvailable,
} from '@/liveActivity/JarvisLiveActivityManager';
import type {
  AssistantState,
  ChatMessage,
  ConnectionStatus,
  ServerMessage,
  Session,
} from '@/lib/types';

type VoiceMode = 'idle' | 'dictating' | 'live-audio' | 'speaking';

interface JarvisContextValue {
  status: ConnectionStatus;
  assistantState: AssistantState;
  messages: ChatMessage[];
  host: string;
  port: number;
  paired: boolean;
  error: string | null;
  /** Capacidades reais desta build (Expo Go nao inclui modulos nativos). */
  capabilities: { dictation: boolean; liveAudio: boolean; liveActivity: boolean };
  pairWithPin: (host: string, port: number, pin: string) => Promise<boolean>;
  pairWithQr: (host: string, port: number, key: string) => Promise<boolean>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendText: (text: string) => void;
  clearMessages: () => void;
  voiceMode: VoiceMode;
  autoSpeak: boolean;
  toggleAutoSpeak: () => void;
  startDictation: (opts?: { continuous?: boolean }) => Promise<void>;
  stopDictation: () => void;
  /** Ditado sempre ativo (escuta contínua após emparelar). */
  alwaysOnDictation: boolean;
  setAlwaysOnDictation: (on: boolean) => void;
  startLiveAudio: () => Promise<void>;
  stopLiveAudio: () => void;
  speakLast: () => void;
  speakText: (text: string) => void;
  uploadAndAnalyze: () => Promise<void>;
  stopSpeaking: () => void;
}

const JarvisContext = createContext<JarvisContextValue | null>(null);

export function useJarvis(): JarvisContextValue {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error('useJarvis deve ser usado dentro de <JarvisProvider>');
  return ctx;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `m${Date.now().toString(36)}${idCounter}`;
}

export function JarvisProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [assistantState, setAssistantState] = useState<AssistantState>('sleeping');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [host, setHost] = useState('');
  const [port, setPort] = useState(8000);
  const [paired, setPaired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('idle');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [alwaysOnDictation, setAlwaysOnDictation] = useState(true);

  const alwaysOnRef = useRef(alwaysOnDictation);
  useEffect(() => {
    alwaysOnRef.current = alwaysOnDictation;
  }, [alwaysOnDictation]);
  /** Texto estavel ja enviado no ditado continuo (evita duplicados). */
  const stableTextRef = useRef<{ full: string; sent: string; timer: ReturnType<typeof setTimeout> | null }>(
    { full: '', sent: '', timer: null },
  );

  /** Falhas consecutivas de ditado — após 3, desliga o always-on (evita loop). */
  const errorStreakRef = useRef(0);

  const socketRef = useRef<JarvisSocket | null>(null);
  const liveAudioRef = useRef<LiveAudioService | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const dictationStopRef = useRef<null | (() => void)>(null);
  const speakStopRef = useRef<null | (() => void)>(null);
  const autoSpeakRef = useRef(true);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => {
      const next = !prev;
      if (!next) {
        voice.stopSpeaking();
        setVoiceMode((m) => (m === 'speaking' ? 'idle' : m));
      }
      return next;
    });
  }, []);

  const pushMessage = useCallback(
    (speaker: ChatMessage['speaker'], text: string) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), speaker, text, ts: Date.now() },
      ]);
    },
    [],
  );

  const capabilities = useMemo(
    () => ({
      dictation: isDictationAvailable(),
      liveAudio: isLiveAudioAvailable(),
      liveActivity: isLiveActivityAvailable(),
    }),
    [],
  );

  const speakText = useCallback((text: string) => {
    speakStopRef.current?.();
    setVoiceMode('speaking');
    const handle = voice.speak(text, () => {
      setVoiceMode((m) => (m === 'speaking' ? 'idle' : m));
    });
    speakStopRef.current = handle.stop;
  }, []);

  const stopSpeaking = useCallback(() => {
    speakStopRef.current?.();
    speakStopRef.current = null;
    voice.stopSpeaking();
    setVoiceMode((m) => (m === 'speaking' ? 'idle' : m));
  }, []);

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case 'log':
          pushMessage(msg.speaker, msg.text);
          if (msg.speaker === 'jarvis' && autoSpeakRef.current) {
            speakText(msg.text);
          }
          break;
        case 'status':
          setAssistantState(msg.state);
          break;
        case 'wake':
          setAssistantState('active');
          break;
        case 'sys':
          pushMessage('system', msg.text);
          break;
        default:
          break;
      }
    },
    [pushMessage, speakText],
  );

  const connectSocket = useCallback(
    (h: string, p: number, session: Session) => {
      socketRef.current?.close();
      const socket = new JarvisSocket(h, p, session);
      socket.onStatus = setStatus;
      socket.onMessage = handleServerMessage;
      socket.connect();
      socketRef.current = socket;
    },
    [handleServerMessage],
  );

  const reconnect = useCallback(async () => {
    const cfg = await loadConnectionConfig();
    if (!cfg || !cfg.deviceToken) {
      setPaired(false);
      setStatus('disconnected');
      return;
    }
    setHost(cfg.host);
    setPort(cfg.port);
    const res = await api.deviceLogin(cfg.host, cfg.port, cfg.deviceToken);
    if (res.ok && res.token && res.key) {
      const session = { token: res.token, sessionKey: res.key };
      sessionRef.current = session;
      setPaired(true);
      connectSocket(cfg.host, cfg.port, session);
    } else {
      await clearConnectionConfig();
      setPaired(false);
      setStatus('error');
      setError('Sessao expirada ou revogada. Emparelha novamente com o PC.');
    }
  }, [connectSocket]);

  useEffect(() => {
    void reconnect();
    return () => {
      socketRef.current?.close();
      liveAudioRef.current?.stop();
      voice.stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pairWithPin = useCallback(
    async (h: string, p: number, pin: string): Promise<boolean> => {
      setError(null);
      const trimmedPin = pin.trim().toUpperCase();
      if (!trimmedPin) {
        setError('Introduz o codigo de emparelhamento.');
        return false;
      }
      const res = await api.loginWithPin(h, p, trimmedPin);
      if (!res.ok || !res.token) {
        setError(res.error ?? 'Codigo invalido ou expirado.');
        return false;
      }
      const session = api.sessionFromLogin(res.token, trimmedPin);
      sessionRef.current = session;
      await clearConnectionConfig();
      await saveConnectionConfig({ host: h, port: p, deviceToken: '' });
      setHost(h);
      setPort(p);
      setPaired(true);
      connectSocket(h, p, session);
      return true;
    },
    [connectSocket],
  );

  const pairWithQr = useCallback(
    async (h: string, p: number, key: string): Promise<boolean> => {
      setError(null);
      const trimmedKey = key.trim().toUpperCase();
      if (!trimmedKey) {
        setError('Codigo QR invalido.');
        return false;
      }
      const res = await api.autoLogin(h, p, trimmedKey);
      if (!res.ok || !res.token || !res.deviceToken) {
        setError(res.error ?? 'Nao foi possivel emparelhar com o QR.');
        return false;
      }
      const session: Session = { token: res.token, sessionKey: res.key };
      sessionRef.current = session;
      await clearConnectionConfig();
      await saveConnectionConfig({
        host: h,
        port: p,
        deviceToken: res.deviceToken,
      });
      setHost(h);
      setPort(p);
      setPaired(true);
      connectSocket(h, p, session);
      return true;
    },
    [connectSocket],
  );

  const disconnect = useCallback(async () => {
    socketRef.current?.close();
    socketRef.current = null;
    liveAudioRef.current?.stop();
    liveAudioRef.current = null;
    dictationStopRef.current?.();
    speakStopRef.current?.();
    voice.stopSpeaking();
    sessionRef.current = null;
    setPaired(false);
    setStatus('disconnected');
    setMessages([]);
    await clearConnectionConfig();
  }, []);

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      pushMessage('user', trimmed);
      const socket = socketRef.current;
      const session = sessionRef.current;
      const sent = socket?.sendCommand(trimmed);
      if (!sent && session && host && port) {
        void api.sendCommand(host, port, session, trimmed);
      }
    },
    [host, port, pushMessage],
  );

  const clearMessages = useCallback(() => {
    voice.stopSpeaking();
    setVoiceMode((m) => (m === 'speaking' ? 'idle' : m));
    setMessages([]);
  }, []);

  const startDictationRef = useRef<(opts?: { continuous?: boolean }) => Promise<void>>(
    async () => {},
  );
  /** Pausa temporária (fala do JARVIS / áudio ao vivo) — não desliga o always-on. */
  const pausedRef = useRef(false);

  const startDictation = useCallback(
    async (opts?: { continuous?: boolean }) => {
      const continuous = opts?.continuous ?? alwaysOnRef.current;
      if (!capabilities.dictation) {
        setError(DICTATION_UNAVAILABLE_MESSAGE);
        return;
      }
      if (dictationStopRef.current) return; // já está a correr
      // Sentinel: bloqueia arranques duplicados enquanto pede permissão.
      dictationStopRef.current = () => {};
      const ok = await voice.requestVoicePermissions();
      if (!ok) {
        setError('Permissao de microfone/voz negada.');
        dictationStopRef.current = null;
        if (continuous) {
          alwaysOnRef.current = false;
          setAlwaysOnDictation(false);
        }
        return;
      }
      pausedRef.current = false;
      const stable = stableTextRef.current;
      stable.full = '';
      stable.sent = '';
      if (stable.timer) {
        clearTimeout(stable.timer);
        stable.timer = null;
      }
      setVoiceMode('dictating');
      const handle = voice.startDictation({
        continuous,
        onPartial: (partial) => {
          stable.full = partial;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.id === '__partial__') {
              return [...prev.slice(0, -1), { ...last, text: partial }];
            }
            return [
              ...prev,
              { id: '__partial__', speaker: 'user', text: partial, ts: Date.now() },
            ];
          });
        },
        onResult: (finalText) => {
          // Ditado contínuo: o iOS costuma repetir o transcrito acumulado —
          // envia apenas o trecho novo face ao último envio.
          let toSend = finalText;
          if (stable.sent && finalText.startsWith(stable.sent)) {
            toSend = finalText.slice(stable.sent.length).trim();
          } else if (finalText === stable.sent) {
            toSend = '';
          }
          if (toSend) {
            setMessages((prev) => {
              const withoutPartial = prev.filter((m) => m.id !== '__partial__');
              return [
                ...withoutPartial,
                { id: nextId(), speaker: 'user', text: toSend, ts: Date.now() },
              ];
            });
            sendText(toSend);
          } else {
            setMessages((prev) => prev.filter((m) => m.id !== '__partial__'));
          }
          errorStreakRef.current = 0;
          stable.full = finalText;
          stable.sent = finalText;
          if (!continuous) setVoiceMode('idle');
        },
        onError: (message) => {
          dictationStopRef.current = null;
          setMessages((prev) => prev.filter((m) => m.id !== '__partial__'));
          setError(message);
          errorStreakRef.current += 1;
          if (errorStreakRef.current >= 3 && alwaysOnRef.current) {
            alwaysOnRef.current = false;
            setAlwaysOnDictation(false);
          }
          setVoiceMode('idle');
        },
        onDone: () => {
          dictationStopRef.current = null;
          if (pausedRef.current) {
            pausedRef.current = false;
            return; // pausa deliberada — o efeito always-on retoma em 'idle'
          }
          setVoiceMode((m) => (m === 'dictating' ? 'idle' : m));
        },
      });
      dictationStopRef.current = handle.stop;
    },
    [capabilities, sendText],
  );

  useEffect(() => {
    startDictationRef.current = startDictation;
  }, [startDictation]);

  const stopDictation = useCallback(() => {
    // Paragem explícita do utilizador: desliga o always-on para não reiniciar.
    alwaysOnRef.current = false;
    setAlwaysOnDictation(false);
    pausedRef.current = false;
    dictationStopRef.current?.();
    dictationStopRef.current = null;
    setMessages((prev) => prev.filter((m) => m.id !== '__partial__'));
    setVoiceMode('idle');
  }, []);

  /**
   * Ditado sempre ativo: arranca sozinho quando ligado, pausa durante a fala
   * do JARVIS / áudio ao vivo (evita eco) e retoma quando volta a 'idle'.
   */
  useEffect(() => {
    if (!capabilities.dictation) return;
    if (voiceMode === 'speaking' || voiceMode === 'live-audio') {
      if (dictationStopRef.current) {
        pausedRef.current = true;
        const stop = dictationStopRef.current;
        dictationStopRef.current = null;
        stop();
      }
      return;
    }
    if (voiceMode !== 'idle') return;
    if (!alwaysOnDictation || status !== 'connected') return;
    if (dictationStopRef.current) return;
    void startDictationRef.current({ continuous: true });
  }, [capabilities.dictation, voiceMode, alwaysOnDictation, status]);

  const startLiveAudio = useCallback(async () => {
    if (!capabilities.liveAudio) {
      setError(LIVE_AUDIO_UNAVAILABLE_MESSAGE);
      return;
    }
    const session = sessionRef.current;
    if (!session || !host || !port) {
      setError('Sem ligacao ao PC.');
      return;
    }
    const micOk = await voice.requestVoicePermissions();
    if (!micOk) {
      setError('Permissao de microfone negada. Ativa o microfone nas definicoes.');
      return;
    }
    const service = new LiveAudioService();
    service.onState = (s) => {
      if (s === 'live') setVoiceMode('live-audio');
      else if (s === 'error') {
        setVoiceMode('idle');
        setError('Falha no audio em tempo real.');
      } else if (s === 'idle') {
        setVoiceMode((m) => (m === 'live-audio' ? 'idle' : m));
      }
    };
    liveAudioRef.current = service;
    await service.start(host, port, session);
  }, [capabilities, host, port]);

  const stopLiveAudio = useCallback(() => {
    liveAudioRef.current?.stop();
    liveAudioRef.current = null;
    setVoiceMode('idle');
  }, []);

  const uploadAndAnalyze = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !host || !port) {
      setError('Sem ligacao ao PC para enviar imagem.');
      return;
    }
    const res = await pickAndUploadImage(host, port, session.token);
    if (res.ok) {
      sendText("Analisa a imagem que acabei de enviar do meu telemovel.");
    } else if (res.error) {
      setError(res.error);
    }
  }, [host, port, sendText]);

  const speakLast = useCallback(() => {
    const lastJarvis = [...messages].reverse().find((m) => m.speaker === 'jarvis');
    if (!lastJarvis) return;
    speakText(lastJarvis.text);
  }, [messages, speakText]);

  const liveActivityAttrs = useMemo(
    () => mapToJarvisLiveActivityAttributes({ status, assistantState, voiceMode }),
    [status, assistantState, voiceMode],
  );

  useEffect(() => {
    if (!capabilities.liveActivity) return;
    if (!paired) {
      void stopJarvisLiveActivity('immediate');
      return;
    }
    void startJarvisLiveActivity(liveActivityAttrs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capabilities.liveActivity, paired]);

  useEffect(() => {
    if (!capabilities.liveActivity || !paired) return;
    void updateJarvisLiveActivityAttributes(liveActivityAttrs);
  }, [capabilities.liveActivity, paired, liveActivityAttrs]);

  useEffect(
    () => () => {
      void stopJarvisLiveActivity('immediate');
    },
    [],
  );

  const value = useMemo<JarvisContextValue>(
    () => ({
      status,
      assistantState,
      messages,
      host,
      port,
      paired,
      error,
      capabilities,
      pairWithPin,
      pairWithQr,
      reconnect,
      disconnect,
      sendText,
      clearMessages,
      voiceMode,
      autoSpeak,
      toggleAutoSpeak,
      startDictation,
      stopDictation,
      alwaysOnDictation,
      setAlwaysOnDictation,
      startLiveAudio,
      stopLiveAudio,
      speakLast,
      speakText,
      uploadAndAnalyze,
      stopSpeaking,
    }),
    [
      status, assistantState, messages, host, port, paired, error, capabilities,
      pairWithPin, pairWithQr, reconnect, disconnect, sendText, clearMessages,
      voiceMode, autoSpeak, toggleAutoSpeak, startDictation, stopDictation,
      startLiveAudio, stopLiveAudio, speakLast, speakText,
      uploadAndAnalyze, stopSpeaking, alwaysOnDictation, setAlwaysOnDictation,
    ],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}