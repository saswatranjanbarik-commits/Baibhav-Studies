/**
 * InstallAppButton — shown at the bottom of the sidebar until the app is
 * installed. One tap when the browser offers it; otherwise step-by-step
 * browser-menu instructions (iPhone/iPad, and Android when Chrome hasn't offered yet).
 */
import React, { useState } from 'react';
import { Download, Share, X, Menu } from 'lucide-react';
import { useInstallApp, isSamsungInternet } from '../lib/installApp';

export default function InstallAppButton() {
  const { mode, install } = useInstallApp();
  const [showTip, setShowTip] = useState(false);

  if (mode === 'installed' || mode === 'unavailable') return null;

  return (
    <div className="p-3 border-t border-slate-200">
      {mode === 'prompt' ? (
        <button
          onClick={install}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#1F4E79] hover:bg-[#173d5f] rounded-lg py-2"
        >
          <Download className="h-4 w-4" /> Install app
        </button>
      ) : (
        <>
          <button
            onClick={() => setShowTip(!showTip)}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#1F4E79] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg py-2"
          >
            <Download className="h-4 w-4" /> Add to Home Screen
          </button>
          {showTip && (
            <div className="relative mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 leading-relaxed">
              <button onClick={() => setShowTip(false)} className="absolute top-1.5 right-1.5 text-slate-400" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
              {mode === 'ios' ? (
                <>
                  In <strong>Safari</strong>: tap <Share className="inline h-3.5 w-3.5 -mt-0.5" /> <strong>Share</strong>, then
                  <strong> "Add to Home Screen"</strong>, then <strong>Add</strong>.
                </>
              ) : isSamsungInternet() ? (
                <>
                  In <strong>Samsung Internet</strong>: tap <Menu className="inline h-3.5 w-3.5 -mt-0.5" /> <strong>menu</strong> (bottom right),
                  then <strong>"Add page to" → "Home screen"</strong>, then <strong>Add</strong>.
                </>
              ) : (
                <>
                  In <strong>Chrome</strong>: tap <strong>⋮ menu</strong> (top right),
                  then <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>, then <strong>Install</strong>.
                </>
              )}{' '}
              Open EduTrack from the new icon.
            </div>
          )}
        </>
      )}
    </div>
  );
}
