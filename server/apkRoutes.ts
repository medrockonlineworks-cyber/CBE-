import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  type AuthenticatedRequest,
  requireAdminOrSecret,
  requireAuth,
} from './authMiddleware.ts';

const PUBLIC_DOWNLOADS_DIR = path.resolve(process.cwd(), 'public', 'downloads');
const DIST_DOWNLOADS_DIR = path.resolve(process.cwd(), 'dist', 'downloads');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const APK_CONFIG_FILE = path.join(DATA_DIR, 'apk-config.json');
const DEFAULT_APK_FILENAME = 'cbe-mobil.apk';

interface ApkConfig {
  externalUrl?: string;
  versionName?: string;
  updatedAt?: string;
}

function readApkConfig(): ApkConfig {
  try {
    if (fs.existsSync(APK_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(APK_CONFIG_FILE, 'utf8')) as ApkConfig;
    }
  } catch {
    // Ignore malformed config
  }
  return {};
}

function writeApkConfig(config: ApkConfig): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  const tmp = `${APK_CONFIG_FILE}.tmp-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf8');
  fs.renameSync(tmp, APK_CONFIG_FILE);
}

function findLocalApkFile(): { filePath: string; sizeBytes: number; updatedAt: string; versionName: string } | null {
  const candidates = [
    path.join(PUBLIC_DOWNLOADS_DIR, DEFAULT_APK_FILENAME),
    path.join(DIST_DOWNLOADS_DIR, DEFAULT_APK_FILENAME),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      if (stat.isFile() && stat.size > 1024) {
        let versionName = '1.0';
        const metaPath = path.join(path.dirname(candidate), 'apk-metadata.json');
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { versionName?: string };
            if (meta.versionName) versionName = meta.versionName;
          } catch {
            // Keep default
          }
        }
        return {
          filePath: candidate,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString(),
          versionName,
        };
      }
    }
  }
  return null;
}

export function createApkRouter(): express.Router {
  const router = express.Router();

  // Direct APK binary download with proper Android Package Installer MIME headers
  router.get('/downloads/:filename', (req, res, next) => {
    const filename = path.basename(String(req.params.filename || ''));
    if (!filename.toLowerCase().endsWith('.apk')) {
      next();
      return;
    }

    const publicFile = path.join(PUBLIC_DOWNLOADS_DIR, filename);
    const distFile = path.join(DIST_DOWNLOADS_DIR, filename);
    const resolvedFile = fs.existsSync(publicFile) ? publicFile : fs.existsSync(distFile) ? distFile : null;

    if (!resolvedFile) {
      res.status(404).json({ ok: false, error: 'Android APK file has not been published yet.' });
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="CBE-Mobil.apk"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(resolvedFile);
  });

  // Check whether an APK is available (local binary or configured external URL)
  router.get('/api/app/apk-status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const localApk = findLocalApkFile();
    const config = readApkConfig();
    const externalUrl =
      typeof config.externalUrl === 'string' && /^https?:\/\//i.test(config.externalUrl)
        ? config.externalUrl
        : undefined;

    if (localApk) {
      res.json({
        ok: true,
        available: true,
        source: 'server',
        downloadUrl: `/downloads/${DEFAULT_APK_FILENAME}`,
        fileName: 'CBE-Mobil.apk',
        sizeBytes: localApk.sizeBytes,
        versionName: localApk.versionName,
        updatedAt: localApk.updatedAt,
        externalUrl,
      });
      return;
    }

    if (externalUrl) {
      res.json({
        ok: true,
        available: true,
        source: 'external',
        downloadUrl: externalUrl,
        fileName: 'CBE-Mobil.apk',
        sizeBytes: 0,
        versionName: config.versionName || '1.0',
        updatedAt: config.updatedAt || null,
        externalUrl,
      });
      return;
    }

    res.json({
      ok: true,
      available: false,
      source: 'none',
      downloadUrl: null,
      fileName: 'CBE-Mobil.apk',
      sizeBytes: 0,
      versionName: '1.0',
      updatedAt: null,
    });
  });

  // Admin: Upload a compiled Android .apk directly from the website
  router.post(
    '/api/app/upload-apk',
    requireAuth,
    requireAdminOrSecret,
    express.raw({
      type: ['application/vnd.android.package-archive', 'application/octet-stream'],
      limit: '120mb',
    }),
    (req: AuthenticatedRequest, res) => {
      try {
        const body = req.body;
        if (!Buffer.isBuffer(body) || body.length < 1024) {
          res.status(400).json({ ok: false, error: 'Valid APK binary payload is required.' });
          return;
        }

        // Android APK packages are ZIP archives starting with PK\x03\x04
        if (body[0] !== 0x50 || body[1] !== 0x4b || body[2] !== 0x03 || body[3] !== 0x04) {
          res.status(400).json({
            ok: false,
            error: 'Invalid APK file: file must be a valid compiled Android .apk archive.',
          });
          return;
        }

        const versionRaw = String(req.headers['x-apk-version'] || '1.0').trim().slice(0, 32) || '1.0';
        fs.mkdirSync(PUBLIC_DOWNLOADS_DIR, { recursive: true });
        const publicApkPath = path.join(PUBLIC_DOWNLOADS_DIR, DEFAULT_APK_FILENAME);
        fs.writeFileSync(publicApkPath, body);

        const metadata = {
          fileName: 'CBE-Mobil.apk',
          downloadUrl: `/downloads/${DEFAULT_APK_FILENAME}`,
          versionName: versionRaw,
          sizeBytes: body.length,
          updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(
          path.join(PUBLIC_DOWNLOADS_DIR, 'apk-metadata.json'),
          JSON.stringify(metadata, null, 2)
        );

        if (fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
          fs.mkdirSync(DIST_DOWNLOADS_DIR, { recursive: true });
          fs.writeFileSync(path.join(DIST_DOWNLOADS_DIR, DEFAULT_APK_FILENAME), body);
          fs.writeFileSync(
            path.join(DIST_DOWNLOADS_DIR, 'apk-metadata.json'),
            JSON.stringify(metadata, null, 2)
          );
        }

        res.json({ ok: true, available: true, ...metadata });
      } catch (err) {
        console.error('[APK] Upload error:', err);
        res.status(500).json({ ok: false, error: 'Failed to save uploaded APK file.' });
      }
    }
  );

  // Admin: Configure an external hosted APK URL (e.g. GitHub Releases / CDN link)
  router.post(
    '/api/app/apk-link',
    requireAuth,
    requireAdminOrSecret,
    express.json({ limit: '16kb' }),
    (req: AuthenticatedRequest, res) => {
      const { externalUrl, versionName } = req.body || {};
      if (externalUrl === '' || externalUrl === null) {
        writeApkConfig({ updatedAt: new Date().toISOString() });
        res.json({ ok: true, cleared: true });
        return;
      }

      if (typeof externalUrl !== 'string') {
        res.status(400).json({ ok: false, error: 'Valid HTTPS APK URL is required.' });
        return;
      }

      try {
        const parsed = new URL(externalUrl.trim());
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          res.status(400).json({ ok: false, error: 'APK download URL must start with https:// or http://.' });
          return;
        }
        const config: ApkConfig = {
          externalUrl: parsed.href,
          versionName: typeof versionName === 'string' && versionName.trim() ? versionName.trim().slice(0, 32) : '1.0',
          updatedAt: new Date().toISOString(),
        };
        writeApkConfig(config);
        res.json({ ok: true, ...config });
      } catch {
        res.status(400).json({ ok: false, error: 'Invalid APK download URL.' });
      }
    }
  );

  return router;
}
