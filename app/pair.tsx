import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useJarvis } from '@/state/JarvisContext';
import { theme } from '@/theme';
import Constants from 'expo-constants';

/**
 * Ecrã de emparelhamento.
 * - Modo QR: lê um URL `https://HOST:PORT/auto-login?key=XXXX` mostrado no PC.
 * - Modo manual: introduz host/porta + PIN de 6 caracteres.
 */
export default function PairScreen() {
  const router = useRouter();
  const { pairWithPin, pairWithQr } = useJarvis();
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<'qr' | 'manual'>('qr');
  const [host, setHost] = useState(
    (Constants.expoConfig?.extra?.defaultHost as string) ?? '192.168.1.100',
  );
  const [port, setPort] = useState(
    String((Constants.expoConfig?.extra?.defaultPort as number) ?? 8000),
  );
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Emparelhamento manual por PIN (sessão única, sem re-login persistente).
  const doPairManual = async (h: string, p: number, code: string) => {
    setBusy(true);
    const ok = await pairWithPin(h, p, code);
    setBusy(false);
    if (ok) router.replace('/');
  };

  // QR: consome /auto-login e guarda o device_token real (re-login persistente).
  const doPairQr = async (h: string, p: number, code: string) => {
    setBusy(true);
    const ok = await pairWithQr(h, p, code);
    setBusy(false);
    if (ok) router.replace('/');
  };

  const onScan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const parsed = parseAutoLoginUrl(data);
    if (parsed) {
      doPairQr(parsed.host, parsed.port, parsed.key);
    } else {
      setScanned(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.tabs}>
        <Tab label="QR Code" active={mode === 'qr'} onPress={() => setMode('qr')} />
        <Tab label="Manual" active={mode === 'manual'} onPress={() => setMode('manual')} />
      </View>

      {mode === 'qr' ? (
        <View style={styles.qrWrap}>
          {!permission?.granted ? (
            <View style={styles.center}>
              <Text style={styles.hint}>Preciso da câmara para ler o QR.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                <Text style={styles.primaryBtnText}>Permitir câmara</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : onScan}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
          )}
          {busy ? (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.overlayText}>A emparelhar…</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.form}>
          <Label>Endereço do PC</Label>
          <TextInput
            style={styles.input}
            value={host}
            onChangeText={setHost}
            placeholder="192.168.1.42"
            placeholderTextColor={theme.colors.textDim}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
          <Label>Porta</Label>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="8000"
            placeholderTextColor={theme.colors.textDim}
            keyboardType="number-pad"
          />
          <Label>Código de emparelhamento (PIN)</Label>
          <TextInput
            style={[styles.input, styles.pinInput]}
            value={pin}
            onChangeText={(t) => setPin(t.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={theme.colors.textDim}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={() => doPairManual(host.trim(), parseInt(port, 10) || 8000, pin)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.bg} />
            ) : (
              <Text style={styles.primaryBtnText}>Emparelhar</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.help}>
            No PC, abre o JARVIS → Controlo Remoto → lê o QR ou o código de 6
            caracteres.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && { color: theme.colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** Extrai host/porta/key de um URL `/auto-login?key=...`. */
export function parseAutoLoginUrl(
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
  },
  tabActive: { borderWidth: 1, borderColor: theme.colors.primary },
  tabText: { color: theme.colors.textDim, fontWeight: '600' },
  qrWrap: { flex: 1, margin: 12, borderRadius: theme.radius.lg, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { color: theme.colors.textDim, marginBottom: 16, textAlign: 'center' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7,9,15,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: { color: theme.colors.text, marginTop: 12 },
  form: { padding: 16 },
  label: { color: theme.colors.textDim, fontSize: 13, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 16,
  },
  pinInput: { letterSpacing: 6, fontSize: 20, textAlign: 'center', fontWeight: '700' },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
  help: { color: theme.colors.textDim, fontSize: 12, marginTop: 16, lineHeight: 18 },
});

