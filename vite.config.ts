import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error mjs server middleware
import { gmailApiMiddleware } from './server/gmailApi.mjs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'aol-gmail-api',
      configureServer(server) {
        server.middlewares.use(gmailApiMiddleware);
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
