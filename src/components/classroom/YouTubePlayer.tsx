/**
 * YouTubePlayer (v1.5) — a YouTube video that can LEAD or FOLLOW.
 *
 *  lead   (tutor while presenting): reports play / pause / position.
 *  follow (student): plays, pauses and jumps to match the tutor. The sound
 *         plays on the student's own device.
 *
 * If the YouTube player can't load, falls back to the normal embedded video.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { MediaState } from '../../lib/classChat';
import { loadYouTubeApi, targetTime } from '../../lib/youtube';

interface Props {
  videoId: string;
  title: string;
  /** lead: called with the player state (only needed while presenting). */
  onMedia?: (media: MediaState) => void;
  /** follow: the tutor's player state to match. */
  follow?: MediaState | null;
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;
/** While playing, the leader re-reports its position this often (keeps followers in step). */
const LEAD_REFRESH_MS = 10_000;
/** A follower jumps only when it is further out than this (seconds). */
const MAX_DRIFT_S = 1.5;

export default function YouTubePlayer({ videoId, title, onMedia, follow }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const onMediaRef = useRef(onMedia);
  onMediaRef.current = onMedia;
  const followRef = useRef(follow);
  followRef.current = follow;

  // ---- Create the player --------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !holder.current) return;
        const target = document.createElement('div');
        holder.current.innerHTML = '';
        holder.current.appendChild(target);
        player.current = new YT.Player(target, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
          events: {
            onReady: () => { if (!cancelled) setReady(true); },
            onStateChange: (e: any) => {
              const p = player.current;
              if (!p) return;
              if (onMediaRef.current && (e.data === PLAYING || e.data === PAUSED || e.data === ENDED)) {
                onMediaRef.current({ playing: e.data === PLAYING, time: p.getCurrentTime?.() || 0, at: new Date().toISOString() });
              }
              if (e.data === PLAYING) setNeedsTap(false);
            },
          },
        });
      })
      .catch((e) => { console.warn(e); if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      try { player.current?.destroy(); } catch { /* ignore */ }
      player.current = null;
    };
  }, [videoId]);

  // ---- Lead: re-report position regularly while playing --------------------------
  useEffect(() => {
    if (!ready || !onMedia) return;
    const t = setInterval(() => {
      const p = player.current;
      if (p?.getPlayerState?.() === PLAYING) {
        onMediaRef.current?.({ playing: true, time: p.getCurrentTime() || 0, at: new Date().toISOString() });
      }
    }, LEAD_REFRESH_MS);
    return () => clearInterval(t);
  }, [ready, !!onMedia]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Follow: match the tutor -------------------------------------------------
  useEffect(() => {
    const p = player.current;
    const f = followRef.current;
    if (!ready || !p || !f) return;
    const want = targetTime(f);
    const now = p.getCurrentTime?.() || 0;
    if (Math.abs(now - want) > MAX_DRIFT_S) p.seekTo(want, true);
    if (f.playing) {
      p.playVideo();
      // Some browsers block starting sound without a tap on this device.
      setTimeout(() => { if (player.current?.getPlayerState?.() !== PLAYING && followRef.current?.playing) setNeedsTap(true); }, 2500);
    } else {
      p.pauseVideo();
      setNeedsTap(false);
    }
  }, [ready, follow?.at, follow?.playing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) {
    return (
      <iframe
        title={title}
        src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`}
        className="w-full h-full border-0 bg-black"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={holder} className="absolute inset-0" />
      {needsTap && (
        <button
          onClick={() => {
            const p = player.current;
            const f = followRef.current;
            if (p && f) { p.seekTo(targetTime(f), true); p.playVideo(); }
            setNeedsTap(false);
          }}
          className="absolute inset-x-0 bottom-4 mx-auto w-fit bg-indigo-600 text-white text-sm font-semibold rounded-full px-4 py-2 shadow-lg"
        >
          ▶ Tap to play with your tutor
        </button>
      )}
    </div>
  );
}
