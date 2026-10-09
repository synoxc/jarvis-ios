// Config plugin Expo que adiciona a capability HealthKit ao projeto iOS
// e injecta as descrições de privacidade no Info.plist.
//
// IMPORTANTE (limitação honesta): HealthKit NÃO funciona no Expo Go.
// Requer um development build (eas build --profile development) e um
// iPhone físico para autorizar e testar. Este plugin apenas prepara o
// projecto nativo; a leitura de dados acontece no módulo Swift
// (ios/JarvisHealth) que é compilado no build.
//
// A lógica de leitura de passos/distância/treinos está em
// ios/JarvisHealth/JarvisHealth.swift e é exposta via TurboModule.

const { withInfoPlist, withEntitlementsPlist } = require('@expo/config-plugins');

const withJarvisHealth = (config) => {
  // 1. Descrições de privacidade no Info.plist.
  config = withInfoPlist(config, (cfg) => {
    cfg.ios.modResults.NSHealthShareUsageDescription =
      cfg.ios.modResults.NSHealthShareUsageDescription ??
      'O JARVIS pode ler os teus dados de atividade física (passos, treinos) se autorizares.';
    cfg.ios.modResults.NSHealthUpdateUsageDescription =
      cfg.ios.modResults.NSHealthUpdateUsageDescription ??
      'O JARVIS não escreve dados de saúde.';
    return cfg;
  });

  // 2. Capability HealthKit + background delivery.
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.healthkit'] = true;
    cfg.modResults['com.apple.developer.healthkit.access'] = [];
    return cfg;
  });

  return config;
};

module.exports = withJarvisHealth;
