// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // three.js elements in React Three Fiber take three.js props (intensity, args, position),
    // which this DOM-attribute rule doesn't know about.
    files: ['src/components/three/**'],
    rules: { 'react/no-unknown-property': 'off' },
  },
]);
