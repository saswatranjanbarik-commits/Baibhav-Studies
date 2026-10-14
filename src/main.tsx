import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupInstallPrompt } from './lib/installApp';

// Installable app & offline support (v1.3): register the service worker in the
// live build only (it would interfere with hot-reload while developing).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker not registered:', e));
  });
}
// Catch the browser's "install this app" offer early (it can fire before React renders).
setupInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
