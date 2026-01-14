// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // includes router transforms for SDK 50+
    plugins: [
      // keep ONLY if you really use "@/..." imports; otherwise remove this line
      ['module-resolver', { alias: { '@': './' } }],
      'react-native-reanimated/plugin', // MUST be last
    ],
  };
};
