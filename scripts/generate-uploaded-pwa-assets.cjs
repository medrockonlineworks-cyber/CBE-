const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

function generateUploadedPwaAssets() {
  const publicDir = path.resolve(__dirname, '../public');
  const iconsDir = path.resolve(publicDir, 'icons');
  const logoPath = path.resolve(publicDir, 'custom-bank-logo.png');

  if (!fs.existsSync(logoPath)) {
    console.log('[PWA Asset Generator] No custom-bank-logo.png found, skipping.');
    return false;
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const logoBuf = fs.readFileSync(logoPath);
  const b64 = logoBuf.toString('base64');
  const mime = 'image/png';
  const dataUri = `data:${mime};base64,${b64}`;

  // Helper to render SVG to PNG buffer
  const renderPng = (svgStr, width, height) => {
    const resvg = new Resvg(svgStr, {
      fitTo: { mode: 'width', value: width },
      font: { loadSystemFonts: true }
    });
    return resvg.render().asPng();
  };

  // 1. Standard App Icon SVG (Pure white background + clean centered uploaded image)
  const appIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="subtleDrop" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Background Base with Squircle Corners: Pure White -->
  <rect width="512" height="512" rx="112" fill="#ffffff"/>

  <!-- Centered Logo on White Background -->
  <g filter="url(#subtleDrop)">
    <image href="${dataUri}" x="64" y="64" width="384" height="384" preserveAspectRatio="xMidYMid meet"/>
  </g>
</svg>
`;

  // 2. Maskable Icon SVG (Pure white background with 80% safe-zone centering)
  const maskableIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="maskDrop" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Full-bleed pure white background filling entire canvas -->
  <rect width="512" height="512" fill="#ffffff"/>

  <!-- Logo centered strictly inside the 80% diameter safe zone -->
  <g filter="url(#maskDrop)">
    <image href="${dataUri}" x="86" y="86" width="340" height="340" preserveAspectRatio="xMidYMid meet"/>
  </g>
</svg>
`;

  // 3. Mobile Splash / Screenshot (540x1170)
  const splashMobileSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 1170" width="540" height="1170">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a053b"/>
      <stop offset="50%" stop-color="#1b0326"/>
      <stop offset="100%" stop-color="#0c0112"/>
    </linearGradient>
    <radialGradient id="splashGlow" cx="50%" cy="38%" r="45%">
      <stop offset="0%" stop-color="rgba(222, 179, 86, 0.22)"/>
      <stop offset="100%" stop-color="rgba(222, 179, 86, 0)"/>
    </radialGradient>
  </defs>

  <rect width="540" height="1170" fill="url(#splashBg)"/>
  <circle cx="270" cy="440" r="230" fill="url(#splashGlow)"/>

  <!-- Centered Uploaded Logo -->
  <image href="${dataUri}" x="150" y="320" width="240" height="240" preserveAspectRatio="xMidYMid meet"/>

  <!-- Amharic Official Title -->
  <text x="270" y="620" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="25" fill="#deb356">የኢትዮጵያ ንግድ ባንክ</text>

  <!-- English Title -->
  <text x="270" y="656" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="17" fill="#E2E8F0">Commercial Bank of Ethiopia</text>

  <!-- App Name -->
  <text x="270" y="715" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" fill="#deb356">CBE Mobil</text>

  <!-- Slogan -->
  <text x="270" y="750" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="14" fill="#CBD5E1">The Bank You Can Always Rely On</text>
</svg>
`;

  // 4. Wide Screenshot (1280x800)
  const splashWideSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">
  <defs>
    <linearGradient id="wideBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a053b"/>
      <stop offset="50%" stop-color="#1b0326"/>
      <stop offset="100%" stop-color="#0c0112"/>
    </linearGradient>
    <radialGradient id="wideGlow" cx="50%" cy="40%" r="45%">
      <stop offset="0%" stop-color="rgba(222, 179, 86, 0.22)"/>
      <stop offset="100%" stop-color="rgba(222, 179, 86, 0)"/>
    </radialGradient>
  </defs>

  <rect width="1280" height="800" fill="url(#wideBg)"/>
  <circle cx="640" cy="320" r="320" fill="url(#wideGlow)"/>

  <!-- Centered Uploaded Logo -->
  <image href="${dataUri}" x="520" y="200" width="240" height="240" preserveAspectRatio="xMidYMid meet"/>

  <text x="640" y="490" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="28" fill="#deb356">የኢትዮጵያ ንግድ ባንክ</text>
  <text x="640" y="528" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="20" fill="#E2E8F0">Commercial Bank of Ethiopia</text>
  <text x="640" y="585" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#deb356">CBE Mobil</text>
  <text x="640" y="622" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="16" fill="#CBD5E1">The Bank You Can Always Rely On</text>
</svg>
`;

  console.log('[PWA Asset Generator] Rendering icons from uploaded image...');

  // 1. 512x512 PNG
  const png512 = renderPng(appIconSvg, 512, 512);
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);

  // 2. 192x192 PNG
  const png192 = renderPng(appIconSvg, 192, 192);
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);

  // 3. Maskable 512x512 PNG
  const pngMaskable512 = renderPng(maskableIconSvg, 512, 512);
  fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), pngMaskable512);

  // 4. Apple Touch Icon (180x180)
  const png180 = renderPng(appIconSvg, 180, 180);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);

  // 5. Mobile Screenshot / Splash Screen (540x1170)
  const pngMobile = renderPng(splashMobileSvg, 540, 1170);
  fs.writeFileSync(path.join(publicDir, 'pwa-screenshot-mobile.png'), pngMobile);

  // 6. Wide Screenshot (1280x800)
  const pngWide = renderPng(splashWideSvg, 1280, 800);
  fs.writeFileSync(path.join(publicDir, 'pwa-screenshot-wide.png'), pngWide);

  // 7. SVG Icons with embedded uploaded image
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), appIconSvg);
  fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), appIconSvg);
  fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), appIconSvg);
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), maskableIconSvg);

  // 8. Write branding marker
  const timestamp = Date.now();
  fs.writeFileSync(
    path.join(publicDir, 'custom-pwa-branding.json'),
    JSON.stringify({ updated: timestamp, hasCustomLogo: true }, null, 2)
  );

  console.log('[PWA Asset Generator] Successfully generated all installed app icons from uploaded image!');
  return true;
}

if (require.main === module) {
  generateUploadedPwaAssets();
}

module.exports = { generateUploadedPwaAssets };
