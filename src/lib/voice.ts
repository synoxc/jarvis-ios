import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * Ditado iOS nativo (SFSpeechRecognizer) + TTS (expo-speech).
 *
 * Fallback de voz quando o áudio em tempo real não está disponível, e também
 * usado para ler as respostas do JARVIS em voz alta (pt-PT).
 *
 * API confirmada em node_modules/expo-speech-recognition (SDK 57):
 *  - ExpoSpeechRecognitionModule.start({lang, interimResults, continuous, ...})
 *  - ExpoSpeechRecognitionModule.stop() / abort()
 *  - Permissões: requestMicrophonePermissionsAsync / requestSpeechRecognizerPermissionsAsync
 *  - Eventos (via addListener): 'result' {isFinal, results:[{transcript}]},
 *    'error' {error, message}, 'end', 'audiostart'.
 */

export const LOCALE_PT_PT = 'pt-PT';

/** Pede as permissões de microfone + reconhecimento de voz. */
export async function requestVoicePermissions(): Promise<boolean> {
  const mic = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
  const rec =
    await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
  return Boolean(mic.granted && rec.granted);
}

type ResultHandler = (finalText: string) => void;
type PartialHandler = (partial: string) => void;
type ErrorHandler = (message: string) => void;
type DoneHandler = () => void;

/** Sessão de ditado. Devolve um handle com stop(). */
export function startDictation(handlers: {
  onPartial?: PartialHandler;
  onResult?: ResultHandler;
  onError?: ErrorHandler;
  onDone?: DoneHandler;
}): { stop: () => void } {
  const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
    const transcript: string = event?.results?.[0]?.transcript ?? '';
    if (event?.isFinal) {
      handlers.onResult?.(transcript);
    } else {
      handlers.onPartial?.(transcript);
    }
  });

  const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
    handlers.onError?.(event?.message ?? event?.error ?? 'Erro de reconhecimento.');
  });

  const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
    handlers.onDone?.();
  });

  try {
    ExpoSpeechRecognitionModule.start({
      lang: LOCALE_PT_PT,
      interimResults: true,
      continuous: false,
      // Usa a categoria de gravação+voz do iOS.
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
        ExpoSpeechRecognitionModule.stop();
      } catch {
        /* ignora */
      }
      resultSub?.remove?.();
      errorSub?.remove?.();
      endSub?.remove?.();
    },
  };
}

/** Fala `text` em pt-PT. Devolve uma função para interromper. */
export function speak(text: string, onDone?: () => void): { stop: () => void } {
  Speech.speak(text, {
    language: LOCALE_PT_PT,
    pitch: 1.0,
    rate: 0.95,
    onDone,
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

