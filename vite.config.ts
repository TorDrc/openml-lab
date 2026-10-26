/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages "project sites" are served from https://<user>.github.io/<repo>/,
// so the production base path must be "/<repo>/". The deploy workflow sets
// VITE_BASE automatically from the repository name; local dev uses "/".
// To deploy to a user/organisation root site (<user>.github.io) set VITE_BASE=/.
const base = process.env.VITE_BASE ?? '/';

/**
 * Adds a Content-Security-Policy <meta> tag to PRODUCTION builds only (the dev
 * server needs inline scripts for hot reloading). GitHub Pages cannot send HTTP
 * headers, so a meta tag is the only option; it is defence in depth, not a guarantee.
 * 'unsafe-eval' is kept as a precaution for TensorFlow.js; remove it if you have
 * confirmed in your browsers that training still works without it.
 */
const contentSecurityPolicy = (): Plugin => ({
  name: 'openml-csp',
  apply: 'build',
  transformIndexHtml(html) {
    const policy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
    ].join('; ');
    return html.replace('<!--CSP-->', `<meta http-equiv="Content-Security-Policy" content="${policy}" />`);
  },
});

export default defineConfig({
  base,
  plugins: [react(), contentSecurityPolicy()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 2200, // TensorFlow.js is large; it is lazy-loaded.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@tensorflow')) return 'tfjs';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
