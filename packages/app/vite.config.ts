import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1618,
    proxy: {
      '/storybook': {
        target: process.env.VITE_STORYBOOK_URL ?? 'http://localhost:6006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storybook/, ''),
      },
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
});
