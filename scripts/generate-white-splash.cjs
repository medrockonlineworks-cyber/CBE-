const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const resDir = path.resolve(__dirname, '../android/app/src/main/res');

// Pure white splash screen SVG with centered high-res CBE emblem
const whiteSplashSvg = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF3C4"/>
      <stop offset="30%" stop-color="#F1C40F"/>
      <stop offset="70%" stop-color="#C69214"/>
      <stop offset="100%" stop-color="#7D6608"/>
    </linearGradient>
    <linearGradient id="gold2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9A6305"/>
      <stop offset="50%" stop-color="#F5B041"/>
      <stop offset="100%" stop-color="#FDEBD0"/>
    </linearGradient>
    <radialGradient id="sh1" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#D4AF37" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#6E4804" stop-opacity="0.2"/>
    </radialGradient>
  </defs>

  <!-- Pure White Edge-to-Edge Canvas -->
  <rect width="${w}" height="${h}" fill="#ffffff"/>

  <!-- Centered Scaled CBE Golden Coin & Spiral Waves -->
  <g transform="translate(${w / 2 - 120}, ${h / 2 - 120}) scale(2.0)">
    <!-- Spiral Waves -->
    <g stroke="#deb356" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.95" transform="translate(10, 5) scale(2.1)">
      <path d="M60 22 C40 22, 16 35, 12 55 C8 75, 26 95, 52 98 C78 101, 104 88, 108 65 C112 42, 90 28, 68 28 C46 28, 30 42, 28 58 C26 74, 40 86, 58 87 C76 88, 90 78, 92 64 C94 50, 82 40, 68 40"/>
      <path d="M56 16 C32 17, 10 32, 6 56 C2 80, 22 102, 50 106 C78 110, 108 96, 114 70 C120 44, 98 22, 72 22" opacity="0.6"/>
      <path d="M64 26 C44 26, 22 38, 18 58 C14 78, 30 96, 56 99 C82 102, 102 88, 105 68" opacity="0.5"/>
      <path d="M50 30 C34 32, 22 44, 20 58 C18 72, 30 84, 48 87" opacity="0.7"/>
    </g>

    <!-- Coin Body -->
    <g transform="translate(10, 5) scale(2.1)">
      <circle cx="68" cy="62" r="38" fill="url(#gold1)" stroke="#7D6608" stroke-width="1.8"/>
      <circle cx="68" cy="62" r="34" fill="url(#gold2)" stroke="#F9E79F" stroke-width="1.2"/>
      <circle cx="68" cy="62" r="34" fill="url(#sh1)"/>
      <circle cx="68" cy="62" r="31" fill="none" stroke="#7D6608" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.8"/>
      <circle cx="68" cy="62" r="26" fill="#FAD7A0" stroke="#935116" stroke-width="1.4"/>
      
      <!-- CBE Monogram -->
      <g fill="#7E5109" transform="translate(48, 44) scale(0.65)">
        <path d="M30 4 C15 4, 4 15, 4 30 C4 45, 15 56, 30 56 C45 56, 56 45, 56 30 C56 15, 45 4, 30 4 Z M30 10 C41 10, 50 19, 50 30 C50 41, 41 50, 30 50 C19 50, 10 41, 10 30 C10 19, 19 10, 30 10 Z"/>
        <rect x="26" y="16" width="8" height="28" rx="2" fill="#6E2C00"/>
        <path d="M18 24 Q30 15 42 24 L42 28 Q30 19 18 28 Z" fill="#6E2C00"/>
        <circle cx="30" cy="22" r="3.5" fill="#FAD7A0"/>
        <rect x="18" y="40" width="24" height="4" rx="1" fill="#6E2C00"/>
      </g>
    </g>
  </g>
</svg>
`;

function renderSvg(svgStr, w, h) {
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: w },
    defaultBackground: '#ffffff'
  });
  return resvg.render().asPng();
}

const targets = [
  { dir: 'drawable', w: 480, h: 800 },
  { dir: 'drawable-port-mdpi', w: 320, h: 480 },
  { dir: 'drawable-port-hdpi', w: 480, h: 800 },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
  { dir: 'drawable-land-mdpi', w: 480, h: 320 },
  { dir: 'drawable-land-hdpi', w: 800, h: 480 },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
];

for (const t of targets) {
  const folder = path.join(resDir, t.dir);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  const png = renderSvg(whiteSplashSvg(t.w, t.h), t.w, t.h);
  fs.writeFileSync(path.join(folder, 'splash.png'), png);
  console.log(`Generated pure white splash for ${t.dir} (${t.w}x${t.h})`);
}

console.log('All native Android splash drawables updated to pure white edge-to-edge!');
