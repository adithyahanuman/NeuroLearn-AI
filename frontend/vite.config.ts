import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/students': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/concepts': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/attempts': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/path-steps': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/cohorts': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
