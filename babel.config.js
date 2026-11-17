// Babel translates our TypeScript/JSX into plain JavaScript that browsers run.
// It's needed because of NativeWind: these two presets are what make `className="..."` work on
// React Native components (View, Text, Pressable). Without this file, none of the styling works.
// You shouldn't need to touch it.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
