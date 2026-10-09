import ExpoModulesCore
import HealthKit

/**
 * JarvisHealth — leitura de dados de atividade física do HealthKit.
 *
 * LIMITAÇÃO: só corre num development build com iPhone físico. Não funciona
 * em Expo Go nem em simulador (HealthKit não está disponível no simulador).
 *
 * Exposto ao JS como ExpoModule. Lê apenas dados que o utilizador autorizar
 * (read-only). Nunca envia dados de saúde para o PC sem autorização explícita
 * — a app só expõe estes valores quando o utilizador os pede no ecrã.
 */
public class JarvisHealthModule: Module {
  public func definition() -> ModuleDefinition {
    Name("JarvisHealth")

    // True se o HealthKit está disponível neste dispositivo.
    Function("isAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    // Pede autorização para ler passos, distância, energia activa e treinos.
    // Devolve true se o utilizador autorizou (ou já tinha autorizado).
    AsyncFunction("requestAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject(
          Exception(name: "E_HEALTHKIT_UNAVAILABLE",
                    description: "HealthKit não está disponível neste dispositivo.")
        )
        return
      }
      let store = HKHealthStore()
      var types = Set<HKObjectType>()
      let quantity: (HKQuantityTypeIdentifier) -> Void = { id in
        if let t = HKObjectType.quantityType(forIdentifier: id) {
          types.insert(t)
        }
      }
      quantity(.stepCount)
      quantity(.distanceWalkingRunning)
      quantity(.activeEnergyBurned)
      if let workout = HKObjectType.workoutType() as? HKObjectType {
        types.insert(workout)
      }
      store.requestAuthorization(toShare: nil, read: types) { success, error in
        if let error = error {
          promise.reject(Exception(name: "E_AUTH_FAILED", description: error.localizedDescription))
        } else {
          promise.resolve(success)
        }
      }
    }

    // Lê o total de passos de hoje. Devolve 0 se não autorizado.
    AsyncFunction("stepsToday") { (promise: Promise) in
      let store = HKHealthStore()
      guard let type = HKObjectType.quantityType(forIdentifier: .stepCount) else {
        promise.resolve(0)
        return
      }
      let start = Calendar.current.startOfDay(for: Date())
      let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())
      let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
        let steps = result?.sumQuantity()?.doubleValue(for: .count()) ?? 0
        promise.resolve(steps)
      }
      store.execute(query)
    }

    // Lê a distância percorrida hoje (metros).
    AsyncFunction("distanceTodayMeters") { (promise: Promise) in
      let store = HKHealthStore()
      guard let type = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning) else {
        promise.resolve(0)
        return
      }
      let start = Calendar.current.startOfDay(for: Date())
      let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())
      let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
        let meters = result?.sumQuantity()?.doubleValue(for: .meter()) ?? 0
        promise.resolve(meters)
      }
      store.execute(query)
    }

    // Lê a energia activa queimada hoje (kcal).
    AsyncFunction("activeEnergyTodayKcal") { (promise: Promise) in
      let store = HKHealthStore()
      guard let type = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
        promise.resolve(0)
        return
      }
      let start = Calendar.current.startOfDay(for: Date())
      let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())
      let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
        let kcal = result?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
        promise.resolve(kcal)
      }
      store.execute(query)
    }

    // Conta os treinos dos últimos 7 dias.
    AsyncFunction("workoutsLastWeekCount") { (promise: Promise) in
      let store = HKHealthStore()
      guard let type = HKObjectType.workoutType() as? HKObjectType else {
        promise.resolve(0)
        return
      }
      let start = Calendar.current.date(byAdding: .day, value: -7, to: Date())
      let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())
      let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
        promise.resolve(samples?.count ?? 0)
      }
      store.execute(query)
    }
  }
}
