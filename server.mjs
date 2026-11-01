import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gmailApiMiddleware } from './server/gmailApi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(gmailApiMiddleware);
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Windows XP Web OS running on http://0.0.0.0:${PORT}`);
});
