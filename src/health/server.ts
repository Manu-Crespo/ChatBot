import express from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BROWSER_SOURCE_PATH = resolve('obs/browser-source.html');

export function createHealthServer(port: number) {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/tts.html', (_req, res) => {
    try {
      const html = readFileSync(BROWSER_SOURCE_PATH, 'utf-8');
      res.type('html').send(html);
    } catch {
      res.status(500).send('Browser source file not found');
    }
  });

  const server = app.listen(port, () => {
    console.log(`Health server listening on port ${port}`);
  });

  return { app, server };
}
