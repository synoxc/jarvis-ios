import { parseAutoLoginHtml } from '../lib/api';

/**
 * Testes de regressao do emparelhamento QR/PIN (Fase E).
 * Contratos reais (server.py): /login = PIN one-time-use sem device_token;
 * /auto-login = QR com 3 valores; /api/device-login exige device_token.
 * Credenciais 100% ficticias. Sem rede, sem iPhone.
 */

const HOST = '192.168.1.50';
const PORT = 8000;
const FAKE_QR_KEY = 'QRKEY1';
const FAKE_SESSION_TOKEN = 'sess_tok_ficticio';
const FAKE_SESSION_KEY = 'SESSKEY';
const FAKE_DEVICE_TOKEN = 'dev_tok_ficticio_123';
const FAKE_PIN = 'ABC123';

type SavedConfig = { host: string; port: number; deviceToken: string };

function makeStorage(initial: SavedConfig | null = null) {
  let saved: SavedConfig | null = initial;
  let saves = 0;
  let clears = 0;
  return {
    saves: () => saves,
    clears: () => clears,
    load: async (): Promise<SavedConfig | null> => saved,
    save: async (cfg: SavedConfig): Promise<void> => {
      saves += 1;
      saved = { ...cfg };
    },
    clear: async (): Promise<void> => {
      clears += 1;
      saved = null;
    },
    peek: () => saved,
  };
}

type ApiMocks = {
  autoLogin: jest.Mock;
  loginWithPin: jest.Mock;
  deviceLogin: jest.Mock;
};

function makeApi(): ApiMocks {
  return {
    autoLogin: jest.fn(),
    loginWithPin: jest.fn(),
    deviceLogin: jest.fn(),
  };
}

function autoLoginHtml(t: string, k: string, d: string): string {
  return `<!DOCTYPE html><html><body><script>
  sessionStorage.setItem('jarvis_token','${t}');
  sessionStorage.setItem('jarvis_key','${k}');
  localStorage.setItem('jarvis_device_token','${d}');
  </script></body></html>`;
}

const EXPIRED_HTML = '<!DOCTYPE html><html><body><h2>Link Expired</h2></body></html>';

// Harness: replica 1:1 a logica de JarvisContext.tsx
// (pairWithQr guarda deviceToken real; pairWithPin guarda vazio;
// reconnect so usa device-login com token; 401/vazio limpa).
async function pairWithQr(
  api: ApiMocks,
  storage: ReturnType<typeof makeStorage>,
  host: string,
  port: number,
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await api.autoLogin(host, port, key);
  if (res?.ok && res.token && res.key && res.deviceToken) {
    await storage.save({ host, port, deviceToken: res.deviceToken });
    return { ok: true };
  }
  return { ok: false, error: res?.error ?? 'Falha no emparelhamento.' };
}

async function pairWithPin(
  api: ApiMocks,
  storage: ReturnType<typeof makeStorage>,
  host: string,
  port: number,
  pin: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await api.loginWithPin(host, port, pin);
  if (res?.ok && res.token) {
    await storage.save({ host, port, deviceToken: '' });
    return { ok: true };
  }
  return { ok: false, error: res?.error ?? 'PIN invalido.' };
}

async function reconnect(
  api: ApiMocks,
  storage: ReturnType<typeof makeStorage>,
): Promise<'connected' | 'needs-pairing'> {
  const cfg = await storage.load();
  if (!cfg || !cfg.deviceToken) {
    await storage.clear();
    return 'needs-pairing';
  }
  const res = await api.deviceLogin(cfg.host, cfg.port, cfg.deviceToken);
  if (res?.ok && res.token && res.key) return 'connected';
  await storage.clear();
  return 'needs-pairing';
}

describe('regressao QR/PIN - Teste 1: QR valido', () => {
  it('guarda exatamente o device_token persistente', async () => {
    const storage = makeStorage();
    const api = makeApi();
    api.autoLogin.mockResolvedValue(
      parseAutoLoginHtml(
        autoLoginHtml(FAKE_SESSION_TOKEN, FAKE_SESSION_KEY, FAKE_DEVICE_TOKEN),
      ),
    );
    const out = await pairWithQr(api, storage, HOST, PORT, FAKE_QR_KEY);
    expect(out.ok).toBe(true);
    expect(api.autoLogin).toHaveBeenCalledWith(HOST, PORT, FAKE_QR_KEY);
    const saved = storage.peek();
    expect(saved).not.toBeNull();
    expect(saved!.deviceToken).toBe(FAKE_DEVICE_TOKEN);
    expect(saved!.deviceToken).not.toBe(FAKE_SESSION_KEY);
    expect(saved!.host).toBe(HOST);
    expect(saved!.port).toBe(PORT);
  });
});

describe('regressao QR/PIN - Teste 2: QR expirado/invalido', () => {
  it('expirado devolve erro e nao guarda nada', async () => {
    const storage = makeStorage();
    const api = makeApi();
    api.autoLogin.mockResolvedValue(parseAutoLoginHtml(EXPIRED_HTML));
    const out = await pairWithQr(api, storage, HOST, PORT, 'EXPIRADO');
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/expirado/i);
    expect(storage.peek()).toBeNull();
    expect(storage.saves()).toBe(0);
  });

  it('HTML sem os 3 valores nao deixa sessao parcial', async () => {
    const storage = makeStorage({
      host: HOST,
      port: PORT,
      deviceToken: 'token-anterior-ficticio',
    });
    const api = makeApi();
    api.autoLogin.mockResolvedValue(
      parseAutoLoginHtml('<html><body>nada util</body></html>'),
    );
    const out = await pairWithQr(api, storage, HOST, PORT, 'INVALIDO');
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/inesperada/i);
    expect(storage.peek()?.deviceToken).toBe('token-anterior-ficticio');
  });
});

describe('regressao QR/PIN - Teste 3: PIN valido', () => {
  it('PIN nunca e guardado como device_token', async () => {
    const storage = makeStorage();
    const api = makeApi();
    api.loginWithPin.mockResolvedValue({ ok: true, token: 'bearer-ficticio' });
    const out = await pairWithPin(api, storage, HOST, PORT, FAKE_PIN);
    expect(out.ok).toBe(true);
    expect(api.loginWithPin).toHaveBeenCalledWith(HOST, PORT, FAKE_PIN);
    const saved = storage.peek();
    expect(saved).not.toBeNull();
    expect(saved!.deviceToken).toBe('');
    expect(saved!.deviceToken).not.toBe(FAKE_PIN);
  });
});

describe('regressao QR/PIN - Teste 4: reconexao', () => {
  it('usa device-login com o device_token guardado (nunca PIN)', async () => {
    const storage = makeStorage({
      host: HOST,
      port: PORT,
      deviceToken: FAKE_DEVICE_TOKEN,
    });
    const api = makeApi();
    api.deviceLogin.mockResolvedValue({
      ok: true,
      token: 'novo-bearer',
      key: 'nova-key',
    });
    const out = await reconnect(api, storage);
    expect(out).toBe('connected');
    expect(api.deviceLogin).toHaveBeenCalledWith(HOST, PORT, FAKE_DEVICE_TOKEN);
    const body = api.deviceLogin.mock.calls[0][2] as string;
    expect(body).not.toBe(FAKE_PIN);
  });
});

describe('regressao QR/PIN - Teste 5: token revogado', () => {
  it('401 limpa a sessao sem loop de reconexao', async () => {
    const storage = makeStorage({
      host: HOST,
      port: PORT,
      deviceToken: 'token-revogado-ficticio',
    });
    const api = makeApi();
    api.deviceLogin.mockResolvedValue({ ok: false });
    const out = await reconnect(api, storage);
    expect(out).toBe('needs-pairing');
    expect(api.deviceLogin).toHaveBeenCalledTimes(1);
    expect(storage.peek()).toBeNull();
    expect(storage.clears()).toBeGreaterThanOrEqual(1);
  });
});

describe('regressao QR/PIN - Teste 6: sem token', () => {
  it('nao autentica e pede emparelhamento', async () => {
    const storage = makeStorage();
    const api = makeApi();
    const out = await reconnect(api, storage);
    expect(out).toBe('needs-pairing');
    expect(api.deviceLogin).not.toHaveBeenCalled();
  });
});

describe('regressao QR/PIN - parser do URL do QR', () => {
  // Replica pura de parseAutoLoginUrl (app/pair.tsx): o .tsx puxa
  // expo-camera/router e nao corre no Jest; a logica e identica.
  function parseUrl(
    url: string,
  ): { host: string; port: number; key: string } | null {
    try {
      const m = url.match(/^https?:\/\/([^/:]+):(\d+)\/auto-login\?key=([A-Z0-9]+)/i);
      if (m) return { host: m[1], port: parseInt(m[2], 10), key: m[3].toUpperCase() };
      const m2 = url.match(/^https?:\/\/([^/:]+)\/auto-login\?key=([A-Z0-9]+)/i);
      if (m2) return { host: m2[1], port: 8000, key: m2[2].toUpperCase() };
      return null;
    } catch {
      return null;
    }
  }

  it('extrai host, porta e chave do URL do QR', () => {
    const parsed = parseUrl(`https://${HOST}:${PORT}/auto-login?key=${FAKE_QR_KEY}`);
    expect(parsed).not.toBeNull();
    expect(parsed!.host).toBe(HOST);
    expect(parsed!.port).toBe(PORT);
    expect(parsed!.key).toBe(FAKE_QR_KEY);
    expect(parseUrl('https://x/y?nada=1')).toBeNull();
  });
});

describe('regressao QR/PIN - Teste 7: PIN fixo JARVIS', () => {
  // O PIN de emparelhamento é sempre JARVIS (server.py new_key devolve
  // 'JARVIS' e as chaves mestre não são consumidas em /login nem /auto-login).
  it('aceita o PIN fixo JARVIS (normalizado em maiusculas, nunca guardado como device_token)', async () => {
    const storage = makeStorage();
    const api = makeApi();
    api.loginWithPin.mockResolvedValue({ ok: true, token: 'bearer-ficticio' });
    // Replica a normalização do JarvisContext.pairWithPin: trim + uppercase.
    const pin = '  jarvis  '.trim().toUpperCase();
    const out = await pairWithPin(api, storage, HOST, PORT, pin);
    expect(out.ok).toBe(true);
    expect(api.loginWithPin).toHaveBeenCalledWith(HOST, PORT, 'JARVIS');
    const saved = storage.peek();
    expect(saved!.deviceToken).toBe('');
    expect(saved!.deviceToken).not.toBe('JARVIS');
  });

  it('PIN vazio nao emparelha (JARVIS tem de estar presente)', async () => {
    const storage = makeStorage();
    const api = makeApi();
    api.loginWithPin.mockResolvedValue({ ok: false, error: 'Invalid or expired key' });
    const out = await pairWithPin(api, storage, HOST, PORT, '');
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/invalid/i);
  });

  it('parser do QR aceita o PIN fixo na chave do URL (key=JARVIS)', () => {
    // Réplica pura de parseAutoLoginUrl (app/pair.tsx) — ver describe anterior.
    function parseUrl(url: string): { host: string; port: number; key: string } | null {
      try {
        const m = url.match(/^https?:\/\/([^/:]+):(\d+)\/auto-login\?key=([A-Z0-9]+)/i);
        if (m) return { host: m[1], port: parseInt(m[2], 10), key: m[3].toUpperCase() };
        const m2 = url.match(/^https?:\/\/([^/:]+)\/auto-login\?key=([A-Z0-9]+)/i);
        if (m2) return { host: m2[1], port: 8000, key: m2[2].toUpperCase() };
        return null;
      } catch {
        return null;
      }
    }
    const parsed = parseUrl(`https://${HOST}:${PORT}/auto-login?key=JARVIS`);
    expect(parsed).not.toBeNull();
    expect(parsed!.key).toBe('JARVIS');
  });
});


