import { encrypt } from './crypto';
import type {
  AutoLoginSession,
  DeviceLoginResponse,
  LoginResponse,
  Session,
} from './types';

/**
 * Cliente HTTP para o JARVIS Dashboard (FastAPI, porta 8000, TLS).
 * Replica os endpoints confirmados em server.py.
 */

function baseUrl(host: string, port: number): string {
  // O servidor usa HTTPS com certificado auto-assinado quando o par
  // config/certs existe (ver server.py _ssl_enabled), senão HTTP.
  // No iOS o fetch valida TLS por omissão; o certificado do JARVIS tem de
  // estar instalado e confiado no iPhone (ver README § TLS).
  return `https://${host}:${port}`;
}

/** POST /login — troca um PIN/chave pontual por um bearer token. */
export async function loginWithPin(
  host: string,
  port: number,
  pin: string,
): Promise<LoginResponse> {
  try {
    const res = await fetch(baseUrl(host, port) + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin.trim().toUpperCase() }),
    });
    const json = (await res.json()) as LoginResponse;
    return json;
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

/** POST /api/device-login — re-login automático com device_token persistente. */
export async function deviceLogin(
  host: string,
  port: number,
  deviceToken: string,
): Promise<DeviceLoginResponse> {
  try {
    const res = await fetch(baseUrl(host, port) + '/api/device-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_token: deviceToken }),
    });
    const json = (await res.json()) as DeviceLoginResponse;
    return json;
  } catch (e) {
    return { ok: false };
  }
}

/** Constrói uma sessão a partir de um login por PIN (chave = PIN). */
export function sessionFromLogin(token: string, pin: string): Session {
  return { token, sessionKey: pin.trim().toUpperCase() };
}

/**
 * GET /auto-login?key=... — o alvo real do QR code.
 *
 * O servidor NÃO devolve JSON: devolve um HTML que corre
 * `sessionStorage.setItem('jarvis_token', ...)`, `jarvis_key` e
 * `localStorage.setItem('jarvis_device_token', ...)`. Extraímos esses três
 * valores por regex para obter sessão + device_token persistente (re-login).
 * Se o link expirou, o HTML contém "Link Expired".
 */
export async function autoLogin(
  host: string,
  port: number,
  key: string,
): Promise<AutoLoginSession> {
  const url = `${baseUrl(host, port)}/auto-login?key=${encodeURIComponent(
    key.trim().toUpperCase(),
  )}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const html = await res.text();
    return parseAutoLoginHtml(html);
  } catch (e) {
    return {
      ok: false,
      token: '',
      key: '',
      deviceToken: '',
      error: describeError(e),
    };
  }
}

/** Extrai o valor de `X.setItem('<name>','<valor>')` de um HTML. */
function extractSetItem(html: string, name: string): string {
  const re = new RegExp(`${name}\\s*'\\s*,\\s*'([^']+)'`);
  const m = html.match(re);
  return m ? m[1] : '';
}

/**
 * Extrai a sessão de emparelhamento do HTML devolvido por `/auto-login`.
 * Função pura (sem rede) — testável e reutilizável por `autoLogin`.
 */
export function parseAutoLoginHtml(
  html: string,
): Pick<AutoLoginSession, 'ok' | 'token' | 'key' | 'deviceToken' | 'error'> {
  if (/Link Expired/i.test(html)) {
    return {
      ok: false,
      token: '',
      key: '',
      deviceToken: '',
      error: 'Código expirado. Gera um novo QR no PC.',
    };
  }
  const token = extractSetItem(html, 'jarvis_token');
  const sessionKey = extractSetItem(html, 'jarvis_key');
  const deviceToken = extractSetItem(html, 'jarvis_device_token');
  if (token && sessionKey && deviceToken) {
    return { ok: true, token, key: sessionKey, deviceToken };
  }
  return {
    ok: false,
    token: '',
    key: '',
    deviceToken: '',
    error: 'Resposta de emparelhamento inesperada.',
  };
}

/** POST /api/command — envia texto cifrado para o assistente. */
export async function sendCommand(
  host: string,
  port: number,
  session: Session,
  text: string,
): Promise<boolean> {
  try {
    const res = await fetch(baseUrl(host, port) + '/api/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ enc: encrypt(session.sessionKey, text) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** POST /api/wake — acorda o assistente sem enviar comando. */
export async function wake(
  host: string,
  port: number,
  session: Session,
): Promise<boolean> {
  try {
    const res = await fetch(baseUrl(host, port) + '/api/wake', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function describeError(e: unknown): string {
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('ssl') ||
      msg.includes('certificate') ||
      msg.includes('tls')
    ) {
      // Falhas TLS/certificado são comummente o certificado auto-assinado do
      // JARVIS ainda não instalado/confiado no iPhone. Ver README § TLS.
      return 'Falha de ligação segura. Instala e confia o certificado do JARVIS no iPhone (ver README) e confirma que estão na mesma rede Wi-Fi.';
    }
    return e.message;
  }
  return 'Erro desconhecido.';
}
