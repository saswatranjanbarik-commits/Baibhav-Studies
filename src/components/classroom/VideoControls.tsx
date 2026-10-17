/**
 * VideoControls (v1.5) — "Share screen" and "Chat" buttons for EVERYONE in
 * the class (tutor and student), in the class room header.
 *
 * Daily's own buttons are still there inside the video, but when the video
 * window is made small they get tucked away in its "…" menu; these are
 * always visible.
 *
 * Screen sharing asks for sound too: in Chrome/Edge pick a browser TAB and
 * tick "Also share tab audio" to share a video's sound.
 *
 * Screen sharing needs a desktop browser (Chrome, Edge, Firefox, Safari on a
 * laptop/computer). Android and iPhone/iPad browsers can't share the screen —
 * the button then explains that instead.
 */
import React, { useEffect, useState } from 'react';
import { ScreenShare, ScreenShareOff, MessageCircle } from 'lucide-react';

interface Props {
  /** The joined Daily call (from DailyFrame), or null before joining. */
  frame: any | null;
  /** Make sure the video window is visible (Daily's chat opens inside it). */
  onShowVideo: () => void;
}

/** True when this browser can share its screen. */
export function canShareScreen(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof (navigator.mediaDevices as any).getDisplayMedia === 'function';
}

export default function VideoControls({ frame, onShowVideo }: Props) {
  const [sharing, setSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const supported = canShareScreen();
  const chatSupported = !!frame && typeof frame.setSidebarView === 'function';

  // Follow Daily's own state (sharing can also be started/stopped inside the video).
  useEffect(() => {
    if (!frame) { setSharing(false); setChatOpen(false); return; }
    const on = () => setSharing(true);
    const off = () => setSharing(false);
    const sidebar = (e: any) => setChatOpen(e?.view === 'chat');
    frame.on('local-screen-share-started', on);
    frame.on('local-screen-share-stopped', off);
    frame.on('local-screen-share-canceled', off);
    frame.on('sidebar-view-changed', sidebar);
    return () => {
      try {
        frame.off('local-screen-share-started', on);
        frame.off('local-screen-share-stopped', off);
        frame.off('local-screen-share-canceled', off);
        frame.off('sidebar-view-changed', sidebar);
      } catch { /* call already closed */ }
    };
  }, [frame]);

  // Hide the hint after a few seconds.
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 6000);
    return () => clearTimeout(t);
  }, [note]);

  if (!frame) return null;

  const toggleShare = () => {
    if (!supported) {
      setNote('Screen sharing works from a laptop or computer browser. Android and iPad browsers can’t share the screen — use the whiteboard or show your notebook to the camera.');
      return;
    }
    try {
      if (sharing) frame.stopScreenShare();
      // Ask for sound too: in Chrome/Edge choose a TAB and tick "Also share tab audio"
      // so a video playing in that tab is heard by everyone.
      else frame.startScreenShare({
        displayMediaOptions: {
          video: true,
          audio: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'include',
          systemAudio: 'include',
        },
      });
    } catch (e) {
      console.warn(e);
      setNote('Could not start screen sharing.');
    }
  };

  const toggleChat = () => {
    onShowVideo();
    try {
      const next = chatOpen ? null : 'chat';
      frame.setSidebarView(next);
      setChatOpen(!chatOpen);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="relative flex items-center gap-1">
      <button
        onClick={toggleShare}
        title={!supported ? 'Screen sharing needs a laptop/computer browser' : sharing ? 'Stop sharing your screen' : 'Share your screen'}
        aria-pressed={sharing}
        className={`inline-flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-1.5 border
          ${sharing ? 'bg-red-500 text-white border-red-500' : 'text-indigo-100 border-white/30 hover:bg-white/10'} ${!supported ? 'opacity-60' : ''}`}
      >
        {sharing ? <ScreenShareOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />}
        <span className="hidden xl:inline">{sharing ? 'Stop sharing' : 'Share screen'}</span>
      </button>
      {chatSupported && (
        <button
          onClick={toggleChat}
          title={chatOpen ? 'Close the video chat' : 'Open the video chat'}
          aria-pressed={chatOpen}
          className={`inline-flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-1.5 border
            ${chatOpen ? 'bg-white text-[#1F4E79] border-white' : 'text-indigo-100 border-white/30 hover:bg-white/10'}`}
        >
          <MessageCircle className="h-4 w-4" /> <span className="hidden xl:inline">Chat</span>
        </button>
      )}
      {note && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 text-xs bg-slate-800 text-white rounded-lg shadow-lg p-2">
          {note}
        </div>
      )}
    </div>
  );
}
