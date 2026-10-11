import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useJarvis } from '@/state/JarvisContext';
import { theme } from '@/theme';
import Constants from 'expo-constants';

const BARCODE_SETTINGS: { barcodeTypes: BarcodeType[] } = { barcodeTypes: ['qr'] };

/**
 * Ecra de emparelhamento.
 * - Modo QR: le um URL `http://HOST:PORT/auto-login?key=XXXX` mostrado no PC.
 * - Modo manual: introduz host/porta + PIN de 6 caracteres.
 */
export default function PairScreen() {
  const router = useRouter();
  const { pairWithPin, pairWithQr, error: contextError } = useJarvis();
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
  const [localError, setLocalError] = useState<string | null>(null);

  // Mostra o erro local ou do contexto (o mais recente)
  const displayError = localError ?? contextError;

  // Emparelhamento manual por PIN (sessao unica, sem re-login persistente).
  const doPairManual = async (h: string, p: number, code: string) => {
    setLocalError(null);
    setBusy(true);
    try {
      const ok = await pairWithPin(h, p, code);
      if (ok) {
        router.replace('/');
      }
      // Se !ok, o erro ja foi colocado no contexto por pairWithPin
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : 'Erro inesperado ao emparelhar.',
      );
    } finally {
      setBusy(false);
    }
  };

  // QR: consome /auto-login e guarda o device_token real (re-login persistente).
  const doPairQr = async (h: string, p: number, code: string) => {
    setLocalError(null);
    setBusy(true);
    try {
      const ok = await pairWithQr(h, p, code);
      if (ok) {
        router.replace('/');
      }
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : 'Erro inesperado ao emparelhar via QR.',
      );
    } finally {
      setBusy(false);
      setScanned(false);
    }
  };

  const onScan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const trimmed = (data || '').trim();
    if (trimmed.startsWith('exp://')) {
      setLocalError(
        'Leste o QR do terminal (Expo Metro). No PC, clica no botão "Remote Control" na janela do JARVIS para ver o QR do assistente, ou usa a aba Manual (PIN: JARVIS).',
      );
      setScanned(false);
      return;
    }
    const parsed = parseAutoLoginUrl(trimmed);
    if (parsed) {
      doPairQr(parsed.host, parsed.port, parsed.key);
    } else {
      setLocalError(
        `Conteúdo lido: "${trimmed.slice(0, 45)}...". Não é um código do JARVIS. Clica em "Remote Control" no JARVIS ou usa a aba Manual (PIN: JARVIS).`,
      );
      setScanned(false);
    }
  };

  const retry = () => {
    setLocalError(null);
    setScanned(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.tabs}>
        <Tab label="QR Code" active={mode === 'qr'} onPress={() => { setMode('qr'); retry(); }} />
        <Tab label="Manual" active={mode === 'manual'} onPress={() => { setMode('manual'); retry(); }} />
      </View>

      {/* Barra de erro visivel */}
      {displayError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{displayError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {mode === 'qr' ? (
        <View style={styles.qrWrap}>
          {!permission?.granted ? (
            <View style={styles.center}>
              <Text style={styles.hint}>Preciso da camara para ler o QR.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                <Text style={styles.primaryBtnText}>Permitir camara</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : onScan}
              barcodeScannerSettings={BARCODE_SETTINGS}
            />
          )}
          {busy ? (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.overlayText}>A emparelhar...</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <Label>Endereco do PC</Label>
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
          <Label>Codigo de emparelhamento (PIN)</Label>
          <TextInput
            style={[styles.input, styles.pinInput]}
            value={pin}
            onChangeText={(t) => setPin(t.toUpperCase())}
            placeholder="JARVIS"
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
            {'No PC, abre o JARVIS → Controlo Remoto → lê o QR ou usa o PIN\n(por omissão: JARVIS).'}
          </Text>

          <View style={styles.certHelpBox}>
            <Text style={styles.certHelpTitle}>Ligação na Rede Local</Text>
            <Text style={styles.certHelpText}>
              A ligação é feita por HTTP direto na porta 8000 (sem necessidade de certificados no iPhone).{'\n\n'}
              • Confirma que o iPhone está ligado ao Wi-Fi do mesmo router onde o PC está ligado por cabo.{'\n'}
              • Não uses redes de convidados (Guest Wi-Fi), pois costumam isolar os dispositivos.
            </Text>
          </View>
        </ScrollView>
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

/** Extrai host/porta/key de um URL `/auto-login?key=...` ou PIN direto. */
export function parseAutoLoginUrl(
  url: string,
): { host: string; port: number; key: string } | null {
  try {
    const raw = (url || '').trim();
    // 1. URL completo com porta: http(s)://HOST:PORT/auto-login?key=XXXX
    const m = raw.match(/https?:\/\/([^/:]+):(\d+)\/auto-login\?[^#]*\bkey=([A-Z0-9]+)/i);
    if (m) return { host: m[1], port: parseInt(m[2], 10), key: m[3].toUpperCase() };

    // 2. URL sem porta (omissao porta 8000)
    const m2 = raw.match(/https?:\/\/([^/:]+)\/auto-login\?[^#]*\bkey=([A-Z0-9]+)/i);
    if (m2) return { host: m2[1], port: 8000, key: m2[2].toUpperCase() };

    // 3. Formato IP:PORT/auto-login?key=...
    const m3 = raw.match(/([^/:]+):(\d+)[^?]*[?&]key=([A-Z0-9]+)/i);
    if (m3) return { host: m3[1], port: parseInt(m3[2], 10), key: m3[3].toUpperCase() };

    // 4. Se o QR for apenas o PIN direto (ex: "JARVIS")
    if (/^[A-Z0-9]{4,8}$/i.test(raw)) {
      const defaultHost = (Constants.expoConfig?.extra?.defaultHost as string) ?? '10.0.0.118';
      const defaultPort = (Constants.expoConfig?.extra?.defaultPort as number) ?? 8000;
      return { host: defaultHost, port: defaultPort, key: raw.toUpperCase() };
    }

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
  errorContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#2a1414',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#4a2020',
  },
  errorText: { color: theme.colors.danger, fontSize: 13, lineHeight: 19 },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
  },
  retryBtnText: { color: theme.colors.text, fontWeight: '600', fontSize: 13 },
  certHelpBox: {
    marginTop: 24,
    padding: 14,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  certHelpTitle: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  certHelpText: {
    color: theme.colors.textDim,
    fontSize: 12,
    lineHeight: 18,
  },
});
