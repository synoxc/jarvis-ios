import { NativeModules, Platform } from 'react-native';

/**
 * Wrapper TypeScript do módulo nativo HealthKit (ios/JarvisHealth).
 *
 * IMPORTANTE: o módulo nativo só existe num development build. Em Expo Go ou
 * se o build não incluir o módulo, `NativeModules.JarvisHealth` é undefined —
 * todos os métodos degradam com segurança (isAvailable() = false, leituras = 0)
 * em vez de crashar. NUNCA inventa dados: devolve 0 e o estado real.
 */

export interface HealthSnapshot {
  steps: number;
  distanceMeters: number;
  activeEnergyKcal: number;
  workoutsLastWeek: number;
}

interface JarvisHealthNative {
  isAvailable(): boolean;
  requestAuthorization(): Promise<boolean>;
  stepsToday(): Promise<number>;
  distanceTodayMeters(): Promise<number>;
  activeEnergyTodayKcal(): Promise<number>;
  workoutsLastWeekCount(): Promise<number>;
}

const Native: JarvisHealthNative | undefined =
  Platform.OS === 'ios' ? (NativeModules.JarvisHealth as JarvisHealthNative | undefined) : undefined;

/** true se o módulo nativo HealthKit está presente e disponível. */
export function isAvailable(): boolean {
  try {
    return Boolean(Native && Native.isAvailable());
  } catch {
    return false;
  }
}

/** Pede autorização ao utilizador. Devolve true se autorizado. */
export async function requestAuthorization(): Promise<boolean> {
  if (!Native) return false;
  try {
    return await Native.requestAuthorization();
  } catch {
    return false;
  }
}

/** Lê um resumo de hoje. Se não autorizado/indisponível, devolve zeros. */
export async function readToday(): Promise<HealthSnapshot> {
  const empty: HealthSnapshot = {
    steps: 0,
    distanceMeters: 0,
    activeEnergyKcal: 0,
    workoutsLastWeek: 0,
  };
  if (!Native || !isAvailable()) return empty;
  try {
    const [steps, distanceMeters, activeEnergyKcal, workoutsLastWeek] =
      await Promise.all([
        Native.stepsToday(),
        Native.distanceTodayMeters(),
        Native.activeEnergyTodayKcal(),
        Native.workoutsLastWeekCount(),
      ]);
    return { steps, distanceMeters, activeEnergyKcal, workoutsLastWeek };
  } catch {
    return empty;
  }
}
