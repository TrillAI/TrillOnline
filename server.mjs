import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gmailApiMiddleware } from './server/gmailApi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(gmailApiMiddleware);
app.use(
  express.static(path.join(__dirname, 'dist'), {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.apk')) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', 'attachment; filename="TrillXP.apk"');
      }
    },
  })
);
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TrillXP Web OS running on http://0.0.0.0:${PORT}`);
});
