import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './constants.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    // `mobile:` utilities apply only inside the native Android app (the <html> element gets the
    // `native-mobile` class at startup), so the desktop app and the browser never see them.
    plugin(({ addVariant }) => addVariant('mobile', '.native-mobile &')),
  ],
};
