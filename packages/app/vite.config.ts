import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1234,
    proxy: {
      '/storybook': {
        target: 'http://localhost:6006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storybook/, ''),
      },
    },
  },
});
