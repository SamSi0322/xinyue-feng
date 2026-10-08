import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development, /api calls go to the Express server in server/ (npm run dev there).
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
