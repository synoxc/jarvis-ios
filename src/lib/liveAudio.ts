import type { EventSubscription } from 'expo-modules-core';
import type { Session } from './types';

// `expo-audio-stream-pcm` também faz requireNativeModule() no topo do módulo e
// rebenta no Expo Go ao ser importado. Require guardado + flags de
// disponibilidade para a app arrancar com honestidade (ver JarvisContext).
let ExpoAudioStream: typeof import('expo-audio-stream-pcm').default | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-audio-stream-pcm');
  ExpoAudioStream = mod?.default ?? mod ?? null;
} catch {
  ExpoAudioStream = null;
}

/** `true` quando o módulo nativo de captura de áudio está presente. */
export function isLiveAudioAvailable(): boolean {
  return ExpoAudioStream != null;
}

/** Motivo honesto mostrado ao utilizador quando o áudio ao vivo não existe. */
export const LIVE_AUDIO_UNAVAILABLE_MESSAGE =
  'Voz ao vivo indisponível na Expo Go (áudio em tempo real nativo não incluído). Usa o texto — disponível em builds nativas.';

/**
 * Áudio em tempo real do microfone do iPhone → Gemini Live, via
 * WebSocket `/ws/phone-audio`.
 *
 * Usa `expo-audio-stream-pcm` (Expo Module nativa, New Architecture), que
 * captura com AVAudioEngine (iOS) e entrega PCM 16-bit LE em Base64.
 *
 * Protocolo confirmado (server.py + app.html):
 *  - PCM16 little-endian, mono, 16 kHz.
 *  - Chunks de ~1024 samples (64 ms) para evitar flooding da fila.
 *  - WebSocket binário (ArrayBuffer de Int16).
 *
 * ATENÇÃO iOS: o hardware corre tipicamente a 44.1/48 kHz e o
 * expo-audio-stream-pcm entrega a taxa nativa nesse caso (o web faz
 * resampling em _f32toPcm16; aqui ainda não). Até o resampling ser
 * implementado ou a taxa real ser medida no iPhone, o áudio ao vivo é
 * BEST-EFFORT — ver README § voz.
 *
 * O módulo já produz 16-bit mono; fazemos apenas o re-chunking para
 * 1024 samples antes de enviar.
 */

type StateHandler = (state: 'idle' | 'connecting' | 'live' | 'error') => void;

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_SAMPLES = 1024;

export class LiveAudioService {
  private ws: WebSocket | null = null;
  private sub: EventSubscription | null = null;
  private buffer: Int16Array = new Int16Array(0);
  private state: 'idle' | 'connecting' | 'live' | 'error' = 'idle';

  host = '';
  port = 0;
  session: Session | null = null;
  onState: StateHandler = () => {};

  private setState(s: typeof this.state): void {
    this.state = s;
    this.onState(s);
  }

  getState(): typeof this.state {
    return this.state;
  }

  /** Inicia captura de áudio e ligação WS binária. */
  async start(host: string, port: number, session: Session): Promise<void> {
    const audio = ExpoAudioStream;
    if (!audio) {
      // Sem módulo nativo (Expo Go) — sinaliza erro; o JarvisContext mostra
      // LIVE_AUDIO_UNAVAILABLE_MESSAGE antes de chegar aqui.
      this.setState('error');
      return;
    }
    if (!session || this.state === 'live' || this.state === 'connecting') return;
    this.host = host;
    this.port = port;
    this.session = session;
    this.buffer = new Int16Array(0);
    this.setState('connecting');

    const ws = new WebSocket(
      `ws://${host}:${port}/ws/phone-audio?token=${encodeURIComponent(session.token)}`,
    );
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      // Subscreve os chunks PCM e só depois inicia a captura nativa.
      this.sub = audio.addListener('onAudioData', (event) => {
        this.onAudioData(event.data);
      });
      try {
        audio.start({
          sampleRate: TARGET_SAMPLE_RATE,
          channels: 1,
          bitDepth: 16,
        });
        this.setState('live');
      } catch {
        this.cleanup();
        this.setState('error');
      }
    };

    ws.onerror = () => {
      this.cleanup();
      this.setState('error');
    };

    ws.onclose = () => {
      if (this.state !== 'idle') {
        this.cleanup();
        this.setState('idle');
      }
    };
  }

  /** Converte chunk base64 (PCM16 LE) e envia em blocos de 1024 samples. */
  private onAudioData(base64: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const chunk = base64ToInt16(base64);
    if (chunk.length === 0) return;
    const merged = new Int16Array(this.buffer.length + chunk.length);
    merged.set(this.buffer, 0);
    merged.set(chunk, this.buffer.length);
    let offset = 0;
    while (merged.length - offset >= CHUNK_SAMPLES) {
      const out = merged.subarray(offset, offset + CHUNK_SAMPLES);
      this.ws.send(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
      offset += CHUNK_SAMPLES;
    }
    this.buffer = merged.subarray(offset);
  }

  /** Para a captura e fecha o WS. */
  stop(): void {
    this.cleanup();
    this.setState('idle');
  }

  private cleanup(): void {
    try {
      this.sub?.remove();
      this.sub = null;
    } catch {
      /* ignora */
    }
    try {
      ExpoAudioStream?.stop();
    } catch {
      /* ignora */
    }
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try {
        ws.close();
      } catch {
        /* ignora */
      }
    }
    this.buffer = new Int16Array(0);
  }
}

/** Descodifica base64 PCM16 (little-endian) para Int16Array. */
function base64ToInt16(b64: string): Int16Array {
  const binary = atobCompat(b64);
  const len = binary.length >> 1;
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const lo = binary.charCodeAt(i * 2);
    const hi = binary.charCodeAt(i * 2 + 1);
    out[i] = (hi << 8) | lo;
  }
  return out;
}

/** atob tolerante (usa implementação própria se `atob` não existir). */
function atobCompat(input: string): string {
  if (typeof atob === 'function') return atob(input);
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let str = input.replace(/=+$/, '');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < str.length; i++) {
    buffer = (buffer << 6) | chars.indexOf(str[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}
