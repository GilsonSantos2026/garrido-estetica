import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' permite abrir o build dentro do app Android (Capacitor), que carrega arquivos locais.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'www', emptyOutDir: true },
  server: { port: 5173 },
});
