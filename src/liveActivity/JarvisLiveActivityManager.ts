// Manager da Live Activity (Dynamic Island) do JARVIS.
//
// Padrão defensivo de src/lib/voice.ts: `expo-widgets` chama requireNativeModule
// no topo do módulo e, dentro do Expo Go (sem módulo nativo), rebenta ao ser
// importado. Carregamos o factory com require() guardado — a app arranca
// sempre, o chat/emparelhamento/voz continuam a funcionar e a Live Activity
// fica sinalizada como indisponível (ver isLiveActivityAvailable).
//
// API confirmada em node_modules/expo-widgets (SDK 57):
//   - createLiveActivity(name, component) -> LiveActivityFactory
//   - factory.start(props, url?, staleDate?) -> LiveActivity (síncrono)
//   - factory.getInstances() -> LiveActivity[] (anti-duplicação)
//   - activity.update(props, staleDate?) -> Promise<void>
//   - activity.end(dismissalPolicy) -> Promise<void>  ('default' | 'immediate')
import type { LiveActivity, LiveActivityFactory } from 'expo-widgets';
import type {
  JARVISAttributes,
  JarvisLiveActivityConfig,
  JarvisLiveActivityState,
} from './types';

// O JarvisContext importa o tipo a partir daqui — reexportamos para manter
// um único contrato (a definição canónica vive em ./types).
export type { JarvisLiveActivityState } from './types';

/** Snapshot do estado da app que alimenta o mapeamento da Live Activity. */
export interface JarvisLiveActivitySource {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  assistantState: 'active' | 'sleeping' | 'processing';
  voiceMode: 'idle' | 'dictating' | 'live-audio' | 'speaking';
}

// ---------------------------------------------------------------------------
// Carregamento defensivo do factory nativo (nulo no Expo Go).
// ---------------------------------------------------------------------------
type JarvisFactory = LiveActivityFactory<JARVISAttributes>;

let factory: JarvisFactory | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('./JarvisLiveActivity') as {
    JarvisLiveActivityFactory?: JarvisFactory;
  };
  factory = mod?.JarvisLiveActivityFactory ?? null;
} catch {
  factory = null;
}

/** `true` quando a Live Activity nativa está disponível (build nativa). */
export function isLiveActivityAvailable(): boolean {
  return factory != null;
}

/** Motivo honesto mostrado ao utilizador quando a Live Activity não existe. */
export const LIVE_ACTIVITY_UNAVAILABLE_MESSAGE =
  'Dynamic Island indisponível na Expo Go (Live Activity exige o módulo nativo expo-widgets, que a Expo Go não inclui). Disponível apenas em builds nativas.';

// ---------------------------------------------------------------------------
// Rótulos (pt-PT) por estado — identidade visual do JARVIS.
// ---------------------------------------------------------------------------
export const JARVIS_LIVE_ACTIVITY_CONFIG: JarvisLiveActivityConfig = {
  inactiveLabel: 'Em espera',
  inactiveSummary: 'JARVIS pronto',
  connectingLabel: 'A ligar',
  connectingSummary: 'A ligar ao PC…',
  listeningLabel: 'A ouvir',
  listeningSummary: 'A ouvir-te',
  processingLabel: 'A processar',
  processingSummary: 'A pensar…',
  speakingLabel: 'A falar',
  speakingSummary: 'A responder',
  errorLabel: 'Sem ligação',
  errorSummary: 'Falha na ligação ao PC',
};

/** Constrói os atributos completos de um estado puro. */
export function attributesForState(
  state: JarvisLiveActivityState,
  modeLabel?: string,
): JARVISAttributes {
  const c = JARVIS_LIVE_ACTIVITY_CONFIG;
  switch (state) {
    case 'connecting':
      return {
        state,
        stateLabel: c.connectingLabel,
        summary: c.connectingSummary,
        modeLabel: modeLabel ?? 'idle',
      };
    case 'listening':
      return {
        state,
        stateLabel: c.listeningLabel,
        summary: c.listeningSummary,
        modeLabel: modeLabel ?? 'listening',
      };
    case 'processing':
      return {
        state,
        stateLabel: c.processingLabel,
        summary: c.processingSummary,
        modeLabel: modeLabel ?? 'idle',
      };
    case 'speaking':
      return {
        state,
        stateLabel: c.speakingLabel,
        summary: c.speakingSummary,
        modeLabel: modeLabel ?? 'speaking',
      };
    case 'error':
      return {
        state,
        stateLabel: c.errorLabel,
        summary: c.errorSummary,
        modeLabel: modeLabel ?? 'idle',
      };
    case 'inactive':
    default:
      return {
        state: 'inactive',
        stateLabel: c.inactiveLabel,
        summary: c.inactiveSummary,
        modeLabel: modeLabel ?? 'idle',
      };
  }
}

/**
 * Mapeia o estado real da app (ligação + assistente + voz) para o estado da
 * Live Activity, por ordem de prioridade — nunca simula escuta ativa:
 * sem voz activa e sem processamento, o JARVIS aparece "Em espera".
 */
export function mapToJarvisLiveActivityAttributes(
  source: JarvisLiveActivitySource,
): JARVISAttributes {
  const { status, assistantState, voiceMode } = source;
  if (status === 'connecting') return attributesForState('connecting');
  if (status === 'error') return attributesForState('error');
  if (status === 'disconnected') return attributesForState('inactive');
  // status === 'connected' — decide pela voz/assistente:
  if (voiceMode === 'speaking') return attributesForState('speaking', 'speaking');
  if (voiceMode === 'dictating') return attributesForState('listening', 'dictating');
  if (voiceMode === 'live-audio') return attributesForState('listening', 'live-audio');
  if (assistantState === 'processing') return attributesForState('processing');
  // 'active' ou 'sleeping' sem interação de voz: em espera (honesto).
  return attributesForState('inactive');
}

// ---------------------------------------------------------------------------
// Instância actual — evita actividades duplicadas na Dynamic Island.
// ---------------------------------------------------------------------------
let currentActivity: LiveActivity<JARVISAttributes> | null = null;
let pendingStart: Promise<boolean> | null = null;

/**
 * Inicia (ou reaproveita) a Live Activity do JARVIS.
 * Devolve `false` quando o suporte nativo não existe ou falha — nunca lança,
 * para não impedir o chat, o emparelhamento ou a voz.
 */
export async function startJarvisLiveActivity(
  attrs: JARVISAttributes,
): Promise<boolean> {
  if (!factory) return false;
  // Arranque concorrente (ex: StrictMode chama o effect duas vezes):
  // partilhamos a mesma promessa em vez de criar duas actividades.
  if (pendingStart) return pendingStart;

  pendingStart = (async () => {
    try {
      // Reaproveita instâncias órfãs (ex: app recarregada) — anti-duplicação.
      const instances = factory.getInstances();
      if (instances.length > 0) {
        currentActivity = instances[instances.length - 1];
        await currentActivity.update(attrs);
        return true;
      }
      currentActivity = factory.start(attrs);
      return true;
    } catch (e) {
      currentActivity = null;
      console.warn('[JarvisLiveActivity] Falha ao iniciar a Live Activity.', String(e));
      return false;
    } finally {
      pendingStart = null;
    }
  })();
  return pendingStart;
}

/** Atualiza os atributos da actividade, se existir. Nunca lança. */
export async function updateJarvisLiveActivityAttributes(
  attrs: JARVISAttributes,
): Promise<boolean> {
  if (!factory || !currentActivity) return false;
  try {
    await currentActivity.update(attrs);
    return true;
  } catch (e) {
    console.warn('[JarvisLiveActivity] Falha ao atualizar a Live Activity.', String(e));
    return false;
  }
}

/** Conveniente para o contexto: atualiza a partir de um estado puro. */
export async function updateJarvisLiveActivityState(
  state: JarvisLiveActivityState,
  modeLabel?: string,
): Promise<boolean> {
  return updateJarvisLiveActivityAttributes(attributesForState(state, modeLabel));
}

/**
 * Termina a Live Activity e limpa o estado interno (incluindo órfãs).
 * Nunca lança — falhar aqui não pode afetar o restante da app.
 */
export async function stopJarvisLiveActivity(
  dismissalPolicy: 'default' | 'immediate' = 'default',
): Promise<boolean> {
  let ok = true;
  const targets: LiveActivity<JARVISAttributes>[] = [];
  try {
    if (currentActivity) targets.push(currentActivity);
    else if (factory) targets.push(...factory.getInstances());
  } catch {
    /* getInstances indisponível — segue apenas com a referência actual */
  }
  for (const activity of targets) {
    try {
      await activity.end(dismissalPolicy);
    } catch (e) {
      ok = false;
      console.warn('[JarvisLiveActivity] Falha ao terminar a Live Activity.', String(e));
    }
  }
  currentActivity = null;
  pendingStart = null;
  return ok;
}
