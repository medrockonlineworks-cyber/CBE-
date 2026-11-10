import React from 'react';

export interface PhoneNavigationBarProps {
  onBack?: () => void;
  onHome?: () => void;
  onRecents?: () => void;
  theme?: 'cbe' | 'dark' | 'light';
  className?: string;
  forceStyle?: any;
}

/**
 * Disabled: Real device navigation is used instead of a simulated navigation bar.
 */
export const PhoneNavigationBar: React.FC<PhoneNavigationBarProps> = () => {
  return null;
};

export default PhoneNavigationBar;

