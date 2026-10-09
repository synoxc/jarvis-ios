module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // babel-preset-expo (SDK 50+) já inclui o suporte ao expo-router,
    // por isso o plugin "expo-router/babel" foi removido (estava deprecated).
    plugins: [],
  };
};


