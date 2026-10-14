/**
 * "Install app" support.
 *
 * - Android / Chrome / Edge: the browser offers an install prompt
 *   (`beforeinstallprompt`). We keep it and show our own "Install app" button.
 * - iPhone / iPad (Safari): there is no prompt; the user taps
 *   Share → "Add to Home Screen". We show those instructions instead.
 */
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const CHANGED = 'edutrack-install-changed';

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(CHANGED));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event(CHANGED));
  });
}

/** Already running as an installed app? */
export function isInstalled(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
}

export type InstallMode = 'prompt' | 'ios' | 'installed' | 'unavailable';

export function useInstallApp(): { mode: InstallMode; install: () => Promise<void> } {
  const compute = (): InstallMode =>
    isInstalled() ? 'installed' : deferredPrompt ? 'prompt' : isIOS() ? 'ios' : 'unavailable';
  const [mode, setMode] = useState<InstallMode>(compute);

  useEffect(() => {
    const update = () => setMode(compute());
    window.addEventListener(CHANGED, update);
    return () => window.removeEventListener(CHANGED, update);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    setMode(compute());
  };

  return { mode, install };
}
