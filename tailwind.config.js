/** Tema: azul-marinho (marca), branco e cinza (fundos e leitura). Contrastes conferidos (WCAG AA). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // azul-marinho: 500 = botões e marca; 50–200 = fundos suaves; 400 = detalhes
        brand: {
          50: '#f2f5fa', 100: '#e4eaf4', 200: '#c9d5ea', 300: '#9fb3d6',
          400: '#4a6aa3', 500: '#1e3a6e', 600: '#172f5a', 700: '#12254a', 800: '#0c1a36',
        },
        // cinzas frios para fundo da página (#f4f6f8), cartões e bordas
        mist: { 50: '#f4f6f8', 100: '#edf0f4', 200: '#e1e5eb', 300: '#cdd3dc', 400: '#a9b2be' },
        graphite: {
          300: '#b8bec7', 400: '#8b93a0', 500: '#5f6875', 600: '#4a525e', 700: '#363d47', 800: '#262c35', 900: '#1d2430',
        },
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 2px rgba(15,23,42,.05)' },
    },
  },
  plugins: [],
};
