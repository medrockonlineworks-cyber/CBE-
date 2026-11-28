import React from 'react';
import { DEFAULT_CBE_LOGO, LocalDb } from '../lib/mockData';

interface CbeOfficialStampProps {
  className?: string;
  size?: number;
  rotation?: number;
  branchCode?: string;
  adminLogo?: string | null;
  preferAdminUploaded?: boolean;
}

/**
 * Authentic Commercial Bank of Ethiopia (CBE) Circular Purple Rubber Stamp
 * Replicates the exact stamp from IMG_20260905_105826_969.png & Screenshot_20260904-124126.png:
 * - Bold outer double boundary rings (heavy saturated purple ink)
 * - Ultra-bold upper Amharic arc: "የኢትዮጵያ ንግድ ባንክ"
 * - Ultra-bold lower English arc: "Commercial Bank of Ethiopia * 9.1.6"
 * - Bold inner boundary circle line
 * - Center designs:
 *   1. Central tilted oval medallion with authentic CBE "CB" monogram and inner oval ring
 *   2. Dense lower fan array of 14 radial arms with connected chain loops / scales reaching the inner ring
 *   3. Upper-left radiating comb/harp rays with transverse cross-hatching
 *   4. Right spiraling nautilus ribbon waves with transverse security marks
 *   5. Real rubber stamp ink color (#461066) with multiply blend mode & aspect-ratio 1:1 protection
 *   6. Seamless integration of admin uploaded logo if provided
 */
export const CbeOfficialStamp: React.FC<CbeOfficialStampProps> = ({
  className = '',
  size = 195,
  rotation = -13,
  branchCode = '9.1.6',
  adminLogo = null,
  preferAdminUploaded = false,
}) => {
  const uploadedStamp = LocalDb.getCustomBankStamp();
  if (uploadedStamp) {
    return (
      <div
        className={`relative pointer-events-none select-none shrink-0 ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          maxWidth: `${size}px`,
          maxHeight: `${size}px`,
          aspectRatio: '1 / 1',
          transform: `rotate(${rotation}deg)`,
          mixBlendMode: 'multiply',
          opacity: 0.95,
        }}
      >
        <img
          src={uploadedStamp}
          alt="Official Bank Stamp"
          draggable={false}
          className="w-full h-full object-contain block"
        />
      </div>
    );
  }

  const inkColor = '#5e1887'; // Authentic CBE signature vibrant purple rubber ink

  // Generate the 14 radial arms of connected chain loops for the lower feather array
  const renderPeacockLoopChains = () => {
    const arms = [];
    const numArms = 14;
    const startAngle = 36; // degrees (clockwise from positive x-axis)
    const endAngle = 166;
    const step = (endAngle - startAngle) / (numArms - 1);

    for (let i = 0; i < numArms; i++) {
      const angleDeg = startAngle + i * step;
      const angleRad = (angleDeg * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);

      // Along each arm, 5 connected elliptical loops extending all the way to inner rim (r=74)
      const loops = [];
      const numLoops = 5;
      const startR = 24;
      const endR = 73;
      const rStep = (endR - startR) / (numLoops - 1);

      for (let j = 0; j < numLoops; j++) {
        const r = startR + j * rStep;
        const cx = 120 + r * cosA;
        const cy = 117 + r * sinA;
        const rx = 2.4 + j * 0.48; // loop width across ray
        const ry = 4.2 + j * 0.58; // loop length along ray

        loops.push(
          <ellipse
            key={`arm-${i}-loop-${j}`}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            transform={`rotate(${angleDeg + 90} ${cx} ${cy})`}
            fill="none"
            stroke={inkColor}
            strokeWidth="1.35"
            opacity="0.95"
          />
        );
      }

      arms.push(
        <g key={`loop-arm-${i}`}>
          {/* Central spine line of the arm */}
          <line
            x1={120 + 22 * cosA}
            y1={117 + 22 * sinA}
            x2={120 + 74 * cosA}
            y2={117 + 74 * sinA}
            stroke={inkColor}
            strokeWidth="0.9"
            strokeDasharray="2 1.5"
            opacity="0.75"
          />
          {loops}
        </g>
      );
    }
    return arms;
  };

  // Check if admin uploaded a custom logo
  const hasCustomAdminLogo = adminLogo && 
    typeof adminLogo === 'string' && 
    adminLogo.trim().length > 0 && 
    adminLogo !== DEFAULT_CBE_LOGO;

  return (
    <div
      className={`relative pointer-events-none select-none shrink-0 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        aspectRatio: '1 / 1',
        transform: `rotate(${rotation}deg)`,
        mixBlendMode: 'multiply',
        opacity: 0.93
      }}
    >
      <svg
        viewBox="0 0 240 240"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          maxWidth: `${size}px`,
          maxHeight: `${size}px`,
          aspectRatio: '1 / 1'
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Upper Arc Path: Amharic 'የኢትዮጵያ ንግድ ባንክ' spanning ~9:45 to ~2:15 */}
          <path
            id="cbeStampUpperArc"
            d="M 29.5,120 A 90.5,90.5 0 0,1 210.5,120"
            fill="none"
          />

          {/* Lower Arc Path: English 'Commercial Bank of Ethiopia * 9.1.6' */}
          <path
            id="cbeStampLowerArc"
            d="M 29.5,120 A 90.5,90.5 0 0,0 210.5,120"
            fill="none"
          />

          {/* Diagonal Security Hatching Pattern for Center Background */}
          <pattern
            id="cbeBanknoteHatch"
            width="3.2"
            height="3.2"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="3.2" stroke={inkColor} strokeWidth="1.2" />
          </pattern>

          {/* Inner Circle Clip Path for Admin Logo */}
          <clipPath id="cbeInnerCircleClip">
            <circle cx="120" cy="120" r="74" />
          </clipPath>
        </defs>

        {/* 1. Outer Double Boundary Rings - Bold and Textured like real rubber stamp */}
        {/* Outermost Bold Boundary Rim */}
        <circle
          cx="120"
          cy="120"
          r="114"
          stroke={inkColor}
          strokeWidth="4.2"
          strokeDasharray="140 2 95 1.5 130 2"
          strokeLinecap="round"
        />
        {/* Concentric Inner Boundary Ring */}
        <circle
          cx="120"
          cy="120"
          r="107.5"
          stroke={inkColor}
          strokeWidth="2.0"
          opacity="0.95"
        />

        {/* 2. Bold Upper Arc Text: Amharic "የኢትዮጵያ ንግድ ባንክ" */}
        <text
          fill={inkColor}
          stroke={inkColor}
          strokeWidth="0.8"
          paintOrder="stroke fill"
          fontSize="16.5"
          fontWeight="900"
          letterSpacing="2.8px"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          <textPath
            href="#cbeStampUpperArc"
            startOffset="50%"
            textAnchor="middle"
          >
            የኢትዮጵያ ንግድ ባንክ
          </textPath>
        </text>

        {/* 3. Bold Lower Arc Text: English "Commercial Bank of Ethiopia * 9.1.6" */}
        <text
          fill={inkColor}
          stroke={inkColor}
          strokeWidth="0.6"
          paintOrder="stroke fill"
          fontSize="12.5"
          fontWeight="900"
          letterSpacing="1.2px"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          <textPath
            href="#cbeStampLowerArc"
            startOffset="50%"
            textAnchor="middle"
          >
            Commercial Bank of Ethiopia * {branchCode}
          </textPath>
        </text>

        {/* 4. Bold Inner Circular Boundary Ring */}
        <circle
          cx="120"
          cy="120"
          r="76"
          stroke={inkColor}
          strokeWidth="3.2"
        />

        {/* ========================================================================= */}
        {/* 5. CENTER DESIGNS: Admin Uploaded Logo OR Authentic Vector CBE Designs */}
        {/* ========================================================================= */}

        {hasCustomAdminLogo && preferAdminUploaded ? (
          /* Admin Uploaded Logo rendered cleanly inside the stamp's inner ring */
          <g clipPath="url(#cbeInnerCircleClip)">
            <circle cx="120" cy="120" r="75" fill="#ffffff" opacity="0.85" />
            <image
              href={adminLogo!}
              x="46"
              y="46"
              width="148"
              height="148"
              preserveAspectRatio="xMidYMid meet"
              style={{
                filter: 'contrast(1.3) brightness(0.95)',
                mixBlendMode: 'multiply'
              }}
            />
          </g>
        ) : (
          /* Authentic Vector CBE Emblem Designs Matching IMG_20260905_105826_969.png */
          <g>
            {/* A. Background Diagonal Security Hatching Shading */}
            <path
              d="M 68 100 C 72 68, 114 56, 148 64 C 176 72, 184 104, 178 136 C 166 166, 126 178, 92 168 C 66 156, 62 126, 68 100 Z"
              fill="url(#cbeBanknoteHatch)"
              opacity="0.45"
            />

            {/* B. Upper-Left Radiating Comb / Harp Rays with Cross-Hatching */}
            <g stroke={inkColor} strokeWidth="1.4" opacity="0.95">
              {/* Outer stepped rim of the comb */}
              <path
                d="M 68 96 C 72 74, 86 58, 114 56 L 122 56"
                fill="none"
                strokeWidth="2.0"
              />
              {/* Radiating comb rays from hub to outer rim */}
              <line x1="108" y1="105" x2="68" y2="96" />
              <line x1="110" y1="102" x2="72" y2="86" />
              <line x1="112" y1="99" x2="78" y2="76" />
              <line x1="114" y1="96" x2="86" y2="68" />
              <line x1="116" y1="93" x2="96" y2="61" />
              <line x1="118" y1="90" x2="108" y2="57" />
              <line x1="120" y1="88" x2="120" y2="56" />

              {/* Transverse Cross-Hatch Lines across the comb rays */}
              <path d="M 72 92 C 80 82, 92 72, 110 68" fill="none" strokeWidth="1.1" />
              <path d="M 80 96 C 88 86, 100 78, 116 75" fill="none" strokeWidth="1.1" />
              <path d="M 90 101 C 96 93, 106 85, 120 82" fill="none" strokeWidth="1.1" />
            </g>

            {/* C. Right Swirling Spiral Nautilus Waves (7 concentric curving bands) */}
            <g stroke={inkColor} fill="none" opacity="0.95">
              <path
                d="M 124 76 C 152 64, 184 82, 188 110 C 192 134, 178 154, 154 162"
                strokeWidth="2.0"
              />
              <path
                d="M 122 82 C 148 71, 176 88, 180 112 C 183 131, 171 149, 150 156"
                strokeWidth="1.7"
              />
              <path
                d="M 120 88 C 144 78, 168 93, 172 114 C 175 129, 164 144, 146 150"
                strokeWidth="1.5"
              />
              <path
                d="M 118 94 C 138 85, 160 98, 164 116 C 167 127, 158 139, 142 144"
                strokeWidth="1.4"
              />
              <path
                d="M 116 100 C 132 92, 152 103, 156 118 C 158 126, 152 134, 138 138"
                strokeWidth="1.3"
              />
              <path
                d="M 114 106 C 128 99, 144 108, 148 120 C 150 126, 145 130, 134 133"
                strokeWidth="1.2"
              />
              <path
                d="M 112 112 C 122 106, 136 113, 140 122 C 141 126, 138 128, 130 129"
                strokeWidth="1.1"
              />

              {/* Fine transverse security tick marks on the outermost spiral ribbon */}
              <line x1="144" y1="68" x2="147" y2="72" strokeWidth="1.3" />
              <line x1="158" y1="73" x2="160" y2="78" strokeWidth="1.3" />
              <line x1="172" y1="84" x2="171" y2="89" strokeWidth="1.3" />
              <line x1="182" y1="98" x2="178" y2="102" strokeWidth="1.3" />
              <line x1="187" y1="112" x2="182" y2="114" strokeWidth="1.3" />
              <line x1="183" y1="128" x2="178" y2="128" strokeWidth="1.3" />
              <line x1="175" y1="142" x2="169" y2="140" strokeWidth="1.3" />
            </g>

            {/* D. Lower Peacock / Shell Loop Fan Array (14 radiating arms of connected chain links) */}
            {renderPeacockLoopChains()}

            {/* E. Central Tilted Oval Medallion with CBE "CB" Monogram - Purple Medallion with Solid White CBE Symbol */}
            <g transform="translate(120, 116) rotate(-26)">
              {/* Solid Purple Opaque Medallion Backing */}
              <ellipse
                cx="0"
                cy="0"
                rx="25"
                ry="18"
                fill={inkColor}
                stroke={inkColor}
                strokeWidth="2.5"
              />

              {/* Secondary Concentric Inner White Oval Rim */}
              <ellipse
                cx="0"
                cy="0"
                rx="22"
                ry="15"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                opacity="0.85"
              />

              {/* Fine White Security Hatch Lines inside upper & lower areas of oval */}
              <g stroke="#ffffff" strokeWidth="0.8" opacity="0.4">
                <line x1="-12" y1="-11.5" x2="12" y2="-11.5" />
                <line x1="-14" y1="-9.5" x2="14" y2="-9.5" />
                <line x1="-14" y1="9.5" x2="14" y2="9.5" />
                <line x1="-12" y1="11.5" x2="12" y2="11.5" />
              </g>

              {/* If admin uploaded a logo and we want to feature it in center medallion */}
              {hasCustomAdminLogo && !preferAdminUploaded ? (
                <image
                  href={adminLogo!}
                  x="-16"
                  y="-12"
                  width="32"
                  height="24"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ filter: 'contrast(1.2) brightness(1.2)', mixBlendMode: 'screen' }}
                />
              ) : (
                /* Authentic CBE "CB" Monogram Emblem inside Medallion - In Solid Crisp White */
                <g fill="#ffffff" transform="scale(0.92)">
                  {/* Center Vertical Divider Post in White */}
                  <rect x="-2.5" y="-10" width="5" height="20" rx="1.5" />

                  {/* Left "C" Monogram Arc in White */}
                  <path
                    d="M -2.5 -8.5 C -13 -8.5, -13 8.5, -2.5 8.5 L -2.5 4.8 C -8.5 4.8, -8.5 -4.8, -2.5 -4.8 Z"
                  />

                  {/* Right "B" Monogram Lobes in White */}
                  {/* Upper B lobe in White */}
                  <path
                    d="M 2.5 -8.5 C 10.5 -8.5, 10.5 -0.5, 2.5 -0.5 Z"
                  />
                  {/* Upper B cut-out showing purple medallion interior */}
                  <path
                    d="M 2.5 -6.2 C 6.8 -6.2, 6.8 -2.8, 2.5 -2.8 Z"
                    fill={inkColor}
                  />
                  {/* Lower B lobe in White */}
                  <path
                    d="M 2.5 -0.5 C 11.5 -0.5, 11.5 8.5, 2.5 8.5 Z"
                  />
                  {/* Lower B cut-out showing purple medallion interior */}
                  <path
                    d="M 2.5 1.8 C 7.5 1.8, 7.5 6.2, 2.5 6.2 Z"
                    fill={inkColor}
                  />

                  {/* Center Diamond Security Motif */}
                  <polygon points="0,-3 3,0 0,3 -3,0" fill={inkColor} />
                </g>
              )}
            </g>
          </g>
        )}

        {/* 6. Authentic Rubber Stamp Stipple Specks & Ink Flecks */}
        <circle cx="56" cy="42" r="1.0" fill={inkColor} opacity="0.6" />
        <circle cx="186" cy="188" r="1.1" fill={inkColor} opacity="0.5" />
        <circle cx="42" cy="154" r="1.0" fill={inkColor} opacity="0.6" />
        <circle cx="202" cy="78" r="1.0" fill={inkColor} opacity="0.6" />
        <circle cx="114" cy="22" r="0.9" fill={inkColor} opacity="0.55" />
        <circle cx="178" cy="46" r="0.8" fill={inkColor} opacity="0.5" />
        <circle cx="68" cy="192" r="0.9" fill={inkColor} opacity="0.5" />
        <circle cx="98" cy="172" r="0.8" fill={inkColor} opacity="0.4" />
        <circle cx="146" cy="62" r="0.8" fill={inkColor} opacity="0.4" />
      </svg>
    </div>
  );
};

export default CbeOfficialStamp;
