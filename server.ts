import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { initVapidAndSecrets } from './server/vapidConfig.ts';
import { createNotificationRouter } from './server/notificationRoutes.ts';
import { createApkRouter } from './server/apkRoutes.ts';
import { createSyncRouter } from './server/syncRoutes.ts';

interface SubAppBranding {
  slug: string;
  title: string;
  icon: string;
  manifest: string;
  themeColor: string;
  bgColor: string;
}

const SUBAPP_IOS_BRANDING: Record<string, SubAppBranding> = {
  '/sms': {
    slug: 'sms',
    title: 'Messages',
    icon: '/icons/notif-sms-ios.png',
    manifest: '/manifests/subapp-sms.webmanifest',
    themeColor: '#000000',
    bgColor: '#000000',
  },
  '/truecaller': {
    slug: 'truecaller',
    title: 'Truecaller',
    icon: '/icons/notif-truecaller.png',
    manifest: '/manifests/subapp-truecaller.webmanifest',
    themeColor: '#0066FF',
    bgColor: '#0b1220',
  },
  '/phone': {
    slug: 'phone',
    title: 'Phone',
    icon: '/icons/notif-phone.png',
    manifest: '/manifests/subapp-phone.webmanifest',
    themeColor: '#000000',
    bgColor: '#000000',
  },
};

function getSubAppBrandingForPath(reqPath: string): SubAppBranding | null {
  const firstSeg = (reqPath || '').toLowerCase().replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  return SUBAPP_IOS_BRANDING[`/${firstSeg}`] || null;
}

function applySubAppHeadBranding(html: string, reqPath: string): string {
  const brand = getSubAppBrandingForPath(reqPath);
  if (!brand) return html;

  const bootLockTag = `<script>window.__CBE_LOCKED_SUBAPP__="${brand.slug}";window.__CBE_INITIAL_SUBAPP__="${brand.slug}";</script><style id="subapp-static-bg">html,body,#root{background-color:${brand.bgColor}!important;}</style>`;

  return html
    .replace(/<link\s+rel="manifest"\s+href="\/manifest\.webmanifest"\s*\/?>/gi, '')
    .replace(
      /<html([^>]*)class="([^"]*?)bg-white([^"]*?)"/i,
      `<html$1class="$2bg-black$3" style="background-color:${brand.bgColor}"`
    )
    .replace(
      /<body([^>]*)class="([^"]*?)bg-white([^"]*?)"/i,
      `<body$1class="$2bg-black$3" style="background-color:${brand.bgColor}"`
    )
    .replace(/<head>/i, `<head>\n    ${bootLockTag}`)
    .replace(/<title>[^<]*<\/title>/i, `<title>${brand.title}</title>`)
    .replace(
      /(<meta\s+name="apple-mobile-web-app-title"\s+content=")[^"]*(")/i,
      `$1${brand.title}$2`
    )
    .replace(
      /(<meta\s+name="application-name"\s+content=")[^"]*(")/i,
      `$1${brand.title}$2`
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/i,
      `$1${brand.title}$2`
    )
    .replace(
      /(<meta\s+name="theme-color"\s+content=")[^"]*(")/i,
      `$1${brand.themeColor}$2`
    )
    .replace(
      /(<meta\s+name="msapplication-navbutton-color"\s+content=")[^"]*(")/i,
      `$1${brand.bgColor}$2`
    )
    .replace(
      /(<meta\s+name="navigation-bar-color"\s+content=")[^"]*(")/i,
      `$1${brand.bgColor}$2`
    )
    .replace(
      /(<meta\s+name="color-scheme"\s+content=")[^"]*(")/i,
      `$1dark$2`
    )
    .replace(
      /(<link\s+id="pwa-manifest-link"\s+rel="manifest"\s+href=")[^"]*(")/i,
      `$1${brand.manifest}$2`
    )
    .replace(
      /(<link\s+id="app-apple-touch-icon"\s+rel="apple-touch-icon"\s+href=")[^"]*(")/i,
      `$1${brand.icon}$2`
    )
    .replace(
      /(<link\s+id="app-favicon-png"\s+rel="icon"\s+type="image\/png"\s+sizes="192x192"\s+href=")[^"]*(")/i,
      `$1${brand.icon}$2`
    )
    .replace(/<link\s+id="app-favicon-svg"[^>]*>\s*/gi, '')
    .replace(/<link\s+id="app-mask-icon"[^>]*>\s*/gi, '');
}

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

  // Ensure Service Workers & Web Push manifests are never aggressively cached
  app.use((req, res, next) => {
    if (
      req.path === '/sw-push.js' ||
      req.path.endsWith('/sw-push.js') ||
      req.path === '/sw.js' ||
      req.path === '/manifest.webmanifest' ||
      req.path.startsWith('/manifests/subapp-')
    ) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  // Scope JSON body parsing strictly to /api/auth, /api/notifications, /api/sync, /api/subapp, and /api/pwa/app-logo
  app.use(['/api/auth', '/api/notifications'], express.json({ limit: '128kb' }));
  app.use(['/api/sync', '/api/subapp'], express.json({ limit: '8mb' }));
  app.use('/api/pwa/app-logo', express.json({ limit: '4mb' }));
  app.use(createNotificationRouter());
  app.use(createApkRouter());
  app.use(createSyncRouter());

  // Serve scoped sub-app push service workers (e.g. /sms/sw-push.js)
  const subAppSwPaths = Object.keys(SUBAPP_IOS_BRANDING).map((p) => `${p}/sw-push.js`);
  app.get(subAppSwPaths, (_req, res) => {
    const swFile = path.resolve(process.cwd(), 'public', 'sw-push.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (fs.existsSync(swFile)) {
      res.sendFile(swFile);
    } else {
      res.status(404).end('// sw-push.js not found');
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Serve sub-app branded HTML head for iPhone Safari "Add to Home Screen"
    const devSubAppPaths = Object.keys(SUBAPP_IOS_BRANDING).flatMap((p) => [p, `${p}/`, `${p}/index.html`]);
    app.get(devSubAppPaths, async (req, res, next) => {
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        const brandedHtml = applySubAppHeadBranding(rawHtml, req.path);
        const transformed = await vite.transformIndexHtml(req.originalUrl, brandedHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(transformed);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const prodDistDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(prodDistDir));
    app.get('*', (req, res) => {
      const indexFile = path.join(prodDistDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        if (getSubAppBrandingForPath(req.path)) {
          const rawHtml = fs.readFileSync(indexFile, 'utf-8');
          const brandedHtml = applySubAppHeadBranding(rawHtml, req.path);
          res.status(200).set({ 'Content-Type': 'text/html' }).send(brandedHtml);
          return;
        }
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
