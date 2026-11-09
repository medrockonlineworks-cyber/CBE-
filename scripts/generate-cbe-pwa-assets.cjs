const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// 1. CBE Golden Emblem Vector (Authentic CBE Coin + Spiral Rays)
const cbeEmblemSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b0a50"/>
      <stop offset="60%" stop-color="#2a053b"/>
      <stop offset="100%" stop-color="#180122"/>
    </linearGradient>
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
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Base with Rounded Corners: Pure White -->
  <rect width="512" height="512" rx="104" fill="#ffffff"/>

  <!-- Subtle Outer Golden Ring -->
  <circle cx="256" cy="256" r="236" fill="none" stroke="#deb356" stroke-width="4" opacity="0.35"/>

  <!-- Radiating Spiral Waves -->
  <g stroke="#deb356" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.9" transform="translate(30, 20) scale(3.5)">
    <path d="M60 22 C40 22, 16 35, 12 55 C8 75, 26 95, 52 98 C78 101, 104 88, 108 65 C112 42, 90 28, 68 28 C46 28, 30 42, 28 58 C26 74, 40 86, 58 87 C76 88, 90 78, 92 64 C94 50, 82 40, 68 40"/>
    <path d="M56 16 C32 17, 10 32, 6 56 C2 80, 22 102, 50 106 C78 110, 108 96, 114 70 C120 44, 98 22, 72 22" opacity="0.6"/>
    <path d="M64 26 C44 26, 22 38, 18 58 C14 78, 30 96, 56 99 C82 102, 102 88, 105 68" opacity="0.5"/>
    <path d="M50 30 C34 32, 22 44, 20 58 C18 72, 30 84, 48 87" opacity="0.7"/>
  </g>

  <!-- Coin Body with Deep Golden Gradients -->
  <g transform="translate(30, 20) scale(3.5)">
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
</svg>
`;

// Maskable Icon with 15% safe padding
const cbeMaskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b0a50"/>
      <stop offset="60%" stop-color="#2a053b"/>
      <stop offset="100%" stop-color="#180122"/>
    </linearGradient>
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

  <!-- Full Bleed Pure White Background for Clean Edge-to-Edge Launch -->
  <rect width="512" height="512" fill="#ffffff"/>

  <!-- Centered Scaled Content (80% Safe Zone) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <!-- Radiating Spiral Waves -->
    <g stroke="#deb356" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.9" transform="translate(30, 20) scale(3.5)">
      <path d="M60 22 C40 22, 16 35, 12 55 C8 75, 26 95, 52 98 C78 101, 104 88, 108 65 C112 42, 90 28, 68 28 C46 28, 30 42, 28 58 C26 74, 40 86, 58 87 C76 88, 90 78, 92 64 C94 50, 82 40, 68 40"/>
      <path d="M56 16 C32 17, 10 32, 6 56 C2 80, 22 102, 50 106 C78 110, 108 96, 114 70 C120 44, 98 22, 72 22" opacity="0.6"/>
      <path d="M64 26 C44 26, 22 38, 18 58 C14 78, 30 96, 56 99 C82 102, 102 88, 105 68" opacity="0.5"/>
      <path d="M50 30 C34 32, 22 44, 20 58 C18 72, 30 84, 48 87" opacity="0.7"/>
    </g>

    <!-- Coin Body with Deep Golden Gradients -->
    <g transform="translate(30, 20) scale(3.5)">
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

// 2. Mobile Splash Screen / Screenshot (540 x 1170)
// High-fidelity CBE Mobile Banking branded screen with CBE Gold Emblem
const cbeMobileScreenshotSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 1170" width="540" height="1170">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a053b"/>
      <stop offset="45%" stop-color="#1b0326"/>
      <stop offset="100%" stop-color="#0c0112"/>
    </linearGradient>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFF3C4"/>
      <stop offset="40%" stop-color="#deb356"/>
      <stop offset="100%" stop-color="#F5B041"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
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

  <!-- Background: Pure White Edge-to-Edge -->
  <rect width="540" height="1170" fill="#ffffff"/>

  <!-- Top Status / Brand Header Indicator -->
  <g transform="translate(40, 70)">
    <rect width="460" height="4" rx="2" fill="#deb356" opacity="0.3"/>
  </g>

  <!-- Central CBE Emblem (High Resolution) -->
  <g transform="translate(135, 300)">
    <!-- Radiating Spiral Waves -->
    <g stroke="#deb356" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.95" transform="translate(10, 5) scale(2.3)">
      <path d="M60 22 C40 22, 16 35, 12 55 C8 75, 26 95, 52 98 C78 101, 104 88, 108 65 C112 42, 90 28, 68 28 C46 28, 30 42, 28 58 C26 74, 40 86, 58 87 C76 88, 90 78, 92 64 C94 50, 82 40, 68 40"/>
      <path d="M56 16 C32 17, 10 32, 6 56 C2 80, 22 102, 50 106 C78 110, 108 96, 114 70 C120 44, 98 22, 72 22" opacity="0.6"/>
      <path d="M64 26 C44 26, 22 38, 18 58 C14 78, 30 96, 56 99 C82 102, 102 88, 105 68" opacity="0.5"/>
      <path d="M50 30 C34 32, 22 44, 20 58 C18 72, 30 84, 48 87" opacity="0.7"/>
    </g>

    <!-- Coin Body -->
    <g transform="translate(10, 5) scale(2.3)">
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

  <!-- Typography & Official Identity -->
  <g text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">
    <!-- Amharic Official Title -->
    <text x="270" y="660" font-size="28" font-weight="bold" fill="#b8860b" letter-spacing="1">
      የኢትዮጵያ ንግድ ባንክ
    </text>

    <!-- English Official Title -->
    <text x="270" y="700" font-size="20" font-weight="600" fill="#1f2937" letter-spacing="1.5">
      Commercial Bank of Ethiopia
    </text>

    <!-- App Name Highlight -->
    <text x="270" y="755" font-size="34" font-weight="900" fill="#70189F" letter-spacing="2">
      CBE Mobile
    </text>

    <!-- Official Slogan -->
    <text x="270" y="795" font-size="16" font-weight="400" fill="#6b7280" letter-spacing="0.5">
      The Bank You Can Always Rely On
    </text>
  </g>

  <!-- Feature Highlights Box -->
  <g transform="translate(45, 840)">
    <rect width="450" height="180" rx="24" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    
    <g transform="translate(30, 38)" font-family="system-ui, -apple-system, sans-serif">
      <!-- Item 1 -->
      <circle cx="16" cy="16" r="14" fill="#deb356" opacity="0.2"/>
      <path d="M11 16 L15 20 L21 12" stroke="#b8860b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <text x="44" y="22" font-size="16" font-weight="bold" fill="#1f2937">Instant CBE Birr &amp; Interbank Transfers</text>

      <!-- Item 2 -->
      <g transform="translate(0, 50)">
        <circle cx="16" cy="16" r="14" fill="#deb356" opacity="0.2"/>
        <path d="M11 16 L15 20 L21 12" stroke="#b8860b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <text x="44" y="22" font-size="16" font-weight="bold" fill="#1f2937">Official Digital Receipts with QR Code</text>
      </g>

      <!-- Item 3 -->
      <g transform="translate(0, 100)">
        <circle cx="16" cy="16" r="14" fill="#deb356" opacity="0.2"/>
        <path d="M11 16 L15 20 L21 12" stroke="#b8860b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <text x="44" y="22" font-size="16" font-weight="bold" fill="#1f2937">Secure Biometric &amp; End-to-End Encryption</text>
      </g>
    </g>
  </g>

  <!-- Bottom Version & Security Footer -->
  <g text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" opacity="0.7">
    <text x="270" y="1090" font-size="13" font-weight="500" fill="#6b7280">
      Official Commercial Bank of Ethiopia PWA • Secured by CBE
    </text>
  </g>
</svg>
`;

// 3. Wide Screenshot (1280 x 800)
const cbeWideScreenshotSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">
  <defs>
    <linearGradient id="wBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a053b"/>
      <stop offset="45%" stop-color="#1b0326"/>
      <stop offset="100%" stop-color="#0c0112"/>
    </linearGradient>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFF3C4"/>
      <stop offset="40%" stop-color="#deb356"/>
      <stop offset="100%" stop-color="#F5B041"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
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

  <rect width="1280" height="800" fill="#ffffff"/>

  <!-- Left Hero Section -->
  <g transform="translate(100, 200)" font-family="system-ui, -apple-system, sans-serif">
    <text x="0" y="40" font-size="28" font-weight="bold" fill="#b8860b" letter-spacing="1">
      የኢትዮጵያ ንግድ ባንክ
    </text>
    <text x="0" y="85" font-size="22" font-weight="600" fill="#1f2937" letter-spacing="1">
      Commercial Bank of Ethiopia
    </text>
    <text x="0" y="160" font-size="52" font-weight="900" fill="#70189F" letter-spacing="1">
      CBE Mobile
    </text>
    <text x="0" y="210" font-size="20" font-weight="400" fill="#4b5563">
      The Bank You Can Always Rely On • Secure Digital Banking Anywhere
    </text>

    <!-- Badges -->
    <g transform="translate(0, 260)">
      <rect width="180" height="46" rx="14" fill="#deb356" opacity="0.15" stroke="#deb356" stroke-width="1.5"/>
      <text x="90" y="29" font-size="15" font-weight="bold" fill="#deb356" text-anchor="middle">Official CBE PWA</text>

      <g transform="translate(200, 0)">
        <rect width="220" height="46" rx="14" fill="#10B981" opacity="0.15" stroke="#10B981" stroke-width="1.5"/>
        <text x="110" y="29" font-size="15" font-weight="bold" fill="#34D399" text-anchor="middle">End-to-End Encrypted</text>
      </g>
    </g>
  </g>

  <!-- Right Central Emblem -->
  <g transform="translate(800, 180)">
    <!-- Radiating Waves -->
    <g stroke="#deb356" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.9" transform="translate(20, 10) scale(3.4)">
      <path d="M60 22 C40 22, 16 35, 12 55 C8 75, 26 95, 52 98 C78 101, 104 88, 108 65 C112 42, 90 28, 68 28 C46 28, 30 42, 28 58 C26 74, 40 86, 58 87 C76 88, 90 78, 92 64 C94 50, 82 40, 68 40"/>
      <path d="M56 16 C32 17, 10 32, 6 56 C2 80, 22 102, 50 106 C78 110, 108 96, 114 70 C120 44, 98 22, 72 22" opacity="0.6"/>
      <path d="M64 26 C44 26, 22 38, 18 58 C14 78, 30 96, 56 99 C82 102, 102 88, 105 68" opacity="0.5"/>
      <path d="M50 30 C34 32, 22 44, 20 58 C18 72, 30 84, 48 87" opacity="0.7"/>
    </g>

    <!-- Coin -->
    <g transform="translate(20, 10) scale(3.4)">
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

function renderPng(svgString, width, height) {
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: width,
    },
    defaultBackground: 'rgba(0, 0, 0, 0)',
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating Authentic CBE PWA Icons and Splash Assets...');

// 1. 512x512 PNG
const png512 = renderPng(cbeEmblemSvg, 512, 512);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
console.log('✓ pwa-512x512.png & icons/icon-512.png');

// 2. 192x192 PNG
const png192 = renderPng(cbeEmblemSvg, 192, 192);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
console.log('✓ pwa-192x192.png & icons/icon-192.png');

// 3. Maskable 512x512 PNG
const pngMaskable512 = renderPng(cbeMaskableSvg, 512, 512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), pngMaskable512);
console.log('✓ pwa-maskable-512x512.png & icons/icon-maskable-512.png');

// 4. Apple Touch Icon (180x180)
const png180 = renderPng(cbeEmblemSvg, 180, 180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
console.log('✓ apple-touch-icon.png');

// 5. Mobile Screenshot / Splash Screen (540x1170)
const pngMobileScreenshot = renderPng(cbeMobileScreenshotSvg, 540, 1170);
fs.writeFileSync(path.join(publicDir, 'pwa-screenshot-mobile.png'), pngMobileScreenshot);
console.log('✓ pwa-screenshot-mobile.png (NO MORE DASHEN BANK!)');

// 6. Wide Screenshot (1280x800)
const pngWideScreenshot = renderPng(cbeWideScreenshotSvg, 1280, 800);
fs.writeFileSync(path.join(publicDir, 'pwa-screenshot-wide.png'), pngWideScreenshot);
console.log('✓ pwa-screenshot-wide.png');

// 7. Update favicon.svg with CBE Gold Emblem
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), cbeEmblemSvg);
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), cbeEmblemSvg);
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), cbeEmblemSvg);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), cbeMaskableSvg);
console.log('✓ SVG icons updated');

console.log('All CBE PWA Assets successfully generated!');
