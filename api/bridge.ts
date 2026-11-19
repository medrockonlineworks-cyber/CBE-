import { handleBridgeAction } from '../server/subAppBridge.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const rawUrl = String(req.url || '/api/bridge');
    const urlObj = new URL(rawUrl, 'https://localhost');
    const routeParam =
      typeof req.query?.route === 'string' && req.query.route.startsWith('/')
        ? req.query.route
        : urlObj.pathname;

    const query: Record<string, unknown> = {};
    urlObj.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    if (req.query && typeof req.query === 'object') {
      Object.assign(query, req.query);
    }

    let parsedBody: Record<string, unknown> = {};
    if (req.body && typeof req.body === 'object') {
      parsedBody = req.body as Record<string, unknown>;
    } else if (typeof req.body === 'string' && req.body.trim()) {
      try {
        parsedBody = JSON.parse(req.body);
      } catch {
        parsedBody = {};
      }
    }

    const result = await handleBridgeAction({
      pathname: routeParam,
      method: req.method || 'GET',
      query,
      body: parsedBody,
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/bridge] Error:', err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Bridge error',
    });
  }
}
