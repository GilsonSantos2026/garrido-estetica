/** Paleta da prévia "Bella Gestão" (PDF de referência): rosa framboesa, fundo off-white quente e grafite para leitura. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        rose: {
          50: '#fbf2f4', 100: '#f6e1e6', 200: '#eec5cf', 300: '#e09fb0',
          400: '#cc7790', 500: '#b5576f', 600: '#a04b62', 700: '#7d394b', 800: '#5f2c39',
        },
        // tons neutros quentes (fundo da página #f5f3ef, bordas suaves)
        nude: { 50: '#f5f3ef', 100: '#efebe5', 200: '#e5e0d8', 300: '#d6cfc5', 400: '#bcb3a7' },
        graphite: {
          300: '#b9b7bb', 400: '#8e8b91', 500: '#6b6870', 600: '#4f4c54', 700: '#3a383e', 800: '#2a282d', 900: '#1e1d1f',
        },
      },
      fontFamily: {
        // Serifa robusta como no PDF; Georgia vem no sistema (funciona offline no APK)
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 2px rgba(40,30,30,.04)' },
    },
  },
  plugins: [],
};
