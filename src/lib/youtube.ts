/**
 * YouTube helpers (v1.5) — used to keep a presented YouTube video in step
 * between tutor and student (play, pause, position).
 *
 * Each device plays the video itself, so the student hears the sound on
 * their own device. Uses YouTube's official IFrame Player API, loaded on
 * demand from youtube.com (free, no key, no npm package).
 */

/** The video id from a YouTube link, or null. */
export function youTubeId(link: string | undefined): string | null {
  if (!link) return null;
  let url: URL;
  try { url = new URL(link.trim()); } catch { return null; }
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  let id: string | null = null;
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v');
    if (!id) {
      const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
      id = m ? m[1] : null;
    }
  } else if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0] || null;
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

/**
 * Where a follower's video should be now: the tutor's position plus the
 * time since it was reported (when playing).
 */
export function targetTime(media: { playing: boolean; time: number; at: string }, nowMs = Date.now()): number {
  if (!media.playing) return Math.max(0, media.time);
  const elapsed = Math.max(0, (nowMs - Date.parse(media.at)) / 1000);
  // ignore absurd clock differences between devices
  return Math.max(0, media.time + (elapsed < 600 ? elapsed : 0));
}

let apiPromise: Promise<any> | null = null;

/** Load the YouTube IFrame Player API once. */
export function loadYouTubeApi(): Promise<any> {
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        resolve(w.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { apiPromise = null; reject(new Error('YouTube player failed to load')); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}
