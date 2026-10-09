import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import {
  isAvailable,
  requestAuthorization,
  readToday,
  type HealthSnapshot,
} from '@/lib/health';

/**
 * Ecrã de Fitness (HealthKit).
 *
 * LIMITAÇÃO HONESTA: só funciona num development build com iPhone físico.
 * Em Expo Go / simulador, mostra o aviso de indisponibilidade em vez de dados
 * fictícios. Nunca inventa valores.
 */
export default function FitnessScreen() {
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthorized(isAvailable());
  }, []);

  const load = async () => {
    setLoading(true);
    const ok = await requestAuthorization();
    setAuthorized(ok);
    if (ok) {
      setData(await readToday());
    }
    setLoading(false);
  };

  if (!authorized) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>Fitness</Text>
          {isAvailable() ? (
            <>
              <Text style={styles.sub}>
                Autoriza o acesso aos teus dados de atividade para o JARVIS os
                poder consultar.
              </Text>
              <TouchableOpacity
                style={[styles.btn, loading && { opacity: 0.6 }]}
                onPress={load}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.bg} />
                ) : (
                  <Text style={styles.btnText}>Autorizar e ver dados</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.warn}>
              HealthKit indisponível. Esta funcionalidade requer um development
              build instalado num iPhone físico (não funciona em Expo Go nem no
              simulador). Consulta o README, secção "Fitness / HealthKit".
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Atividade de hoje</Text>
        <View style={styles.grid}>
          <Stat label="Passos" value={data ? formatNumber(data.steps) : '—'} icon="👟" />
          <Stat
            label="Distância"
            value={data ? `${(data.distanceMeters / 1000).toFixed(2)} km` : '—'}
            icon="📍"
          />
          <Stat
            label="Energia activa"
            value={data ? `${Math.round(data.activeEnergyKcal)} kcal` : '—'}
            icon="🔥"
          />
          <Stat
            label="Treinos (7 dias)"
            value={data ? String(data.workoutsLastWeek) : '—'}
            icon="🏋️"
          />
        </View>
        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={load} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.colors.bg} />
          ) : (
            <Text style={styles.btnText}>Atualizar</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.privacy}>
          Os dados são lidos do teu iPhone e nunca enviados para o PC sem
          autorização explícita.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('pt-PT');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  sub: { color: theme.colors.textDim, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  warn: {
    color: theme.colors.warning,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    width: '47%',
    alignItems: 'center',
  },
  cardIcon: { fontSize: 28 },
  cardValue: { color: theme.colors.primary, fontSize: 20, fontWeight: '700', marginTop: 6 },
  cardLabel: { color: theme.colors.textDim, fontSize: 12, marginTop: 2 },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
  privacy: { color: theme.colors.textDim, fontSize: 12, marginTop: 16, textAlign: 'center', lineHeight: 18 },
});
