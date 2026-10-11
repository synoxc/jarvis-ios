import { parseAutoLoginHtml, describeError } from './api';

/**
 * Testes do parsing do HTML de `/auto-login` (alvo do QR code).
 * O HTML abaixo replica o template do server.py, que faz setItem dos tres
 * valores necessarios: token, key (session_key) e device_token.
 */

// Template real do servidor (server.py), com valores de exemplo.
function autoLoginHtml(token: string, key: string, devTok: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
<script>
  sessionStorage.setItem('jarvis_token','${token}');
  sessionStorage.setItem('jarvis_key','${key}');
  localStorage.setItem('jarvis_device_token','${devTok}');
  setTimeout(function(){location.replace('/')},400);
</script>
<p>Connecting to JARVIS...</p>
</body></html>`;
}

const EXPIRED_HTML = `<!DOCTYPE html><html><body>
<h2>Link Expired</h2><p>Press Remote Control in JARVIS to get a new QR code.</p>
</body></html>`;

describe('parseAutoLoginHtml', () => {
  it('extrai token, session_key e device_token do HTML valido', () => {
    const html = autoLoginHtml('sess_tok_123', 'ABC123', 'dev_tok_456');
    const res = parseAutoLoginHtml(html);
    expect(res.ok).toBe(true);
    expect(res.token).toBe('sess_tok_123');
    expect(res.key).toBe('ABC123');
    expect(res.deviceToken).toBe('dev_tok_456');
  });

  it('o device_token e distinto do session_key (nao confundir PIN com token)', () => {
    const html = autoLoginHtml('tok', 'ABC123', 'device-xyz');
    const res = parseAutoLoginHtml(html);
    expect(res.deviceToken).toBe('device-xyz');
    expect(res.deviceToken).not.toBe(res.key);
  });

  it('detecta link expirado', () => {
    const res = parseAutoLoginHtml(EXPIRED_HTML);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/expirado/i);
    expect(res.deviceToken).toBe('');
  });

  it('falha com HTML inesperado (sem os tres valores)', () => {
    const res = parseAutoLoginHtml('<html><body>nada</body></html>');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/inesperada/i);
  });

  it('tolera espacos entre argumentos do setItem', () => {
    const html =
      "sessionStorage.setItem('jarvis_token', 'tk');" +
      "sessionStorage.setItem('jarvis_key', 'K');" +
      "localStorage.setItem('jarvis_device_token', 'dk');";
    const res = parseAutoLoginHtml(html);
    expect(res.ok).toBe(true);
    expect(res.token).toBe('tk');
    expect(res.deviceToken).toBe('dk');
  });
});

describe('describeError', () => {
  it('identifica AbortError como timeout', () => {
    const err = new DOMException('The operation was aborted.', 'AbortError');
    const msg = describeError(err);
    expect(msg).toMatch(/tempo esgotado/i);
    expect(msg).toMatch(/certificado/i);
  });

  it('identifica erros de rede/TLS', () => {
    const err = new TypeError('Network request failed');
    const msg = describeError(err);
    expect(msg).toMatch(/ligacao segura/i);
  });

  it('identifica erro de certificado SSL', () => {
    const err = new Error('SSL certificate problem');
    const msg = describeError(err);
    expect(msg).toMatch(/ligacao segura/i);
  });

  it('identifica erro cancelled (iOS)', () => {
    const err = new Error('cancelled');
    const msg = describeError(err);
    expect(msg).toMatch(/ligacao segura/i);
  });

  it('devolve mensagem original para outros erros', () => {
    const err = new Error('Something else broke');
    const msg = describeError(err);
    expect(msg).toBe('Something else broke');
  });

  it('devolve mensagem generica para valores nao-Error', () => {
    const msg = describeError('string-error');
    expect(msg).toMatch(/desconhecido/i);
  });

  it('devolve mensagem generica para null/undefined', () => {
    expect(describeError(null)).toMatch(/desconhecido/i);
    expect(describeError(undefined)).toMatch(/desconhecido/i);
  });
});
