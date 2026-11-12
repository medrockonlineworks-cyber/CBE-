import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function patchViteClientPlugin() {
  return {
    name: 'patch-vite-client-safe-send',
    transform(code: string, id: string) {
      if (id.includes('@vite/client') || id.includes('vite/dist/client/client.mjs') || id.endsWith('client.mjs')) {
        return code
          .replace(
            /ws\.send\(JSON\.stringify\(data\)\);/g,
            'if (typeof ws !== "undefined" && ws && ws.readyState === 1) { ws.send(JSON.stringify(data)); }'
          )
          .replace(
            /wsTransport\.send\(data\);/g,
            'try { wsTransport?.send?.(data); } catch (e) {}'
          );
      }
      return null;
    }
  };
}

function pwaBrandingSyncPlugin() {
  return {
    name: 'pwa-branding-server-sync',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
        res.setHeader('Access-Control-Allow-Headers', '*');
        const url = req.url || '';
        // Set strict no-cache headers for all manifest and PWA icon files
        if (
          url.startsWith('/manifest.') || 
          url.includes('pwa-') || 
          url.includes('apple-touch-icon') || 
          url.includes('/icons/icon-')
        ) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }

        // Endpoint: Update PWA icons with custom uploaded logo
        if (url === '/api/pwa/update-icon' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const { icon192, icon512, iconMaskable, appleTouchIcon, splashMobile, splashWide, rawLogo } = payload;
              const publicDir = path.resolve(__dirname, 'public');
              const iconsDir = path.resolve(publicDir, 'icons');
              if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

              const saveBase64Png = (dataUrl: string, filePath: string) => {
                if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes('base64,')) return;
                const b64 = dataUrl.split('base64,')[1];
                const buf = Buffer.from(b64, 'base64');
                fs.writeFileSync(filePath, buf);
              };

              if (icon192) {
                saveBase64Png(icon192, path.resolve(publicDir, 'pwa-192x192.png'));
                saveBase64Png(icon192, path.resolve(iconsDir, 'icon-192.png'));
              }
              if (icon512) {
                saveBase64Png(icon512, path.resolve(publicDir, 'pwa-512x512.png'));
                saveBase64Png(icon512, path.resolve(iconsDir, 'icon-512.png'));
              }
              if (iconMaskable) {
                saveBase64Png(iconMaskable, path.resolve(publicDir, 'pwa-maskable-512x512.png'));
                saveBase64Png(iconMaskable, path.resolve(iconsDir, 'icon-maskable-512.png'));
              }
              if (appleTouchIcon || icon192) {
                saveBase64Png(appleTouchIcon || icon192, path.resolve(publicDir, 'apple-touch-icon.png'));
              }
              if (splashMobile) {
                saveBase64Png(splashMobile, path.resolve(publicDir, 'pwa-screenshot-mobile.png'));
              }
              if (splashWide) {
                saveBase64Png(splashWide, path.resolve(publicDir, 'pwa-screenshot-wide.png'));
              }
              if (rawLogo) {
                if (typeof rawLogo === 'string' && rawLogo.startsWith('data:')) {
                  saveBase64Png(rawLogo, path.resolve(publicDir, 'custom-bank-logo.png'));
                } else if (typeof rawLogo === 'string' && rawLogo.startsWith('https://')) {
                  fetch(rawLogo)
                    .then(r => r.arrayBuffer())
                    .then(ab => {
                      fs.writeFileSync(path.resolve(publicDir, 'custom-bank-logo.png'), Buffer.from(ab));
                      const genScript = path.resolve(__dirname, 'scripts/generate-uploaded-pwa-assets.cjs');
                      if (fs.existsSync(genScript)) {
                        exec(`node "${genScript}"`, () => {});
                      }
                    })
                    .catch((fetchErr) => {
                      console.warn('[PWA] Error fetching remote HTTPS logo:', fetchErr);
                    });
                }
              }

              const timestamp = Date.now();
              fs.writeFileSync(
                path.resolve(publicDir, 'custom-pwa-branding.json'),
                JSON.stringify({ updated: timestamp, hasCustomLogo: true }, null, 2)
              );

              // Run asset generator to build high-res PWA icons from uploaded image
              const genScript = path.resolve(__dirname, 'scripts/generate-uploaded-pwa-assets.cjs');
              if (fs.existsSync(genScript)) {
                try {
                  exec(`node "${genScript}"`, (genErr) => {
                    if (genErr) console.warn('[PWA] Asset generator note:', genErr);
                  });
                } catch (e) {
                  console.warn('[PWA] Asset generator exec note:', e);
                }
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, timestamp }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: String(err) }));
            }
          });
          return;
        }

        // Endpoint: Reset to official CBE golden logo
        if (url === '/api/pwa/reset-icon' && req.method === 'POST') {
          try {
            const publicDir = path.resolve(__dirname, 'public');
            const markerPath = path.resolve(publicDir, 'custom-pwa-branding.json');
            if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);
            const logoPath = path.resolve(publicDir, 'custom-bank-logo.png');
            if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);

            const scriptPath = path.resolve(__dirname, 'scripts/generate-cbe-pwa-assets.cjs');
            if (fs.existsSync(scriptPath)) {
              exec(`node "${scriptPath}"`, (error) => {
                if (error) console.warn('[PWA] Reset script note:', error);
              });
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, reset: true, timestamp: Date.now() }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: String(err) }));
          }
          return;
        }

        // Endpoint: Get status
        if (url === '/api/pwa/status' && req.method === 'GET') {
          try {
            const publicDir = path.resolve(__dirname, 'public');
            const markerPath = path.resolve(publicDir, 'custom-pwa-branding.json');
            const logoPath = path.resolve(publicDir, 'custom-bank-logo.png');
            const hasCustom = fs.existsSync(markerPath) && fs.existsSync(logoPath);
            let rawLogo = null;
            if (hasCustom) {
              const buf = fs.readFileSync(logoPath);
              rawLogo = `data:image/png;base64,${buf.toString('base64')}`;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ hasCustom, rawLogo, timestamp: Date.now() }));
          } catch {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ hasCustom: false }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      patchViteClientPlugin(),
      react(),
      tailwindcss(),
      pwaBrandingSyncPlugin(),
      VitePWA({
        injectRegister: null,
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'pwa-screenshot-mobile.png',
          'pwa-screenshot-wide.png',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable-512.png',
        ],
        manifest: {
          id: '/',
          name: 'CBE Mobile',
          short_name: 'CBE Mobile',
          description: 'Official Commercial Bank of Ethiopia (CBE) Mobile Banking application with instant transfers, bill payments, and secure account management.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui', 'fullscreen', 'browser'],
          orientation: 'portrait-primary',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          lang: 'en',
          dir: 'ltr',
          categories: ['finance', 'business', 'utilities'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/pwa-screenshot-mobile.png',
              sizes: '540x1170',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'CBE Mobile Banking',
            },
            {
              src: '/pwa-screenshot-wide.png',
              sizes: '1280x800',
              type: 'image/png',
              form_factor: 'wide',
              label: 'CBE Mobile Banking Desktop',
            },
          ],
          prefer_related_applications: false,
          related_applications: [],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true,
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/(manifest\.(webmanifest|json)|icons\/.*|pwa-.*|apple-touch-icon.*)/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cbe-custom-branding-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'firebase', '@firebase/app', '@firebase/firestore', '@firebase/auth', '@firebase/component'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
      ],
      exclude: ['firebase', '@firebase/app', '@firebase/firestore', '@firebase/auth', '@firebase/component'],
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) {
                return 'vendor-canvas';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
