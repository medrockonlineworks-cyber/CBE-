import React from 'react';

/**
 * Authentic Dashen Bank Quick Action Icons
 * Exact 1:1 match for native mobile banking screenshot (Screenshot_20260910-151718.png)
 */

interface IconProps {
  className?: string;
}

/**
 * 1. Transfer To Dashen: Solid White Paper Airplane flying at 45 degrees
 */
export function DashenPaperPlaneIcon({ className = "w-6 h-6 text-white" }: IconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Paper airplane with fold wing shading */}
      <path 
        d="M 21.6 2.4 C 21.2 2.0 20.6 1.9 20.0 2.1 L 2.8 8.7 C 2.1 9.0 1.7 9.7 1.8 10.4 C 1.9 11.2 2.5 11.8 3.2 12.0 L 9.5 14.1 L 11.6 20.4 C 11.8 21.1 12.4 21.7 13.2 21.8 C 13.3 21.8 13.5 21.8 13.6 21.8 C 14.2 21.8 14.8 21.4 15.1 20.8 L 21.9 3.9 C 22.1 3.4 22.0 2.8 21.6 2.4 Z M 19.3 4.7 L 10.8 13.2 L 4.4 11.1 L 19.3 4.7 Z M 12.5 19.2 L 10.7 13.9 L 19.1 5.5 L 12.5 19.2 Z" 
      />
    </svg>
  );
}

/**
 * 2. Transfer by Phone: Smartphone with wireless transfer / NFC waves emitting from left
 */
export function DashenPhoneTransferIcon({ className = "w-6 h-6 text-white" }: IconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wireless signal waves on the left */}
      <path 
        d="M 4 8 C 2.5 10 2.5 14 4 16" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      <path 
        d="M 6.8 10.2 C 6.0 11.1 6.0 12.9 6.8 13.8" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* Smartphone Body */}
      <rect 
        x="9.5" 
        y="3" 
        width="11.5" 
        height="18" 
        rx="2.5" 
        fill="currentColor" 
      />
      {/* Screen Cutout */}
      <rect 
        x="11.5" 
        y="5.5" 
        width="7.5" 
        height="10.5" 
        rx="1" 
        fill="#0b224e" 
      />
      {/* Home / Touch button indicator */}
      <circle 
        cx="15.25" 
        cy="18.5" 
        r="0.8" 
        fill="#0b224e" 
      />
    </svg>
  );
}

/**
 * 3. Transfer To Other Banks: Authentic Ethiopian Interbank Bird / Dove in Flight
 * Exact match for Screenshot_20260910-151718.png
 */
export function DashenOtherBanksBirdIcon({ className = "w-6 h-6 text-white" }: IconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dove / bird soaring diagonally upwards with spread wings */}
      <path 
        d="M 21.8 7.2 C 20.6 6.8 18.8 7.3 17.5 8.2 C 17.1 6.5 16.0 4.0 14.2 2.6 C 13.2 1.8 12.0 1.9 11.4 2.7 C 10.7 3.6 10.8 4.8 11.2 6.0 C 9.8 7.2 8.3 8.8 7.5 10.8 C 6.2 10.5 4.5 10.4 3.0 10.9 C 2.0 11.3 1.6 12.3 2.0 13.2 C 2.5 14.1 3.5 14.5 4.6 14.4 C 5.8 14.2 6.8 13.6 7.5 13.0 C 7.6 14.6 8.4 16.3 9.6 17.6 C 11.1 19.2 13.2 20.0 15.2 19.8 C 16.8 19.6 18.3 18.6 19.3 17.0 C 20.8 14.6 21.6 11.7 21.7 8.8 C 22.2 8.2 22.4 7.6 21.8 7.2 Z M 16.2 10.2 C 15.6 10.2 15.1 9.7 15.1 9.1 C 15.1 8.5 15.6 8.0 16.2 8.0 C 16.8 8.0 17.3 8.5 17.3 9.1 C 17.3 9.7 16.8 10.2 16.2 10.2 Z" 
      />
    </svg>
  );
}

/**
 * 4. Transfer To Wallets: Solid white wallet with card slot and clasp
 */
export function DashenWalletsIcon({ className = "w-6 h-6 text-white" }: IconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wallet Body with upper card edge */}
      <path 
        d="M 20 6.5 L 4.5 6.5 C 3.7 6.5 3 7.2 3 8 L 3 17.5 C 3 18.9 4.1 20 5.5 20 L 19.5 20 C 20.9 20 22 18.9 22 17.5 L 22 9 C 22 7.6 20.9 6.5 20 6.5 Z M 19.5 14.5 C 18.7 14.5 18 13.8 18 13 C 18 12.2 18.7 11.5 19.5 11.5 C 20.3 11.5 21 12.2 21 13 C 21 13.8 20.3 14.5 19.5 14.5 Z" 
      />
      {/* Card peeking out from the top */}
      <path 
        d="M 5 4.5 C 5 3.7 5.7 3 6.5 3 L 17.5 3 C 18.3 3 19 3.7 19 4.5 L 19 5.5 L 5 5.5 L 5 4.5 Z" 
        fill="currentColor" 
        opacity="0.8" 
      />
    </svg>
  );
}

/**
 * 5. My Cards: Two overlapping credit cards (tilted back card + front card with chip/dots)
 */
export function DashenMyCardsIcon({ className = "w-6 h-6 text-white" }: IconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Back Tilted Card */}
      <g transform="translate(1, -1) rotate(-8 10 10)">
        <rect 
          x="3" 
          y="4.5" 
          width="15" 
          height="9.5" 
          rx="1.5" 
          fill="currentColor" 
          opacity="0.75" 
        />
        <rect x="3" y="6.5" width="15" height="2" fill="#0b224e" />
      </g>

      {/* Front Horizontal Card */}
      <rect 
        x="3.5" 
        y="9.5" 
        width="17.5" 
        height="11.5" 
        rx="2" 
        fill="currentColor" 
      />
      {/* Card Stripe & embossed dots */}
      <rect x="3.5" y="12" width="17.5" height="2.2" fill="#0b224e" />
      <circle cx="6.5" cy="17.5" r="0.75" fill="#0b224e" />
      <circle cx="8.5" cy="17.5" r="0.75" fill="#0b224e" />
      <circle cx="10.5" cy="17.5" r="0.75" fill="#0b224e" />
      <circle cx="13.5" cy="17.5" r="0.75" fill="#0b224e" />
      <circle cx="15.5" cy="17.5" r="0.75" fill="#0b224e" />
      <circle cx="17.5" cy="17.5" r="0.75" fill="#0b224e" />
    </svg>
  );
}

/**
 * 6. Mobile Top-up: Smartphone with screen and home indicator
 */
export function DashenMobileTopUpIcon({ className = "w-6 h-6 text-white" }: IconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Phone Case */}
      <rect 
        x="6" 
        y="2.5" 
        width="12" 
        height="19" 
        rx="2.5" 
        fill="currentColor" 
      />
      {/* Screen */}
      <rect 
        x="8" 
        y="5.5" 
        width="8" 
        height="11.5" 
        rx="1" 
        fill="#0b224e" 
      />
      {/* Speaker Bar */}
      <line 
        x1="10" 
        y1="4" 
        x2="14" 
        y2="4" 
        stroke="#0b224e" 
        strokeWidth="1" 
        strokeLinecap="round" 
      />
      {/* Home / Touch indicator */}
      <circle 
        cx="12" 
        cy="19" 
        r="0.8" 
        fill="#0b224e" 
      />
    </svg>
  );
}

/**
 * 7. Utility Payments: Folded Invoice / Receipt document with cut notch
 */
export function DashenUtilityPaymentsIcon({ className = "w-6 h-6 text-white" }: IconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Document body with folded corner */}
      <path 
        d="M 5 3.5 C 5 2.7 5.7 2 6.5 2 L 14.5 2 L 19 6.5 L 19 20.5 C 19 21.3 18.3 22 17.5 22 L 6.5 22 C 5.7 22 5 21.3 5 20.5 L 5 3.5 Z M 14 3.2 L 14 6 L 17.8 6 L 14 3.2 Z" 
      />
      {/* Invoice lines */}
      <rect x="7.5" y="9" width="9" height="1.8" rx="0.5" fill="#0b224e" />
      <rect x="7.5" y="12.5" width="9" height="1.8" rx="0.5" fill="#0b224e" />
      <rect x="7.5" y="16" width="6" height="1.8" rx="0.5" fill="#0b224e" />
    </svg>
  );
}

/**
 * 8. See More: Three clean rounded horizontal dots
 */
export function DashenSeeMoreIcon({ className = "w-6 h-6 text-white" }: IconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="19" cy="12" r="2.2" />
    </svg>
  );
}
