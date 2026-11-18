import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { initVapidAndSecrets } from './server/vapidConfig.ts';
import { createNotificationRouter } from './server/notificationRoutes.ts';

async function startServer() {
  initVapidAndSecrets();

  const app = express();
  app.set('trust proxy', 1);
  const port = Number(process.env.PORT || 3000);
  const distDir = path.resolve(process.cwd(), 'dist');
  const isDevLifecycle =
    process.env.npm_lifecycle_event === 'dev' ||
    process.argv.some((arg) => arg.includes('tsx')) ||
    Boolean(process.execArgv.some((arg) => arg.includes('tsx')));
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start' ||
    (!isDevLifecycle && process.env.NODE_ENV !== 'development' && fs.existsSync(distDir));

  // Ensure Service Workers & Web Push extension script are never aggressively cached
  app.use((req, res, next) => {
    if (req.path === '/sw-push.js' || req.path === '/sw.js' || req.path === '/manifest.webmanifest') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  // Scope JSON body parsing strictly to /api/auth and /api/notifications so /api/pwa/* raw streams stay intact
  app.use(['/api/auth', '/api/notifications'], express.json({ limit: '128kb' }));
  app.use(createNotificationRouter());

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
