import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  color?: string;
}

/**
 * 1. Apps Grid Icon
 * 2x2 grid of 4 rounded-square outlines
 */
export const AppsGridIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Top Left */}
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="2" />
    {/* Top Right */}
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="2" />
    {/* Bottom Left */}
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="2" />
    {/* Bottom Right */}
    <rect x="14" y="14" width="6.5" height="6.5" rx="2" />
  </svg>
);

/**
 * 2. Refresh / Reload Icon (Uses Material Symbols 'rotate_left' with thin line weight)
 */
export const RefreshIcon: React.FC<ReceiptIconProps> = ({
  size = 20,
  className = '',
  color = 'currentColor',
  style,
  ...props
}) => (
  <span
    className={`material-symbols-outlined select-none inline-flex items-center justify-center leading-none ${className}`}
    style={{
      fontSize: typeof size === 'number' ? `${size}px` : size,
      fontWeight: 200,
      fontVariationSettings: "'wght' 200, 'opsz' 20",
      color,
      display: 'inline-flex',
      ...style,
    }}
    aria-hidden="true"
    {...props}
  >
    rotate_left
  </span>
);

export const ReloadIcon = RefreshIcon;

/**
 * 3. Loading / Processing / Status Search Icon (Matching CBE reference screenshot)
 * Complete circle with a small circular dot at the bottom-right.
 */
export const CbeLoadingStatusIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2.4,
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* One complete main circle */}
    <circle cx="11.5" cy="11" r="7.2" strokeWidth={strokeWidth} />
    {/* Small bottom-right dot circle */}
    <circle cx="19" cy="18.5" r="1.7" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 3. Profile Icon
 * Circular outer outline with simple user/profile silhouette inside
 */
export const ProfileCircleIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Outer circle outline */}
    <circle cx="12" cy="12" r="9.5" />
    {/* User head */}
    <circle cx="12" cy="8.5" r="3.2" />
    {/* User shoulders */}
    <path d="M6.2 18.2a6.5 6.5 0 0 1 11.6 0" />
  </svg>
);

/**
 * 4. Eye Off / Hide Balance Icon
 * Almond-shaped eye with pupil and diagonal slash
 */
export const EyeOffIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Eye outline pieces crossed by slash */}
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    {/* Diagonal slash */}
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);

/**
 * 4b. Eye Open Icon
 * Matching almond eye with pupil
 */
export const EyeOpenIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/**
 * 5. Copy Account Number Icon (Uses Material Symbols 'copy_all')
 */
export const CopyIcon: React.FC<ReceiptIconProps> = ({
  size = 16,
  className = '',
  color = 'currentColor',
  style,
  ...props
}) => (
  <span
    className={`material-symbols-outlined select-none inline-flex items-center justify-center leading-none ${className}`}
    style={{
      fontSize: typeof size === 'number' ? `${size}px` : size,
      color,
      display: 'inline-flex',
      ...style,
    }}
    aria-hidden="true"
    {...props}
  >
    copy_all
  </span>
);

/**
 * 6. Mini Statement / Receipt Icon
 * Exact CBE receipt icon with zigzag serrated edges on both top and bottom,
 * filled with signature purple and 3 crisp white horizontal lines inside.
 */
export const MiniStatementIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = '#70189F',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    {/* Purple Receipt Shape Body with exactly 4 Zigzags on Both Top & Bottom */}
    <path
      d="M4 22l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2v20z"
      fill={color || '#70189F'}
    />
    {/* 3 Horizontal White Lines */}
    <rect x="6.5" y="7" width="11" height="1.8" rx="0.9" fill="#FFFFFF" />
    <rect x="6.5" y="11.1" width="11" height="1.8" rx="0.9" fill="#FFFFFF" />
    <rect x="6.5" y="15.2" width="11" height="1.8" rx="0.9" fill="#FFFFFF" />
  </svg>
);

/**
 * 7. Cards Icon (CBE Card Icon with magnetic stripe and two dashes)
 * Exact match to CBE reference icon:
 * - Rounded rectangle card outline
 * - Solid magnetic stripe across the top
 * - Two rounded dashes in the bottom-left area
 */
export const CardsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
  color = '#70189F',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    {/* Outer rounded card outline */}
    <rect
      x="2.5"
      y="5"
      width="19"
      height="14"
      rx="2.8"
      stroke={color || '#70189F'}
      strokeWidth={strokeWidth}
    />

    {/* Solid magnetic stripe bar across the card */}
    <rect
      x="2.5"
      y="8.2"
      width="19"
      height="3.2"
      fill={color || '#70189F'}
    />

    {/* Dash 1 (Left short dash) */}
    <rect
      x="5.2"
      y="14.2"
      width="2.6"
      height="1.8"
      rx="0.9"
      fill={color || '#70189F'}
    />

    {/* Dash 2 (Right dash) */}
    <rect
      x="9.2"
      y="14.2"
      width="4.2"
      height="1.8"
      rx="0.9"
      fill={color || '#70189F'}
    />
  </svg>
);

/**
 * 8. Bill Share Icon
 * Uses Material Symbols Outlined 'arrow_split' rotated 90 degrees counter-clockwise (or -90deg) so the stem comes from the bottom and arrows point upwards / splits up.
 */
export const BillShareIcon: React.FC<ReceiptIconProps> = ({
  size = 24,
  className = '',
  color = '#70189F',
  style,
  ...props
}) => (
  <span
    className={`material-symbols-outlined select-none inline-flex items-center justify-center leading-none text-[#70189F] ${className}`}
    style={{
      fontSize: typeof size === 'number' ? `${size}px` : size,
      color: color === 'currentColor' ? undefined : (color || '#70189F'),
      transform: 'rotate(-90deg)',
      display: 'inline-flex',
      ...style,
    }}
    aria-hidden="true"
    {...props}
  >
    arrow_split
  </span>
);

/**
 * 9. Schedules / Clock Icon
 * Perfect circular clock outline with simple hour and minute hands
 */
export const SchedulesClockIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2.2,
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Clock circle */}
    <circle cx="12" cy="12" r="9.5" />
    {/* Hour and minute hands */}
    <polyline points="12 6.5 12 12 16.5 13.5" />
  </svg>
);

/**
 * 10. Right Arrow / Chevron Right Icon
 * Clean right-facing chevron >
 */
export const RightChevronIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2.5,
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

/**
 * 11. View Receipt Icon - Material Symbols Outlined 'receipt_long'
 */
export interface ReceiptIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export const ViewReceiptIcon: React.FC<ReceiptIconProps> = ({
  size = 20,
  className = '',
  color = 'currentColor',
  strokeWidth,
  style,
  ...props
}) => (
  <span 
    className={`material-symbols-outlined select-none inline-flex items-center justify-center leading-none ${className}`}
    style={{ fontSize: typeof size === 'number' ? `${size}px` : size, color, ...style }}
    aria-hidden="true"
    {...props}
  >
    receipt_long
  </span>
);

/**
 * 12. Other Transfers Icon
 * Two opposing transfer arrows with generous space between them,
 * where the tail of each arrow curves smoothly towards the other arrow.
 * - Top arrow: points right (->), tail curves downward on the left towards the bottom arrow.
 * - Bottom arrow: points left (<-), tail curves upward on the right towards the top arrow.
 */
export const OtherTransfersIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2.2,
  color = '#70189F',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#70189F'}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Top arrow: generous spacing, tail curves down on left, shaft goes right */}
    <path d="M5 10.5C5 7.5 7.5 5.5 11.5 5.5H19" />
    <polyline points="15.5 2.5 19 5.5 15.5 8.5" />

    {/* Bottom arrow: generous spacing, tail curves up on right, shaft goes left */}
    <path d="M19 13.5C19 16.5 16.5 18.5 12.5 18.5H5" />
    <polyline points="8.5 15.5 5 18.5 8.5 21.5" />
  </svg>
);

/**
 * 13. Bottom Navigation Home Icon
 * Exact match to CBE reference: Solid purple house with triangular roof and rectangular doorway cutout.
 */
export const BottomNavHomeIcon: React.FC<IconProps> = ({
  size = 22,
  className = '',
  color = '#70189F',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ color: color || '#70189F' }}
    {...props}
  >
    {/* Solid house silhouette with doorway cutout */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2.8L2 11.4H4.8V21.2H9.8V14.2H14.2V21.2H19.2V11.4H22L12 2.8Z"
    />
  </svg>
);

/**
 * 14. Bottom Navigation Transactions / Bank Icon
 * Exact match to CBE reference:
 * - Triangular pediment with small center circle
 * - Horizontal beam
 * - 4 vertical pillars/columns
 * - Stepped base platform
 */
export const BottomNavTransactionsIcon: React.FC<IconProps> = ({
  size = 22,
  className = '',
  strokeWidth = 1.8,
  color = '#70189F',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#70189F'}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Triangular roof pediment */}
    <path d="M3 9.2L12 3.2L21 9.2H3Z" />
    
    {/* Small center circle in pediment */}
    <circle cx="12" cy="6.8" r="1.1" fill={color || '#70189F'} stroke="none" />

    {/* 4 Vertical Columns */}
    <line x1="5.8" y1="10.2" x2="5.8" y2="17.2" strokeWidth={1.9} />
    <line x1="9.9" y1="10.2" x2="9.9" y2="17.2" strokeWidth={1.9} />
    <line x1="14.1" y1="10.2" x2="14.1" y2="17.2" strokeWidth={1.9} />
    <line x1="18.2" y1="10.2" x2="18.2" y2="17.2" strokeWidth={1.9} />

    {/* Platform step */}
    <rect x="3.2" y="17.2" width="17.6" height="2.4" rx="0.5" />

    {/* Bottom ground baseline */}
    <line x1="2" y1="21.2" x2="22" y2="21.2" strokeWidth={2} />
  </svg>
);

/**
 * 15. Bottom Navigation Settings Cog Icon
 * Exact match to CBE reference: Solid purple 6-toothed gear with center circular hole
 */
export const BottomNavSettingsIcon: React.FC<IconProps> = ({
  size = 22,
  className = '',
  color = '#70189F',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ color: color || '#70189F' }}
    {...props}
  >
    {/* Solid 6-tooth gear with center circular cutout */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.13 2.38H13.87L13.94 4.76L15.5 5.94L17.3 6.7L19.4 5.57L21.27 8.81L19.24 10.06L19 12L19.24 13.94L21.27 15.19L19.4 18.43L17.3 17.3L15.5 18.06L13.94 19.24L13.87 21.62H10.13L10.06 19.24L8.5 18.06L6.7 17.3L4.6 18.43L2.73 15.19L4.76 13.94L5 12L4.76 10.06L2.73 8.81L4.6 5.57L6.7 6.7L8.5 5.94L10.06 4.76L10.13 2.38ZM12 8.2C9.9 8.2 8.2 9.9 8.2 12C8.2 14.1 9.9 15.8 12 15.8C14.1 15.8 15.8 14.1 15.8 12C15.8 9.9 14.1 8.2 12 8.2Z"
    />
  </svg>
);



