import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useJarvis } from '@/state/JarvisContext';
import { theme } from '@/theme';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { status, host, port, paired, disconnect, reconnect } = useJarvis();
  const [speakReplies, setSpeakReplies] = useState(true);
  const [ptPT, setPtPT] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Section title="Ligação">
          <Row label="Estado" value={statusLabel(status)} />
          <Row label="PC" value={`${host || '—'}:${port}`} />
          <Row label="Emparelhado" value={paired ? 'Sim' : 'Não'} />
        </Section>

        <Section title="Voz">
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Ler respostas em voz alta</Text>
            <Switch
              value={speakReplies}
              onValueChange={setSpeakReplies}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Reconhecimento em Português (PT)</Text>
            <Switch
              value={ptPT}
              onValueChange={setPtPT}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>
          <Text style={styles.note}>
            O reconhecimento e a voz usam sempre Português de Portugal (pt-PT),
            consistente com o núcleo JARVIS.
          </Text>
        </Section>

        <Section title="Conta e segurança">
          <Text style={styles.note}>
            As credenciais ficam no Keychain do iOS. O JARVIS nunca guarda
            palavras-passe do PC nem chaves de API.
          </Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => reconnect()}>
            <Text style={styles.secondaryBtnText}>Religar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.colors.danger }]}
            onPress={async () => {
              await disconnect();
              router.replace('/pair');
            }}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.colors.danger }]}>
              Desemparelhar dispositivo
            </Text>
          </TouchableOpacity>
        </Section>

        <Section title="Sobre">
          <Row label="App" value="JARVIS iOS" />
          <Row label="Versão" value={Constants.expoConfig?.version ?? '1.0.0'} />
          <Row label="Backend" value="Dashboard FastAPI (porta 8000, TLS)" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'connected':
      return 'Ligado';
    case 'connecting':
      return 'A ligar…';
    case 'error':
      return 'Erro';
    default:
      return 'Desligado';
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: { color: theme.colors.textDim, fontSize: 14 },
  rowValue: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleLabel: { color: theme.colors.text, fontSize: 15 },
  note: { color: theme.colors.textDim, fontSize: 12, lineHeight: 18, marginTop: 8 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtnText: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
});
