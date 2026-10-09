import CryptoJS from 'crypto-js';
import { encrypt, deriveAesKey } from './crypto';

/**
 * Testes da cifra AES-256-CBC compatível com o backend JARVIS.
 * Contrato (server.py `_decrypt_cbc`): chave = SHA256(sessionKey+salt),
 * IV 16 bytes aleatório, payload = base64(IV || ciphertext), PKCS7, UTF-8.
 *
 * Estes testes validam o formato e a reversibilidade do lado do cliente.
 * A interoperabilidade real (cliente→servidor) é confirmada pelo servidor
 * Python conseguir desencriptar; aqui reproduzimos a desencriptação com
 * CryptoJS para provar que o nosso output é bem formado.
 */

describe('cifra JARVIS', () => {
  const sessionKey = 'ABC123';
  const plaintext = 'Abre o bloco de notas, por favor.';

  it('deriva uma chave AES-256 (32 bytes) a partir do sessionKey', () => {
    const key = deriveAesKey(sessionKey);
    expect(key.sigBytes).toBe(32);
  });

  it('a mesma sessionKey deriva sempre a mesma chave (determinístico)', () => {
    expect(deriveAesKey(sessionKey).toString()).toBe(
      deriveAesKey(sessionKey).toString(),
    );
  });

  it('produz base64 cujo primeiros 16 bytes são o IV (total >= 32)', () => {
    const out = encrypt(sessionKey, plaintext);
    // Base64 decodificável.
    const raw = CryptoJS.enc.Base64.parse(out);
    expect(raw.sigBytes).toBeGreaterThanOrEqual(32);
    expect((raw.sigBytes - 16) % 16).toBe(0); // ciphertext múltiplo de 16 (PKCS7)
  });

  it('é reversível: desencriptar devolve o texto original', () => {
    const out = encrypt(sessionKey, plaintext);
    const raw = CryptoJS.enc.Base64.parse(out);
    const iv = CryptoJS.lib.WordArray.create(raw.words.slice(0, 4)); // 16 bytes
    const ct = CryptoJS.lib.WordArray.create(raw.words.slice(4));
    const key = deriveAesKey(sessionKey);
    const dec = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: ct }),
      key,
      { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    );
    expect(dec.toString(CryptoJS.enc.Utf8)).toBe(plaintext);
  });

  it('usa IV aleatório: duas cifras do mesmo texto diferem', () => {
    const a = encrypt(sessionKey, plaintext);
    const b = encrypt(sessionKey, plaintext);
    expect(a).not.toBe(b);
  });

  it('sessionKeys diferentes produzem cifras incompatíveis', () => {
    const out = encrypt('ABC123', plaintext);
    const raw = CryptoJS.enc.Base64.parse(out);
    const wrongKey = deriveAesKey('ZZZ999');
    const iv = CryptoJS.lib.WordArray.create(raw.words.slice(0, 4));
    const ct = CryptoJS.lib.WordArray.create(raw.words.slice(4));
    const dec = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: ct }),
      wrongKey,
      { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    );
    // Com a chave errada, a desencriptação falha (exceção UTF-8) ou
    // devolve lixo — nunca o texto original.
    let text: string | null = null;
    try {
      text = dec.toString(CryptoJS.enc.Utf8);
    } catch {
      text = null;
    }
    expect(text).not.toBe(plaintext);
  });
});
