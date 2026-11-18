const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const resDir = path.resolve(__dirname, '../android/app/src/main/res');
const foregroundIconPath = path.join(resDir, 'mipmap-xxxhdpi/ic_launcher_foreground.png');
const fallbackLogoPath = path.resolve(__dirname, '../public/pwa-512x512.png');

const iconSourcePath = fs.existsSync(foregroundIconPath) ? foregroundIconPath : fallbackLogoPath;
const iconBase64 = fs.readFileSync(iconSourcePath).toString('base64');
const iconDataUri = `data:image/png;base64,${iconBase64}`;

const whiteSplashSvg = (w, h) => {
  const iconSize = Math.round(Math.min(w, h) * 0.44);
  const x = Math.round((w - iconSize) / 2);
  const y = Math.round((h - iconSize) / 2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <image href="${iconDataUri}" x="${x}" y="${y}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
};

function renderSvg(svgStr, w) {
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: w },
    defaultBackground: '#ffffff',
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
  const png = renderSvg(whiteSplashSvg(t.w, t.h), t.w);
  fs.writeFileSync(path.join(folder, 'splash.png'), png);
  console.log(`Generated centered white splash for ${t.dir} (${t.w}x${t.h})`);
}

console.log('All native Android splash drawables updated!');
