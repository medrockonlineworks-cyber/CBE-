import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPwaDynamicManifest } from './utils/pwaBranding.ts';

// Ensure the installed application always has the latest admin-uploaded logo
initPwaDynamicManifest();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
