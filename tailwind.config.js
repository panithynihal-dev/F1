// Design tokens ported from the Android app's ui/theme (Color.kt, Dimens.kt, Type.kt). The app is
// dark-only on purpose — its look (near-black ground, outlined panels, red glow) has no light
// version — so the site is too.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class', not the default 'media': app.json pins the scheme to dark, and NativeWind refuses to set
  // a scheme manually while dark mode follows the media query.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ground: '#0A0A0C',
        surface: '#17171B',
        lifted: '#201F25',
        line: '#3C3C42',
        muted: '#9A9AA2',
        red: { DEFAULT: '#E10600', dark: '#B30000' },
        amber: '#FFA733',
        gold: '#FFD700',
        silver: '#C0C0C8',
        bronze: '#CD7F32',
        flag: { green: '#00C853', yellow: '#FFC400' },
      },
      fontFamily: {
        // Rajdhani is the app's display face, kept for headings and big numbers only. Barlow
        // carries everything else: it was drawn from California highway signage, so it belongs
        // to the road, and unlike Rajdhani it has tabular figures for timing columns.
        display: ['Rajdhani_700Bold'],
        'display-semi': ['Rajdhani_600SemiBold'],
        body: ['Barlow_400Regular'],
        'body-medium': ['Barlow_500Medium'],
        'body-semi': ['Barlow_600SemiBold'],
        'body-bold': ['Barlow_700Bold'],
      },
      borderRadius: {
        badge: '4px',
        inner: '8px',
        card: '16px',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
};
