import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // Vite's default (Chrome 111 / Safari 16.4) would shut out older phones and the
    // in-app browsers of chat apps; transpile for browsers from 2020 onward instead.
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
  },
  server: {
    // In development, /api calls go to the Express server in server/ (npm run dev there).
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
