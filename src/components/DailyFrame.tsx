/**
 * DailyFrame — shows a Daily.co video room inside the page.
 *
 * Uses Daily's official browser library (daily-js), loaded on demand from a
 * CDN only when a class opens — so the app has no new npm package. The meeting
 * token is passed to join(), which is Daily's recommended secure method.
 * If the library can't load (e.g. a network filter), falls back to a plain
 * frame with the token in the address.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { RoomPass } from '../lib/videoRoom';
import { roomFrameSrc } from '../lib/videoRoom';

const DAILY_JS_URL = 'https://unpkg.com/@daily-co/daily-js@0';
let loader: Promise<any> | null = null;

function loadDailyJs(): Promise<any> {
  const w = window as any;
  if (w.DailyIframe) return Promise.resolve(w.DailyIframe);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = DAILY_JS_URL;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => (w.DailyIframe ? resolve(w.DailyIframe) : reject(new Error('daily-js missing')));
      s.onerror = () => { loader = null; reject(new Error('daily-js failed to load')); };
      document.head.appendChild(s);
    });
  }
  return loader;
}

interface Props {
  pass: RoomPass;
  title: string;
  /** Called when the person leaves the meeting from inside the video UI. */
  onLeft: () => void;
  /**
   * v1.5: gives the class room the video call once joined (null when it
   * closes), so it can offer its own Share screen / Chat buttons.
   */
  onFrame?: (frame: any | null) => void;
}

export default function DailyFrame({ pass, title, onLeft, onFrame }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const onLeftRef = useRef(onLeft);
  onLeftRef.current = onLeft;
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    let frame: any = null;
    let cancelled = false;
    loadDailyJs()
      .then((DailyIframe) => {
        if (cancelled || !containerRef.current) return;
        frame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: '100%', height: '100%', border: '0', background: '#000' },
          showLeaveButton: true,
          showFullscreenButton: true,
        });
        frame.on('left-meeting', () => onLeftRef.current());
        frame.join({ url: pass.url, token: pass.token }).then(() => {
          if (!cancelled) onFrameRef.current?.(frame);
        }).catch((e: any) => {
          console.warn('Daily join failed, using fallback frame', e);
          frame?.destroy();
          frame = null;
          if (!cancelled) setFallback(true);
        });
      })
      .catch((e) => {
        console.warn(e);
        if (!cancelled) setFallback(true);
      });
    return () => {
      cancelled = true;
      onFrameRef.current?.(null);
      try { frame?.destroy(); } catch { /* ignore */ }
    };
  }, [pass.url, pass.token]);

  if (fallback) {
    return (
      <iframe
        title={`Class: ${title}`}
        src={roomFrameSrc(pass)}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-write"
        className="w-full h-full border-0 bg-black"
      />
    );
  }
  return <div ref={containerRef} className="w-full h-full bg-black" />;
}
