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
import { LiveAudioService } from '@/lib/liveAudio';
import * as api from '@/lib/api';
import * as voice from '@/lib/voice';
import {
  loadConnectionConfig,
  saveConnectionConfig,
  clearConnectionConfig,
} from '@/lib/storage';
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
  pairWithPin: (host: string, port: number, pin: string) => Promise<boolean>;
  pairWithQr: (host: string, port: number, key: string) => Promise<boolean>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendText: (text: string) => void;
  clearMessages: () => void;
  voiceMode: VoiceMode;
  startDictation: () => Promise<void>;
  stopDictation: () => void;
  startLiveAudio: () => Promise<void>;
  stopLiveAudio: () => void;
  speakLast: () => void;
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

  const socketRef = useRef<JarvisSocket | null>(null);
  const liveAudioRef = useRef<LiveAudioService | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const dictationStopRef = useRef<null | (() => void)>(null);
  const speakStopRef = useRef<null | (() => void)>(null);

  const pushMessage = useCallback(
    (speaker: ChatMessage['speaker'], text: string) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), speaker, text, ts: Date.now() },
      ]);
    },
    [],
  );

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case 'log':
          pushMessage(msg.speaker, msg.text);
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
    [pushMessage],
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
      // Sem device_token persistente (ex: último login foi por PIN), não há
      // re-login automático possível — o utilizador tem de emparelhar de novo.
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
      // Token revogado/expirado no PC — limpamos e pedimos novo emparelhamento.
      await clearConnectionConfig();
      setPaired(false);
      setStatus('error');
      setError('Sessão expirada ou revogada. Emparelha novamente com o PC.');
    }
  }, [connectSocket]);

  useEffect(() => {
    void reconnect();
    return () => {
      socketRef.current?.close();
      liveAudioRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pairWithPin = useCallback(
    async (h: string, p: number, pin: string): Promise<boolean> => {
      setError(null);
      const trimmedPin = pin.trim().toUpperCase();
      if (!trimmedPin) {
        setError('Introduz o código de emparelhamento.');
        return false;
      }
      const res = await api.loginWithPin(h, p, trimmedPin);
      if (!res.ok || !res.token) {
        setError(res.error ?? 'Código inválido ou expirado.');
        return false;
      }
      const session = api.sessionFromLogin(res.token, trimmedPin);
      sessionRef.current = session;
      // Login por PIN é de sessão única: o servidor NÃO cria device_token aqui
      // e o PIN é one-time-use. Por isso NÃO persistimos device_token — evita
      // guardar um PIN usado como se fosse token e falhar no re-login.
      // Persistimos apenas host/porta para reconectar; o re-login pede novo código.
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
        setError('Código QR inválido.');
        return false;
      }
      const res = await api.autoLogin(h, p, trimmedKey);
      if (!res.ok || !res.token || !res.deviceToken) {
        setError(res.error ?? 'Não foi possível emparelhar com o QR.');
        return false;
      }
      const session: Session = { token: res.token, sessionKey: res.key };
      sessionRef.current = session;
      // Aqui guardamos o device_token REAL devolvido por /auto-login — é o que
      // permite re-login automático e persistente via /api/device-login.
      await saveConnectionConfig({ host: h, port: p, deviceToken: res.deviceToken });
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
    liveAudioRef.current?.stop();
    dictationStopRef.current?.();
    speakStopRef.current?.();
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
      const sentViaWs = socket?.sendCommand(trimmed) ?? false;
      if (!sentViaWs) {
        if (session && host && port) {
          void api.sendCommand(host, port, session, trimmed);
        } else {
          setError('Sem ligação ao PC.');
        }
      }
    },
    [host, port, pushMessage],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  const startDictation = useCallback(async () => {
    const ok = await voice.requestVoicePermissions();
    if (!ok) {
      setError('Permissão de microfone/voz negada.');
      return;
    }
    setVoiceMode('dictating');
    const handle = voice.startDictation({
      onPartial: (partial) => {
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
        setMessages((prev) => {
          const withoutPartial = prev.filter((m) => m.id !== '__partial__');
          return [
            ...withoutPartial,
            { id: nextId(), speaker: 'user', text: finalText, ts: Date.now() },
          ];
        });
        sendText(finalText);
        setVoiceMode('idle');
      },
      onError: (message) => {
        setMessages((prev) => prev.filter((m) => m.id !== '__partial__'));
        setError(message);
        setVoiceMode('idle');
      },
      onDone: () => {
        dictationStopRef.current = null;
        setVoiceMode((m) => (m === 'dictating' ? 'idle' : m));
      },
    });
    dictationStopRef.current = handle.stop;
  }, [sendText]);

  const stopDictation = useCallback(() => {
    dictationStopRef.current?.();
    dictationStopRef.current = null;
    setMessages((prev) => prev.filter((m) => m.id !== '__partial__'));
    setVoiceMode('idle');
  }, []);

  const startLiveAudio = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !host || !port) {
      setError('Sem ligação ao PC.');
      return;
    }
    // O módulo de captura não pede permissões sozinho (ver README do
    // expo-audio-stream-pcm): pedir microfone antes de iniciar.
    const micOk = await voice.requestVoicePermissions();
    if (!micOk) {
      setError('Permissão de microfone negada. Ativa o microfone nas definições.');
      return;
    }
    const service = new LiveAudioService();
    service.onState = (s) => {
      if (s === 'live') setVoiceMode('live-audio');
      else if (s === 'error') {
        setVoiceMode('idle');
        setError('Falha no áudio em tempo real.');
      } else if (s === 'idle') {
        setVoiceMode((m) => (m === 'live-audio' ? 'idle' : m));
      }
    };
    liveAudioRef.current = service;
    await service.start(host, port, session);
  }, [host, port]);

  const stopLiveAudio = useCallback(() => {
    liveAudioRef.current?.stop();
    liveAudioRef.current = null;
    setVoiceMode('idle');
  }, []);

  const speakLast = useCallback(() => {
    const lastJarvis = [...messages].reverse().find((m) => m.speaker === 'jarvis');
    if (!lastJarvis) return;
    setVoiceMode('speaking');
    const handle = voice.speak(lastJarvis.text, () => setVoiceMode('idle'));
    speakStopRef.current = handle.stop;
  }, [messages]);

  const stopSpeaking = useCallback(() => {
    speakStopRef.current?.();
    speakStopRef.current = null;
    voice.stopSpeaking();
    setVoiceMode((m) => (m === 'speaking' ? 'idle' : m));
  }, []);

  const value = useMemo<JarvisContextValue>(
    () => ({
      status,
      assistantState,
      messages,
      host,
      port,
      paired,
      error,
      pairWithPin,
      pairWithQr,
      reconnect,
      disconnect,
      sendText,
      clearMessages,
      voiceMode,
      startDictation,
      stopDictation,
      startLiveAudio,
      stopLiveAudio,
      speakLast,
      stopSpeaking,
    }),
    [
      status, assistantState, messages, host, port, paired, error,
      pairWithPin, pairWithQr, reconnect, disconnect, sendText, clearMessages,
      voiceMode, startDictation, stopDictation, startLiveAudio,
      stopLiveAudio, speakLast, stopSpeaking,
    ],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}


