import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Dev-only: serve the vendored MediaPipe WASM under /seedum/wasm/ as RAW static files.
 * MediaPipe's ES-module loader does a runtime `import()` of vision_wasm_module_internal.js;
 * Vite dev otherwise routes that through its module transform (`?import`) and 500s on the
 * Emscripten glue. Production serves /public as-is, so this is `apply: 'serve'` only.
 */
function serveSeedumWasmRaw(): Plugin {
  const publicDir = fileURLToPath(new URL('./public', import.meta.url));
  return {
    name: 'serve-seedum-wasm-raw',
    apply: 'serve',
    configureServer(server) {
      // Added directly (not in a returned fn) → runs BEFORE Vite's transform middleware.
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/seedum/wasm/') || url.includes('..')) return next();
        readFile(join(publicDir, url.split('?')[0]))
          .then((data) => {
            res.setHeader('Content-Type', url.includes('.wasm') ? 'application/wasm' : 'text/javascript');
            res.end(data);
          })
          .catch(() => next());
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveSeedumWasmRaw()],
  // The SEduM worker is a MODULE worker so both `vite dev` and `vite build` serve it
  // as ESM (a classic worker can't use ESM `import` in dev → "Cannot use import statement
  // outside a module"). MediaPipe's WASM loader works in a module worker via
  // FilesetResolver.forVisionTasks(base, /* useModule */ true) → the ES-module WASM build
  // (vision_wasm_module_internal.*), served raw in dev by serveSeedumWasmRaw() above.
  worker: { format: 'es' },
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
        // Forward the WebSocket upgrade too (graphql-ws subscriptions → ASGI consumer).
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
