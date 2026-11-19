import express from 'express';
import { handleBridgeAction } from './subAppBridge.ts';

export function createSyncRouter(): express.Router {
  const router = express.Router();

  const forward = async (req: express.Request, res: express.Response) => {
    try {
      const result = await handleBridgeAction({
        pathname: req.path,
        method: req.method,
        query: req.query as Record<string, unknown>,
        body: req.body as Record<string, unknown>,
      });
      res.setHeader('Cache-Control', 'no-store');
      const payload = result.body as Record<string, unknown>;
      if (payload && payload.__rawBinary === true && Buffer.isBuffer(payload.buffer)) {
        res.setHeader('Content-Type', String(payload.contentType || 'image/png'));
        res.status(result.status).send(payload.buffer);
        return;
      }
      if (payload && typeof payload.__redirect === 'string') {
        res.redirect(302, payload.__redirect);
        return;
      }
      if (payload && payload.__manifestJson === true && payload.manifest) {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.status(result.status).send(JSON.stringify(payload.manifest, null, 2));
        return;
      }
      res.status(result.status).json(result.body);
    } catch (err) {
      console.error('[SyncRouter] Error:', err);
      res.status(500).json({ ok: false, error: 'Bridge request failed.' });
    }
  };

  router.get('/api/sync/state', forward);
  router.post('/api/sync/state', forward);
  router.get('/api/subapp/vapid-key', forward);
  router.get('/api/subapp/status', forward);
  router.post('/api/subapp/subscribe', forward);
  router.post('/api/subapp/push', forward);
  router.post('/api/pwa/app-logo', forward);
  router.get('/api/pwa/app-logos', forward);
  router.get('/api/pwa/icon', forward);
  router.get('/api/pwa/manifest', forward);

  return router;
}
