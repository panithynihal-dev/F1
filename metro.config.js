// Metro is Expo's bundler: it gathers all the code, images and fonts into the files the browser
// downloads. The NativeWind wrapper teaches it to read our Tailwind stylesheet (src/styles) and turn
// the Tailwind class names into real CSS. You shouldn't need to touch it.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
