import CryptoJS from 'crypto-js';

// Polyfill global crypto.getRandomValues para React Native / Hermes
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof (globalThis.crypto as any).getRandomValues !== 'function') {
  (globalThis.crypto as any).getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
    if (array) {
      const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  };
}

/**
 * Cifra AES-256-CBC compatível com o backend JARVIS.
 *
 * Contrato confirmado em Mark-LV-main/dashboard/server.py e app.html:
 *  - chave  = SHA256( sessionKey + "JARVIS-DASHBOARD-v1" )
 *  - IV     = 16 bytes aleatórios
 *  - output = base64( IV || ciphertext )
 *
 * O texto simples é codificado como UTF-8 (equivalente a CryptoJS.enc.Utf8.parse).
 */
const AES_SALT = 'JARVIS-DASHBOARD-v1';

export function deriveAesKey(sessionKey: string): CryptoJS.lib.WordArray {
  return CryptoJS.SHA256(sessionKey + AES_SALT);
}

/**
 * Gera um IV aleatório de 16 bytes puro sem depender do módulo nativo do node/browser.
 */
function randomIv(nBytes = 16): CryptoJS.lib.WordArray {
  const words: number[] = [];
  const nWords = Math.ceil(nBytes / 4);
  for (let i = 0; i < nWords; i++) {
    words.push((Math.random() * 0x100000000) | 0);
  }
  return CryptoJS.lib.WordArray.create(words, nBytes);
}

/** Cifra `plaintext` e devolve base64(IV[16] || ciphertext). */
export function encrypt(sessionKey: string, plaintext: string): string {
  const key = deriveAesKey(sessionKey);
  const iv = randomIv(16);
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(plaintext),
    key,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
  );
  // Concatena IV + ciphertext e codifica em base64 (igual ao cliente web).
  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const ctHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  const hex = ivHex + ctHex;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  // Base64 seguro para buffers grandes.
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64Encode(binary);
}

/** Descodifica base64 -> string binária (compatível RN, sem `btoa`). */
function base64Encode(binary: string): string {
  // Em RN não existe `btoa` global garantido; usamos implementação pura.
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let i = 0;
  for (; i + 2 < binary.length; i += 3) {
    const c1 = binary.charCodeAt(i);
    const c2 = binary.charCodeAt(i + 1);
    const c3 = binary.charCodeAt(i + 2);
    output +=
      chars[(c1 >> 2) & 0x3f] +
      chars[(((c1 & 0x3) << 4) | (c2 >> 4)) & 0x3f] +
      chars[(((c2 & 0xf) << 2) | (c3 >> 6)) & 0x3f] +
      chars[c3 & 0x3f];
  }
  if (i < binary.length) {
    const c1 = binary.charCodeAt(i);
    output += chars[(c1 >> 2) & 0x3f];
    if (i + 1 < binary.length) {
      const c2 = binary.charCodeAt(i + 1);
      output +=
        chars[(((c1 & 0x3) << 4) | (c2 >> 4)) & 0x3f] +
        chars[(c2 & 0xf) << 2];
    } else {
      output += chars[(c1 & 0x3) << 4];
    }
  }
  // Padding.
  const pad = (3 - (binary.length % 3)) % 3;
  for (let p = 0; p < pad; p++) output += '=';
  return output;
}