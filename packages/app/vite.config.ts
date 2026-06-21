import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../storybook/src'),
    },
  },
  server: {
    port: 1618,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
    watch: {
      // Auto-save writes frame .tsx files here every second — ignore so Vite
      // doesn't HMR-reload the app on every canvas change.
      ignored: ['**/stories/local/**'],
    },
  },
});
