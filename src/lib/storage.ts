import * as SecureStore from 'expo-secure-store';
import type { ConnectionConfig } from './types';

/**
 * Armazenamento seguro (Keychain iOS) do device_token de emparelhamento.
 * A chave AES (session_key) NÃO é persistida — é obtida a cada login via
 * /api/device-login, mantendo o mínimo de segredos no dispositivo.
 */

const KEY_DEVICE_TOKEN = 'jarvis_device_token';
const KEY_HOST = 'jarvis_host';
const KEY_PORT = 'jarvis_port';

export async function saveConnectionConfig(cfg: ConnectionConfig): Promise<void> {
  await SecureStore.setItemAsync(KEY_DEVICE_TOKEN, cfg.deviceToken);
  await SecureStore.setItemAsync(KEY_HOST, cfg.host);
  await SecureStore.setItemAsync(KEY_PORT, String(cfg.port));
}

export async function loadConnectionConfig(): Promise<ConnectionConfig | null> {
  const deviceToken = await SecureStore.getItemAsync(KEY_DEVICE_TOKEN);
  if (!deviceToken) return null;
  const host = (await SecureStore.getItemAsync(KEY_HOST)) ?? '';
  const portRaw = await SecureStore.getItemAsync(KEY_PORT);
  const port = portRaw ? parseInt(portRaw, 10) : 8000;
  return { host, port, deviceToken };
}

export async function clearConnectionConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_DEVICE_TOKEN);
  await SecureStore.deleteItemAsync(KEY_HOST);
  await SecureStore.deleteItemAsync(KEY_PORT);
}
