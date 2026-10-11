import * as Speech from 'expo-speech';

// `expo-speech-recognition` chama requireNativeModule() no topo do modulo e,
// dentro do Expo Go (sem o modulo nativo), rebenta APENAS ao ser importado.
// Carregamo-lo com require() guardado para a app arrancar sempre de forma segura.
let ExpoSpeechRecognitionModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null =
  null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  ExpoSpeechRecognitionModule = null;
}

/** `true` quando o ditado nativo esta presente (build com modulos nativos). */
export function isDictationAvailable(): boolean {
  return ExpoSpeechRecognitionModule != null;
}

/** Motivo honesto mostrado ao utilizador quando o ditado nao existe na Expo Go. */
export const DICTATION_UNAVAILABLE_MESSAGE =
  'Ditado continuo por modulo nativo indisponivel na Expo Go. Usa o microfone nativo do teclado do teu iPhone (ao lado da barra de espaco) para ditar mensagens.';

export const LOCALE_PT_PT = 'pt-PT';

/** Pede as permissoes de microfone + reconhecimento de voz. */
export async function requestVoicePermissions(): Promise<boolean> {
  if (!ExpoSpeechRecognitionModule) return false;
  const mic = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
  const rec =
    await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
  return Boolean(mic.granted && rec.granted);
}

type ResultHandler = (finalText: string) => void;
type PartialHandler = (partial: string) => void;
type ErrorHandler = (message: string) => void;
type DoneHandler = () => void;

/** Sessao de ditado nativo (disponivel em builds compiladas). */
export function startDictation(handlers: {
  onPartial?: PartialHandler;
  onResult?: ResultHandler;
  onError?: ErrorHandler;
  onDone?: DoneHandler;
}): { stop: () => void } {
  if (!ExpoSpeechRecognitionModule) {
    handlers.onError?.(DICTATION_UNAVAILABLE_MESSAGE);
    return { stop: () => {} };
  }
  const mod = ExpoSpeechRecognitionModule;
  const resultSub = mod.addListener('result', (event) => {
    const transcript: string = event?.results?.[0]?.transcript ?? '';
    if (event?.isFinal) {
      handlers.onResult?.(transcript);
    } else {
      handlers.onPartial?.(transcript);
    }
  });

  const errorSub = mod.addListener('error', (event) => {
    handlers.onError?.(event?.message ?? event?.error ?? 'Erro de reconhecimento.');
  });

  const endSub = mod.addListener('end', () => {
    handlers.onDone?.();
  });

  try {
    mod.start({
      lang: LOCALE_PT_PT,
      interimResults: true,
      continuous: false,
      iosCategory: {
        category: 'playAndRecord',
        categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
        mode: 'measurement',
      },
    });
  } catch (e) {
    handlers.onError?.(String(e));
  }

  return {
    stop: () => {
      try {
        mod.stop();
      } catch {
        /* ignora */
      }
      resultSub?.remove?.();
      errorSub?.remove?.();
      endSub?.remove?.();
    },
  };
}

/** Limpa markdown e marcadores tecnicos para a voz do assistente soar natural. */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\[.*?\]/g, '') // remove marcadores como [Vision], [SYS: ...]
    .replace(/```[\s\S]*?```/g, 'código omitido')
    .replace(/`.*?`/g, '')
    .replace(/[*_#~>]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .trim();
}

/** Fala `text` em pt-PT atraves do sintetizador de voz nativo da Apple (expo-speech). */
export function speak(text: string, onDone?: () => void): { stop: () => void } {
  try {
    Speech.stop();
  } catch {
    /* ignora */
  }

  const clean = cleanTextForSpeech(text);
  if (!clean) {
    onDone?.();
    return { stop: () => {} };
  }

  Speech.speak(clean, {
    language: LOCALE_PT_PT,
    pitch: 1.0,
    rate: 0.98,
    onDone,
    onError: () => onDone?.(),
  });

  return {
    stop: () => {
      try {
        Speech.stop();
      } catch {
        /* ignora */
      }
    },
  };
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    /* ignora */
  }
}