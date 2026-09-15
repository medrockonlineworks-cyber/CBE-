/**
 * Telegram Authentic Classic Green Doodle Wallpaper
 * Generates the authentic Telegram doodle pattern (avocados, palm trees, cats, coffee, lightbulbs, paper airplanes, stars, hearts)
 * over rich herbal sage green (#7fa673 / #769d6c), exactly matching Screenshot_20260915-151140.png!
 */

export function getTelegramDoodleWallpaperSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">
    <defs>
      <!-- Base Authentic Telegram Green Gradient -->
      <linearGradient id="tgDoodleBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="%237fa673"/>
        <stop offset="50%" stop-color="%2379a06d"/>
        <stop offset="100%" stop-color="%23719865"/>
      </linearGradient>

      <!-- Doodle color style matching Screenshot_20260915-151140.png -->
      <style>
        .doodle { fill: none; stroke: %23577d4c; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; opacity: 0.52; }
        .doodle-fill { fill: %23577d4c; opacity: 0.35; }
      </style>
    </defs>

    <!-- Solid Background -->
    <rect width="360" height="640" fill="url(%23tgDoodleBg)"/>

    <!-- Cute Telegram Doodles Array -->
    <!-- Avocado (cut in half with pit in center - top left) -->
    <g transform="translate(180, 200)" class="doodle">
      <path d="M 12 0 C 4 0 0 10 0 20 C 0 32 8 38 18 38 C 28 38 36 32 36 20 C 36 10 32 0 24 0 Z"/>
      <ellipse cx="18" cy="22" rx="8" ry="10" class="doodle-fill"/>
    </g>

    <!-- Palm Tree (prominently visible at bottom right of screenshot) -->
    <g transform="translate(300, 480)" class="doodle">
      <!-- Trunk -->
      <path d="M 22 100 Q 20 60 16 35 Q 26 38 25 100" stroke-width="2"/>
      <!-- Fronds -->
      <path d="M 18 35 Q 35 15 52 24"/>
      <path d="M 18 35 Q 40 35 56 46"/>
      <path d="M 18 35 Q 8 10 -10 18"/>
      <path d="M 18 35 Q -4 28 -14 44"/>
      <path d="M 18 35 Q 20 5 22 -6"/>
    </g>

    <!-- Cat Face 1 -->
    <g transform="translate(35, 120)" class="doodle">
      <circle cx="20" cy="20" r="14"/>
      <path d="M 8 10 L 12 3 L 18 8"/>
      <path d="M 32 10 L 28 3 L 22 8"/>
      <circle cx="15" cy="19" r="1.5" class="doodle-fill"/>
      <circle cx="25" cy="19" r="1.5" class="doodle-fill"/>
      <path d="M 17 24 Q 20 26 23 24"/>
    </g>

    <!-- Coffee Mug -->
    <g transform="translate(160, 45)" class="doodle">
      <rect x="0" y="5" width="22" height="20" rx="3"/>
      <path d="M 22 10 C 27 10 27 18 22 18"/>
      <path d="M 5 0 Q 7 -3 5 -6"/>
      <path d="M 12 0 Q 14 -3 12 -6"/>
    </g>

    <!-- Paper Airplane -->
    <g transform="translate(280, 80) rotate(-20)" class="doodle">
      <path d="M 0 15 L 26 0 L 14 24 L 11 16 Z"/>
      <path d="M 11 16 L 26 0"/>
    </g>

    <!-- Ice cream / drink cup -->
    <g transform="translate(25, 240)" class="doodle">
      <polygon points="4,10 18,10 14,32 8,32" class="doodle-fill"/>
      <path d="M 4 10 Q 11 0 18 10"/>
      <line x1="11" y1="2" x2="16" y2="-8"/>
    </g>

    <!-- Lightbulb -->
    <g transform="translate(300, 220)" class="doodle">
      <circle cx="12" cy="12" r="10"/>
      <path d="M 8 20 L 16 20"/>
      <path d="M 9 23 L 15 23"/>
      <path d="M 10 12 L 14 12"/>
    </g>

    <!-- Star & Sparkle -->
    <g transform="translate(80, 180)" class="doodle">
      <path d="M 10 0 L 13 7 L 20 10 L 13 13 L 10 20 L 7 13 L 0 10 L 7 7 Z" class="doodle-fill"/>
    </g>

    <!-- Heart -->
    <g transform="translate(210, 140)" class="doodle">
      <path d="M 12 6 C 8 0 0 2 0 10 C 0 16 8 20 12 24 C 16 20 24 16 24 10 C 24 2 16 0 12 6 Z"/>
    </g>

    <!-- Dog / Bear Face -->
    <g transform="translate(35, 340)" class="doodle">
      <circle cx="20" cy="20" r="14"/>
      <circle cx="8" cy="8" r="4"/>
      <circle cx="32" cy="8" r="4"/>
      <circle cx="15" cy="18" r="1.5" class="doodle-fill"/>
      <circle cx="25" cy="18" r="1.5" class="doodle-fill"/>
      <ellipse cx="20" cy="23" rx="3" ry="2" class="doodle-fill"/>
    </g>

    <!-- Cloud with rain -->
    <g transform="translate(170, 290)" class="doodle">
      <path d="M 6 16 C 0 16 0 8 6 8 C 8 2 18 2 20 6 C 26 4 28 12 26 16 Z"/>
      <line x1="8" y1="20" x2="6" y2="24"/>
      <line x1="16" y1="20" x2="14" y2="24"/>
      <line x1="24" y1="20" x2="22" y2="24"/>
    </g>

    <!-- Diamond -->
    <g transform="translate(280, 350)" class="doodle">
      <polygon points="12,0 24,10 12,24 0,10" class="doodle-fill"/>
    </g>

    <!-- Gamepad / Controller -->
    <g transform="translate(90, 440)" class="doodle">
      <rect x="0" y="0" width="28" height="16" rx="6"/>
      <line x1="6" y1="8" x2="12" y2="8"/>
      <line x1="9" y1="5" x2="9" y2="11"/>
      <circle cx="20" cy="6" r="1.5" class="doodle-fill"/>
      <circle cx="23" cy="10" r="1.5" class="doodle-fill"/>
    </g>

    <!-- Speech bubble -->
    <g transform="translate(210, 430)" class="doodle">
      <rect x="0" y="0" width="24" height="16" rx="4"/>
      <path d="M 4 16 L 4 20 L 9 16"/>
    </g>

    <!-- Rocket -->
    <g transform="translate(35, 520) rotate(25)" class="doodle">
      <path d="M 8 0 C 14 0 16 12 16 20 L 0 20 C 0 12 2 0 8 0 Z"/>
      <path d="M 0 16 L -4 22 L 0 20"/>
      <path d="M 16 16 L 20 22 L 16 20"/>
      <circle cx="8" cy="10" r="3"/>
    </g>

    <!-- Star 2 -->
    <g transform="translate(180, 520)" class="doodle">
      <polygon points="10,2 12,7 18,8 14,12 15,18 10,15 5,18 6,12 2,8 8,7" class="doodle-fill"/>
    </g>

    <!-- Strawberry / Leaf -->
    <g transform="translate(110, 580)" class="doodle">
      <path d="M 8 4 C 2 4 0 12 4 18 C 8 22 14 22 18 16 C 22 10 16 4 8 4 Z"/>
      <path d="M 8 4 L 8 0"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
