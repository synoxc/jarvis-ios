import { encrypt } from './crypto';
import type { ConnectionStatus, ServerMessage, Session } from './types';

/**
 * Gestor da ligação WebSocket principal (`/ws`) ao JARVIS Dashboard.
 * - Recebe histórico (últimas 50 mensagens) ao conectar.
 * - Reconecta automaticamente com backoff exponencial.
 * - Envia comandos cifrados com `{ type:"command", enc }`.
 *
 * Nota TLS: tal como o fetch, o WebSocket do React Native valida o
 * certificado TLS por omissão no iOS. O certificado auto-assinado do JARVIS
 * tem de estar instalado e confiado no iPhone (ver README § TLS);
 * NSAllowsLocalNetworking NÃO isenta a validação do certificado.
 */

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class JarvisSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private manualClose = false;

  host: string;
  port: number;
  session: Session | null = null;

  onMessage: MessageHandler = () => {};
  onStatus: StatusHandler = () => {};

  constructor(host: string, port: number, session: Session | null = null) {
    this.host = host;
    this.port = port;
    this.session = session;
  }

  private get url(): string {
    const tok = encodeURIComponent(this.session?.token ?? '');
    return `wss://${this.host}:${this.port}/ws?token=${tok}`;
  }

  connect(): void {
    if (!this.session) {
      this.onStatus('error');
      return;
    }
    this.manualClose = false;
    this.open();
  }

  private open(): void {
    this.onStatus(this.attempt === 0 ? 'connecting' : 'connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.onStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        this.onMessage(msg);
      } catch {
        /* ignora mensagens não-JSON */
      }
    };

    ws.onerror = () => {
      /* onclose tratará o reconnect */
    };

    ws.onclose = () => {
      if (this.manualClose) {
        this.onStatus('disconnected');
        return;
      }
      this.onStatus('disconnected');
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.attempt += 1;
    // Backoff exponencial limitado a 15s.
    const delay = Math.min(1000 * 2 ** (this.attempt - 1), 15000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualClose) this.open();
    }, delay);
  }

  /** Envia texto cifrado como comando. Devolve true se foi enviado. */
  sendCommand(text: string): boolean {
    if (!this.session || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    const enc = encrypt(this.session.sessionKey, text);
    this.ws.send(JSON.stringify({ type: 'command', enc }));
    return true;
  }

  close(): void {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
    this.onStatus('disconnected');
  }
}
