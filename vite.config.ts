import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The backend only allows configured CORS origins, so in development the browser talks to
// this dev server and Vite forwards API calls to the ASP.NET API (self-signed HTTPS cert).
const api = process.env.API_PROXY_TARGET ?? 'https://localhost:5003';
const proxy = { target: api, changeOrigin: true, secure: false };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { '/api': proxy, '/identity': proxy, '/uploads': proxy },
  },
});
