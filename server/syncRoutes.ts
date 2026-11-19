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

  return router;
}
