import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@remix-run/router': path.resolve(__dirname, 'node_modules/@remix-run/router/dist/router.js'),
      clsx: path.resolve(__dirname, 'node_modules/clsx/dist/clsx.mjs'),
      '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
      'core-js': path.resolve(__dirname, 'node_modules/core-js'),
    },
  },
  optimizeDeps: {
    include: ['jspdf', 'html2canvas'],
  },
  server: {
    port: 5173,
  },
});
