/**
 * Asks our server function (/api/video-room) for a pass into a class's
 * private video room. See api/video-room.ts.
 */
import { auth } from './firebase';
import type { OnlineClass } from './classes';

export interface RoomPass { url: string; token: string; isHost: boolean; expiresAt: number }

export async function getRoomPass(c: OnlineClass): Promise<{ pass?: RoomPass; error?: string; notConfigured?: boolean }> {
  if (!navigator.onLine) return { error: "You're offline. Connect to the internet to join the class." };
  const user = auth.currentUser;
  if (!user) return { error: 'Please sign in again.' };
  try {
    const idToken = await user.getIdToken();
    const r = await fetch('/api/video-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ classId: c.id, startUtc: c.startUtc, durationMin: c.durationMin }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.url && data.token) return { pass: data as RoomPass };
    return { error: data.message || `Could not open the class room (${r.status}).`, notConfigured: data.error === 'not-configured' };
  } catch {
    return { error: 'Could not reach the server. Check the internet connection and try again.' };
  }
}

/** The address loaded in the in-app video frame. */
export const roomFrameSrc = (p: RoomPass) => `${p.url}?t=${encodeURIComponent(p.token)}`;
