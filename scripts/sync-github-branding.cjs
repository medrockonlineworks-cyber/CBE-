/**
 * Syncs GitHub-uploaded branding assets (App Logo, Receipt Stamp, and optional
 * standalone sub-app launcher icons) into:
 *   1. Web/PWA assets (public/custom-bank-logo.png, public/pwa-*.png, public/icons/*, public/custom-bank-stamp.png)
 *   2. Android native launcher mipmaps, notification icons, and splash screens (android/app/src/.../res/)
 *   3. Generated offline-ready TypeScript module (src/generated/githubBranding.ts)
 *   4. Branding metadata JSON (public/custom-pwa-branding.json)
 *
 * Supported upload locations in GitHub:
 *   - branding/app-logo.{png,jpg,jpeg,svg} (or branding/logo.*)
 *   - branding/stamp.{png,jpg,jpeg,svg} (or branding/receipt-stamp.* or public/custom-bank-stamp.*)
 *   - branding/messages-logo.{png,jpg,jpeg,svg}   (optional)
 *   - branding/truecaller-logo.{png,jpg,jpeg,svg} (optional)
 *   - branding/phone-logo.{png,jpg,jpeg,svg}      (optional)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Resvg } = require('@resvg/resvg-js');

const ROOT_DIR = path.resolve(__dirname, '..');
const BRANDING_DIR = path.join(ROOT_DIR, 'branding');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const GENERATED_TS_PATH = path.join(ROOT_DIR, 'src', 'generated', 'githubBranding.ts');
const ANDROID_RES_MAIN = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'res');

// Baseline SHA-256 prefix of the original repository public/custom-bank-logo.png.
// If a user directly replaces public/custom-bank-logo.png on GitHub (instead of using branding/app-logo.png),
// its hash will differ from this baseline and we will automatically sync it too.
const BASELINE_PUBLIC_LOGO_SHA16 = 'c1e10776b4800774';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];

const ANDROID_DENSITIES = [
  { folder: 'mipmap-mdpi', launcher: 48, foreground: 108 },
  { folder: 'mipmap-hdpi', launcher: 72, foreground: 162 },
  { folder: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
  { folder: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
  { folder: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
];

const ANDROID_SPLASH_TARGETS = [
  { folder: 'drawable', width: 480, height: 800 },
  { folder: 'drawable-port-mdpi', width: 320, height: 480 },
  { folder: 'drawable-port-hdpi', width: 480, height: 800 },
  { folder: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { folder: 'drawable-port-xxhdpi', width: 960, height: 1600 },
  { folder: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
  { folder: 'drawable-land-mdpi', width: 480, height: 320 },
  { folder: 'drawable-land-hdpi', width: 800, height: 480 },
  { folder: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { folder: 'drawable-land-xxhdpi', width: 1600, height: 960 },
  { folder: 'drawable-land-xxxhdpi', width: 1920, height: 1280 },
];

function sha256Short(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

/**
 * Inspects file magic bytes to verify it is a valid, non-empty image file.
 * Guards against 0-byte placeholders or corrupted uploads.
 */
function detectValidImage(filePath) {
  if (!fs.existsSync(filePath)) return null;
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.size < 64) {
    console.warn(`[Branding Sync] Ignoring empty or too-small file: ${path.relative(ROOT_DIR, filePath)} (${stat.size} bytes)`);
    return null;
  }

  const buf = fs.readFileSync(filePath);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { filePath, buf, mime: 'image/png', ext: '.png', resvgCompatible: true };
  }

  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { filePath, buf, mime: 'image/jpeg', ext: '.jpg', resvgCompatible: true };
  }

  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { filePath, buf, mime: 'image/webp', ext: '.webp', resvgCompatible: false };
  }

  // SVG: XML or <svg tag in leading chunk
  const head = buf.toString('utf8', 0, Math.min(buf.length, 512)).trimStart();
  if (head.includes('<svg')) {
    return { filePath, buf, mime: 'image/svg+xml', ext: '.svg', resvgCompatible: true };
  }

  console.warn(`[Branding Sync] Ignoring unrecognized image format: ${path.relative(ROOT_DIR, filePath)}`);
  return null;
}

function findFirstValidImage(candidates) {
  for (const candidate of candidates) {
    const detected = detectValidImage(candidate);
    if (detected) return detected;
  }
  return null;
}

function expandBaseNames(dir, baseNames) {
  const paths = [];
  for (const base of baseNames) {
    for (const ext of IMAGE_EXTENSIONS) {
      paths.push(path.join(dir, `${base}${ext}`));
    }
  }
  return paths;
}

function toDataUri(asset) {
  return `data:${asset.mime};base64,${asset.buf.toString('base64')}`;
}

function renderSvgToPng(svgStr, width) {
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true },
  });
  return resvg.render().asPng();
}

/**
 * Renders any resvg-compatible asset (PNG, JPEG, SVG) cleanly into a square transparent PNG
 * of the target pixel size (preserving aspect ratio).
 */
function renderContainPng(asset, size, paddingRatio = 0, bgColor = null) {
  if (!asset.resvgCompatible) {
    return null;
  }
  const pad = Math.round(size * paddingRatio);
  const inner = size - pad * 2;
  const dataUri = toDataUri(asset);
  const bgRect = bgColor ? `<rect width="${size}" height="${size}" fill="${bgColor}"/>` : '';
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${bgRect}
  <image href="${dataUri}" x="${pad}" y="${pad}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
  return renderSvgToPng(svg, size);
}

function buildAppIconSvg(dataUri, bgColor = '#ffffff', rx = 112, inset = 64) {
  const inner = 512 - inset * 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="${rx}" fill="${bgColor}"/>
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

function buildRoundIconSvg(dataUri, bgColor = '#ffffff', inset = 72) {
  const inner = 512 - inset * 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="roundMask">
      <circle cx="256" cy="256" r="256"/>
    </clipPath>
  </defs>
  <g clip-path="url(#roundMask)">
    <rect width="512" height="512" fill="${bgColor}"/>
    <image href="${dataUri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
  </g>
</svg>`;
}

function buildAdaptiveForegroundSvg(dataUri, inset = 116) {
  // Android adaptive icon safe zone is the center 66% of 108dp (~338/512).
  // Inset 116 leaves a centered 280x280 artwork well inside the circular/squircle mask.
  const inner = 512 - inset * 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

function buildSplashSvg(dataUri, width, height) {
  const minDim = Math.min(width, height);
  const logoSize = Math.round(minDim * 0.38);
  const x = Math.round((width - logoSize) / 2);
  const y = Math.round((height - logoSize) / 2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <image href="${dataUri}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

function syncPwaAssetsForCbeLogo(asset) {
  if (!asset.resvgCompatible) {
    console.warn('[Branding Sync] WebP app logo cannot be rasterized to PNG via resvg; please upload PNG, JPG, or SVG for PWA/Android icon generation.');
    return;
  }

  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  const dataUri = toDataUri(asset);
  const appIconSvg = buildAppIconSvg(dataUri, '#ffffff', 112, 64);
  const maskableIconSvg = buildAppIconSvg(dataUri, '#ffffff', 0, 86);

  const splashMobileSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 1170" width="540" height="1170">
  <rect width="540" height="1170" fill="#ffffff"/>
  <image href="${dataUri}" x="150" y="320" width="240" height="240" preserveAspectRatio="xMidYMid meet"/>
  <text x="270" y="620" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="25" fill="#b8860b">የኢትዮጵያ ንግድ ባንክ</text>
  <text x="270" y="656" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="17" fill="#1f2937">Commercial Bank of Ethiopia</text>
  <text x="270" y="715" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" fill="#70189F">CBE Mobile</text>
  <text x="270" y="750" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="14" fill="#6b7280">The Bank You Can Always Rely On</text>
</svg>`;

  const splashWideSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">
  <rect width="1280" height="800" fill="#ffffff"/>
  <image href="${dataUri}" x="520" y="200" width="240" height="240" preserveAspectRatio="xMidYMid meet"/>
  <text x="640" y="490" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="28" fill="#b8860b">የኢትዮጵያ ንግድ ባንክ</text>
  <text x="640" y="528" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="20" fill="#1f2937">Commercial Bank of Ethiopia</text>
  <text x="640" y="585" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#70189F">CBE Mobile</text>
  <text x="640" y="622" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="16" fill="#6b7280">The Bank You Can Always Rely On</text>
</svg>`;

  const normalized512 = renderContainPng(asset, 512, 0, null);
  if (normalized512) {
    fs.writeFileSync(path.join(PUBLIC_DIR, 'custom-bank-logo.png'), normalized512);
  }

  const png512 = renderSvgToPng(appIconSvg, 512);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-512x512.png'), png512);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.png'), png512);

  const png192 = renderSvgToPng(appIconSvg, 192);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-192x192.png'), png192);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.png'), png192);

  const pngMaskable512 = renderSvgToPng(maskableIconSvg, 512);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'), pngMaskable512);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-512.png'), pngMaskable512);

  const png180 = renderSvgToPng(appIconSvg, 180);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), png180);

  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-screenshot-mobile.png'), renderSvgToPng(splashMobileSvg, 540));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-screenshot-wide.png'), renderSvgToPng(splashWideSvg, 1280));

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), appIconSvg);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.svg'), appIconSvg);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.svg'), appIconSvg);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable.svg'), maskableIconSvg);
}

function syncAndroidLauncherIcons(resDir, asset, extraPrefix = null, bgColor = '#ffffff') {
  if (!fs.existsSync(resDir) || !asset.resvgCompatible) return;

  const dataUri = toDataUri(asset);
  const squareSvg = buildAppIconSvg(dataUri, bgColor, 96, 48);
  const roundSvg = buildRoundIconSvg(dataUri, bgColor, 58);
  const fgSvg = buildAdaptiveForegroundSvg(dataUri, 112);

  for (const density of ANDROID_DENSITIES) {
    const dir = path.join(resDir, density.folder);
    fs.mkdirSync(dir, { recursive: true });

    const squarePng = renderSvgToPng(squareSvg, density.launcher);
    const roundPng = renderSvgToPng(roundSvg, density.launcher);
    const fgPng = renderSvgToPng(fgSvg, density.foreground);

    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), squarePng);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundPng);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgPng);

    if (extraPrefix) {
      fs.writeFileSync(path.join(dir, `${extraPrefix}.png`), squarePng);
      fs.writeFileSync(path.join(dir, `${extraPrefix}_round.png`), roundPng);
    }
  }

  // Ensure adaptive icon XML points to @mipmap/ic_launcher_foreground when custom image uploaded
  if (extraPrefix) {
    const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
    fs.mkdirSync(anyDpiDir, { recursive: true });
    const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
    fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), adaptiveXml);
    fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), adaptiveXml);
    fs.writeFileSync(path.join(anyDpiDir, `${extraPrefix}.xml`), adaptiveXml);
    fs.writeFileSync(path.join(anyDpiDir, `${extraPrefix}_round.xml`), adaptiveXml);
  }
}

function syncAndroidCbeExtras(asset) {
  if (!fs.existsSync(ANDROID_RES_MAIN) || !asset.resvgCompatible) return;

  const dataUri = toDataUri(asset);
  const notifSvg = buildAppIconSvg(dataUri, '#ffffff', 96, 40);
  const notifPath = path.join(ANDROID_RES_MAIN, 'drawable', 'ic_notif_cbe.png');
  if (fs.existsSync(path.dirname(notifPath))) {
    fs.writeFileSync(notifPath, renderSvgToPng(notifSvg, 192));
  }

  for (const target of ANDROID_SPLASH_TARGETS) {
    const dir = path.join(ANDROID_RES_MAIN, target.folder);
    if (!fs.existsSync(dir)) continue;
    const splashSvg = buildSplashSvg(dataUri, target.width, target.height);
    fs.writeFileSync(path.join(dir, 'splash.png'), renderSvgToPng(splashSvg, target.width));
  }
}

function optimizeForInlineDataUrl(asset, maxSize) {
  // If already compact PNG/JPG/WEBP/SVG (< 220KB), keep original bytes to preserve crispness
  if (asset.buf.length <= 220 * 1024) {
    return toDataUri(asset);
  }
  if (asset.resvgCompatible) {
    const resizedPng = renderContainPng(asset, maxSize, 0, null);
    if (resizedPng) {
      return `data:image/png;base64,${resizedPng.toString('base64')}`;
    }
  }
  return toDataUri(asset);
}

function syncGithubBranding() {
  // 1. Resolve CBE App Logo
  let logoAsset = findFirstValidImage(
    expandBaseNames(BRANDING_DIR, ['app-logo', 'logo', 'cbe-logo', 'bank-logo'])
  );
  let logoSource = logoAsset ? path.relative(ROOT_DIR, logoAsset.filePath) : null;

  // Fallback: detect if user directly replaced public/custom-bank-logo.png on GitHub
  if (!logoAsset) {
    const publicLogoPath = path.join(PUBLIC_DIR, 'custom-bank-logo.png');
    const detectedPublicLogo = detectValidImage(publicLogoPath);
    if (detectedPublicLogo && sha256Short(detectedPublicLogo.buf) !== BASELINE_PUBLIC_LOGO_SHA16) {
      logoAsset = detectedPublicLogo;
      logoSource = 'public/custom-bank-logo.png';
    }
  }

  let bundledLogoDataUrl = null;
  let bundledLogoVersion = null;

  if (logoAsset) {
    bundledLogoVersion = sha256Short(logoAsset.buf);
    bundledLogoDataUrl = optimizeForInlineDataUrl(logoAsset, 400);
    console.log(`[Branding Sync] Applying GitHub App Logo from ${logoSource} (version=${bundledLogoVersion})`);
    syncPwaAssetsForCbeLogo(logoAsset);
    syncAndroidLauncherIcons(ANDROID_RES_MAIN, logoAsset, null, '#ffffff');
    syncAndroidCbeExtras(logoAsset);
  } else {
    console.log('[Branding Sync] No custom GitHub app logo in branding/ (using existing default CBE logo & icons).');
  }

  // 2. Resolve Optional Standalone Sub-App Logos
  const subApps = [
    {
      name: 'Messages',
      candidates: expandBaseNames(BRANDING_DIR, ['messages-logo', 'sms-logo']),
      resDir: path.join(ROOT_DIR, 'android', 'app', 'src', 'messages', 'res'),
      prefix: 'ic_messages_launcher',
      bgColor: '#1a73e8',
    },
    {
      name: 'Truecaller',
      candidates: expandBaseNames(BRANDING_DIR, ['truecaller-logo']),
      resDir: path.join(ROOT_DIR, 'android', 'app', 'src', 'truecaller', 'res'),
      prefix: 'ic_truecaller_launcher',
      bgColor: '#0087ff',
    },
    {
      name: 'Phone',
      candidates: expandBaseNames(BRANDING_DIR, ['phone-logo', 'dialer-logo']),
      resDir: path.join(ROOT_DIR, 'android', 'app', 'src', 'phone', 'res'),
      prefix: 'ic_phone_launcher',
      bgColor: '#1a73e8',
    },
  ];

  for (const app of subApps) {
    const subAsset = findFirstValidImage(app.candidates);
    if (subAsset) {
      console.log(`[Branding Sync] Applying GitHub ${app.name} icon from ${path.relative(ROOT_DIR, subAsset.filePath)}`);
      syncAndroidLauncherIcons(app.resDir, subAsset, app.prefix, app.bgColor);
    }
  }

  // 3. Resolve Receipt Stamp
  const stampAsset = findFirstValidImage([
    ...expandBaseNames(BRANDING_DIR, ['stamp', 'receipt-stamp', 'bank-stamp', 'cbe-stamp']),
    ...expandBaseNames(PUBLIC_DIR, ['custom-bank-stamp', 'receipt-stamp']),
  ]);

  let bundledStampDataUrl = null;
  let bundledStampVersion = null;
  const publicStampPath = path.join(PUBLIC_DIR, 'custom-bank-stamp.png');

  if (stampAsset) {
    bundledStampVersion = sha256Short(stampAsset.buf);
    bundledStampDataUrl = optimizeForInlineDataUrl(stampAsset, 640);
    console.log(
      `[Branding Sync] Applying GitHub Receipt Stamp from ${path.relative(ROOT_DIR, stampAsset.filePath)} (version=${bundledStampVersion})`
    );
    if (stampAsset.filePath !== publicStampPath) {
      const stampPng = stampAsset.resvgCompatible
        ? renderContainPng(stampAsset, 640, 0, null) || stampAsset.buf
        : stampAsset.buf;
      fs.writeFileSync(publicStampPath, stampPng);
    }
  } else {
    console.log('[Branding Sync] No custom GitHub receipt stamp in branding/ (receipts will use in-app settings or default).');
  }

  // 4. Write offline-ready generated TypeScript branding module
  fs.mkdirSync(path.dirname(GENERATED_TS_PATH), { recursive: true });
  const generatedTs = `/**
 * Auto-generated by scripts/sync-github-branding.cjs during build.
 * Contains offline-ready Data URLs for any app logo or receipt stamp uploaded
 * into the repository's branding/ folder on GitHub.
 */

export const GITHUB_BUNDLED_LOGO_DATA_URL: string | null = ${JSON.stringify(bundledLogoDataUrl)};
export const GITHUB_BUNDLED_LOGO_VERSION: string | null = ${JSON.stringify(bundledLogoVersion)};

export const GITHUB_BUNDLED_STAMP_DATA_URL: string | null = ${JSON.stringify(bundledStampDataUrl)};
export const GITHUB_BUNDLED_STAMP_VERSION: string | null = ${JSON.stringify(bundledStampVersion)};
`;
  fs.writeFileSync(GENERATED_TS_PATH, generatedTs, 'utf8');

  // 5. Update public/custom-pwa-branding.json
  const manifestData = {
    updated: Date.now(),
    hasCustomLogo: true,
    githubLogoVersion: bundledLogoVersion,
    hasCustomStamp: Boolean(bundledStampDataUrl),
    githubStampVersion: bundledStampVersion,
  };
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'custom-pwa-branding.json'),
    JSON.stringify(manifestData, null, 2) + '\n',
    'utf8'
  );

  console.log('[Branding Sync] Complete.');
}

if (require.main === module) {
  syncGithubBranding();
}

module.exports = { syncGithubBranding };
