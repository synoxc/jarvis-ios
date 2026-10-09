// Tipos partilhados do protocolo JARVIS Dashboard.
// Espelham os contratos confirmados em Mark-LV-main/dashboard/server.py

/** Estado do assistente devolvido pelo servidor (WS `status`). */
export type AssistantState = 'active' | 'sleeping' | 'processing';

/** Quem produziu uma entrada no histórico de conversa. */
export type Speaker = 'user' | 'jarvis' | 'system';

/** Mensagem recebida pelo WebSocket principal (`/ws`). */
export type ServerMessage =
  | { type: 'log'; speaker: Speaker; text: string }
  | { type: 'status'; state: AssistantState }
  | { type: 'wake' }
  | { type: 'sys'; text: string }
  | { type: 'file_received'; [key: string]: unknown };

/** Mensagem de conversa normalizada para a UI. */
export interface ChatMessage {
  id: string;
  speaker: Speaker;
  text: string;
  /** Timestamp epoch (ms) de quando foi recebida/localmente gerada. */
  ts: number;
}

/** Estado da ligação ao PC. */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/** Configuração de ligação guardada no dispositivo. */
export interface ConnectionConfig {
  /** Host/IP do PC (ex: 192.168.1.42). Sem esquema. */
  host: string;
  /** Porta do dashboard (por omissão 8000). */
  port: number;
  /** Token de dispositivo persistente (device_token), para re-login automático. */
  deviceToken: string;
}

/** Resposta de `POST /login`. */
export interface LoginResponse {
  ok: boolean;
  token?: string;
  error?: string;
}

/**
 * Sessão extraída de `GET /auto-login?key=...` (o alvo do QR code).
 * O servidor devolve um HTML que faz setItem de três valores; aqui
 * capturamos todos para permitir re-login persistente via device_token.
 */
export interface AutoLoginSession {
  ok: boolean;
  /** Bearer token de sessão (sessionStorage 'jarvis_token'). */
  token: string;
  /** Chave AES / session_key (sessionStorage 'jarvis_key'). */
  key: string;
  /** Token de dispositivo persistente (localStorage 'jarvis_device_token'). */
  deviceToken: string;
  /** Erro legível quando o link expirou (HTML 'Link Expired'). */
  error?: string;
}

/** Resposta de `POST /api/device-login`. */
export interface DeviceLoginResponse {
  ok: boolean;
  token?: string;
  key?: string;
}

/** Sessão activa derivada do login (token bearer + chave AES). */
export interface Session {
  token: string;
  sessionKey: string;
}
