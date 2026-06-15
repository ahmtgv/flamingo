import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // The SEduM worker MUST be a classic (iife) worker: MediaPipe's WASM loader uses
  // `importScripts`, which is unavailable in `{ type: 'module' }` workers (it would
  // fall back to `document`, absent in a worker). Keep this 'iife' (see seedum/attention.ts).
  worker: { format: 'iife' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Forward GraphQL to the API so the browser stays same-origin (no CORS).
    proxy: {
      '/graphql': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
