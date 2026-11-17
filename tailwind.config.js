// Design tokens: the "broadcast graphics" system from the Figma redesign (Nov 2026). Dark only, square
// corners, F1 red only for next / live / primary actions, gold only for decided-title chips. Team
// colours appear on data (stripes, bars, dots), never as decoration.
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
        ground: '#0E1013', // asphalt: the page
        surface: '#161A20', // pit wall: panels
        lifted: '#1B2028', // a selected or hovered row
        line: '#272C34', // kerb line: borders and dividers
        strong: '#3A404A', // a heavier rule (table heads, outlined buttons)
        muted: '#8E949D',
        paper: '#F3F3F1', // main text
        red: { DEFAULT: '#E10600', dark: '#B30000' },
        gold: '#F5C518',
        silver: '#C0C0C8',
        bronze: '#CD7F32',
        amber: '#FFA733',
        flag: { green: '#43B02A', yellow: '#FFC400', blue: '#2F7BFF' },
      },
      fontFamily: {
        // Barlow Condensed carries the broadcast look: 800 italic caps for titles, 700 for numbers,
        // 600 for small labels. Barlow is the reading face.
        title: ['BarlowCondensed_800ExtraBold_Italic'],
        display: ['BarlowCondensed_700Bold'],
        'display-semi': ['BarlowCondensed_600SemiBold'],
        body: ['Barlow_400Regular'],
        'body-medium': ['Barlow_500Medium'],
        'body-semi': ['Barlow_600SemiBold'],
        'body-bold': ['Barlow_700Bold'],
      },
      borderRadius: {
        badge: '0px',
        inner: '0px',
        card: '0px',
      },
      maxWidth: {
        page: '1440px',
      },
    },
  },
  plugins: [],
};
