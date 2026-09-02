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
 * 7. Cards Icon
 * Uses Material Symbols Outlined 'credit_card'
 */
export const CardsIcon: React.FC<ReceiptIconProps> = ({
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
      display: 'inline-flex',
      ...style,
    }}
    aria-hidden="true"
    {...props}
  >
    credit_card
  </span>
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


