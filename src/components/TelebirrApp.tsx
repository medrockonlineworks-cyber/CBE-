import React from 'react';
import { UserProfile } from '../types';
import TelebirrSuperApp from './telebirr/TelebirrSuperApp';

export interface TelebirrAppProps {
  currentUser?: UserProfile | null;
  onBack: () => void;
  onOpenDashen?: () => void;
  onOpenCbe?: () => void;
  onOpenSms?: () => void;
  onOpenTelegram?: () => void;
}

export default function TelebirrApp(props: TelebirrAppProps) {
  return (
    <TelebirrSuperApp 
      onBack={props.onBack} 
      onOpenCbe={props.onOpenCbe} 
      onOpenDashen={props.onOpenDashen} 
    />
  );
}
