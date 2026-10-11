import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import {
  isAvailable,
  requestAuthorization,
  readToday,
  type HealthSnapshot,
} from '@/lib/health';
import { useJarvis } from '@/state/JarvisContext';

export default function FitnessScreen() {
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const { sendText } = useJarvis();

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

  const sendToJarvis = () => {
    if (!data) return;
    const km = (data.distanceMeters / 1000).toFixed(2);
    const kcal = Math.round(data.activeEnergyKcal);
    const msg = `[Apple Fitness] Resumo do meu dia: dei ${data.steps.toLocaleString('pt-PT')} passos, percorri ${km} km e queimei ${kcal} kcal em atividade física. Dá-me a tua análise e conselho de saúde, Jarvis.`;
    sendText(msg);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>APPLE FITNESS</Text>
          <Text style={styles.sub}>
            Monitorização de saúde e atividade física sincronizada com o JARVIS.
          </Text>
        </View>

        {!authorized ? (
          <View style={styles.cardBox}>
            <Text style={styles.cardTitle}>Acesso ao HealthKit</Text>
            <Text style={styles.cardDesc}>
              {isAvailable()
                ? 'Autoriza o acesso aos teus dados de atividade para o JARVIS te dar relatórios e conselhos de treino.'
                : 'O HealthKit real da Apple requer compilação nativa. Podes testar o envio de dados simulados para o JARVIS avaliar.'}
            </Text>

            {isAvailable() ? (
              <TouchableOpacity
                style={[styles.btn, loading && { opacity: 0.6 }]}
                onPress={load}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#070b13" />
                ) : (
                  <Text style={styles.btnText}>Autorizar Saúde</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => {
                  setData({
                    steps: 8420,
                    distanceMeters: 6150,
                    activeEnergyKcal: 480,
                    workoutsLastWeek: 3,
                  });
                  setAuthorized(true);
                }}
              >
                <Text style={styles.demoBtnText}>Carregar Demonstração</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <Stat label="Passos Hoje" value={data ? data.steps.toLocaleString('pt-PT') : '0'} icon="👟" />
              <Stat
                label="Distância"
                value={data ? `${(data.distanceMeters / 1000).toFixed(2)} km` : '0 km'}
                icon="📍"
              />
              <Stat
                label="Calorias Ativas"
                value={data ? `${Math.round(data.activeEnergyKcal)} kcal` : '0 kcal'}
                icon="🔥"
              />
              <Stat
                label="Treinos (7 dias)"
                value={data ? String(data.workoutsLastWeek) : '0'}
                icon="🏋️"
              />
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={sendToJarvis}>
              <Text style={styles.actionBtnText}>Pedir Análise ao JARVIS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={load}
              disabled={loading}
            >
              <Text style={styles.refreshBtnText}>Atualizar Dados</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050811' },
  container: { padding: 18 },
  header: { marginBottom: 20 },
  title: {
    color: '#22d3ee',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: theme.font.mono,
  },
  sub: { color: '#64748b', fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardBox: {
    backgroundColor: '#0c1322',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  cardTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  cardDesc: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btn: {
    backgroundColor: '#22d3ee',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  btnText: { color: '#070b13', fontWeight: '800', fontSize: 15 },
  demoBtn: {
    backgroundColor: '#083344',
    borderWidth: 1,
    borderColor: '#22d3ee',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  demoBtnText: { color: '#22d3ee', fontWeight: '700', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    backgroundColor: '#0c1322',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    width: '48%',
    alignItems: 'center',
  },
  statIcon: { fontSize: 26 },
  statValue: { color: '#22d3ee', fontSize: 19, fontWeight: '800', marginTop: 8 },
  statLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', marginTop: 4 },
  actionBtn: {
    backgroundColor: '#22d3ee',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  actionBtnText: { color: '#070b13', fontWeight: '800', fontSize: 15 },
  refreshBtn: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  refreshBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
});