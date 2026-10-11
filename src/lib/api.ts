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

/** Tempo maximo (ms) para qualquer pedido de rede antes de abortar. */
const FETCH_TIMEOUT_MS = 15_000;

function baseUrl(host: string, port: number): string {
  // O servidor corre em HTTP simples (sem SSL) na porta 8000.
  // A segurança é feita na camada aplicacional (AES-256-CBC + tokens).
  return `http://${host}:${port}`;
}

/**
 * fetch() com timeout via AbortController.
 * Garante que nenhum pedido fica pendurado indefinidamente (ex: TLS handshake
 * que demora 60 s no iOS quando o certificado nao e confiado).
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** POST /login -- troca um PIN/chave pontual por um bearer token. */
export async function loginWithPin(
  host: string,
  port: number,
  pin: string,
): Promise<LoginResponse> {
  try {
    const res = await fetchWithTimeout(baseUrl(host, port) + '/login', {
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

/** POST /api/device-login -- re-login automatico com device_token persistente. */
export async function deviceLogin(
  host: string,
  port: number,
  deviceToken: string,
): Promise<DeviceLoginResponse> {
  try {
    const res = await fetchWithTimeout(baseUrl(host, port) + '/api/device-login', {
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

/** Constroi uma sessao a partir de um login por PIN (chave = PIN). */
export function sessionFromLogin(token: string, pin: string): Session {
  return { token, sessionKey: pin.trim().toUpperCase() };
}

/**
 * GET /auto-login?key=... -- o alvo real do QR code.
 *
 * O servidor NAO devolve JSON: devolve um HTML que corre
 * `sessionStorage.setItem('jarvis_token', ...)`, `jarvis_key` e
 * `localStorage.setItem('jarvis_device_token', ...)`. Extraimos esses tres
 * valores por regex para obter sessao + device_token persistente (re-login).
 * Se o link expirou, o HTML contem "Link Expired".
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
    const res = await fetchWithTimeout(url, { method: 'GET' });
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
 * Extrai a sessao de emparelhamento do HTML devolvido por `/auto-login`.
 * Funcao pura (sem rede) -- testavel e reutilizavel por `autoLogin`.
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
      error: 'Codigo expirado. Gera um novo QR no PC.',
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

/** POST /api/command -- envia texto cifrado para o assistente. */
export async function sendCommand(
  host: string,
  port: number,
  session: Session,
  text: string,
): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(baseUrl(host, port) + '/api/command', {
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

/** POST /api/wake -- acorda o assistente sem enviar comando. */
export async function wake(
  host: string,
  port: number,
  session: Session,
): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(baseUrl(host, port) + '/api/wake', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function describeError(e: unknown): string {
  if (e && typeof e === 'object') {
    const errObj = e as { name?: string; message?: string };
    // AbortController timeout
    if (errObj.name === 'AbortError') {
      return (
        'Tempo esgotado. Verifica que o iPhone e o PC estao na mesma rede Wi-Fi ' +
        'e que o certificado do JARVIS esta instalado e confiado no iPhone ' +
        '(Definicoes > Geral > Acerca > Certificados Fidedignos).'
      );
    }

    const msg = (errObj.message || '').toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('ssl') ||
      msg.includes('certificate') ||
      msg.includes('tls') ||
      msg.includes('secure connection') ||
      msg.includes('ats') ||
      msg.includes('cancelled')
    ) {
      return (
        'Falha de ligacao segura. Instala e confia o certificado do JARVIS no iPhone:\n' +
        '1. Abre https://(IP do PC):8000 no Safari do iPhone\n' +
        '2. Aceita o aviso de certificado\n' +
        '3. Definicoes > Perfil Transferido > instala\n' +
        '4. Definicoes > Geral > Acerca > Certificados Fidedignos > ativa\n' +
        'Confirma que estao na mesma rede Wi-Fi.'
      );
    }
    if (errObj.message) {
      return errObj.message;
    }
  }
  return 'Erro desconhecido.';
}
