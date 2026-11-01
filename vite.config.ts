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
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.split('?')[0].endsWith('.apk')) {
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', 'attachment; filename="TrillXP.apk"');
          }
          next();
        });
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
