/**
 * Presence — who is logged in and using the app right now.
 *
 * Each logged-in user has ONE small document: presence/{lower-case email}
 *   { email, username, role, timeZone, state: 'online' | 'offline', lastSeen }
 *
 * - While the app is open, it "checks in" every minute (a heartbeat).
 * - On Exit/logout it marks the user offline straight away.
 * - If the tab is closed or the device sleeps, check-ins stop and the user
 *   drops off the list automatically after ONLINE_WINDOW_MS.
 *
 * This is a NEW collection. It does not touch any existing data.
 * Cost: one tiny write per user per minute — far inside the free tier.
 */
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { AppUser } from './AuthContext';
import { getDeviceTimeZone } from './timezone';

const PRESENCE_COLLECTION = 'presence';
const HEARTBEAT_MS = 60_000;
/** Someone counts as online if they checked in within this window. */
export const ONLINE_WINDOW_MS = 3 * 60_000;

export interface PresenceRecord {
  email: string;
  username: string;
  role: string;
  timeZone: string;
  state: 'online' | 'offline';
  lastSeen: Date | null;
}

function presenceRef(email: string) {
  return doc(db, PRESENCE_COLLECTION, email.toLowerCase());
}

async function writePresence(user: AppUser, state: 'online' | 'offline') {
  await setDoc(
    presenceRef(user.email),
    {
      email: user.email.toLowerCase(),
      username: user.username || user.email,
      role: user.role,
      timeZone: getDeviceTimeZone(),
      state,
      lastSeen: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Mark the user offline. Call BEFORE signing out (afterwards writes are refused). */
export async function markOffline(user: AppUser | null) {
  if (!user) return;
  try {
    await writePresence(user, 'offline');
  } catch (e) {
    console.warn('Could not mark offline:', e);
  }
}

/**
 * Keep the current user marked online while the app is open.
 * Mount once, inside the logged-in layout.
 */
export function usePresenceHeartbeat(user: AppUser | null) {
  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const beat = () => {
      if (stopped) return;
      writePresence(user, 'online').catch((e) => {
        // Never disturb the user over presence — just log it.
        console.warn('Presence heartbeat failed:', e?.code || e);
      });
    };

    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    // Check in immediately when the user comes back to the tab.
    const onVisible = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** True if this record counts as "online now". */
export function isOnline(p: PresenceRecord, now: number = Date.now()): boolean {
  return p.state === 'online' && !!p.lastSeen && now - p.lastSeen.getTime() < ONLINE_WINDOW_MS;
}

/**
 * Live list of everyone's presence.
 * `error` is set if the database refuses (e.g. rules not yet updated).
 */
export function useTeamPresence(): { records: PresenceRecord[]; error: string | null; now: number } {
  const [records, setRecords] = useState<PresenceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, PRESENCE_COLLECTION),
      (snap) => {
        setError(null);
        setRecords(
          snap.docs.map((d) => {
            const data = d.data();
            const ts = data.lastSeen as Timestamp | null | undefined;
            return {
              email: data.email || d.id,
              username: data.username || d.id,
              role: data.role || '',
              timeZone: data.timeZone || 'UTC',
              state: data.state === 'online' ? 'online' : 'offline',
              // serverTimestamp is null for a moment while it is being written locally
              lastSeen: ts ? ts.toDate() : new Date(),
            } as PresenceRecord;
          }),
        );
      },
      (e) => {
        console.warn('Presence listener failed:', e);
        setError(e?.code === 'permission-denied'
          ? 'Online status needs the updated Firestore rules (see UPGRADE_NOTES.md).'
          : 'Online status is unavailable right now.');
      },
    );
    // Re-check the "3-minute" window every 30 s so people drop off on time.
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => { unsub(); clearInterval(tick); };
  }, []);

  return { records, error, now };
}

/** "just now", "5 min ago", "2 h ago", "3 days ago". */
export function timeAgo(date: Date | null, now: number = Date.now()): string {
  if (!date) return 'never';
  const mins = Math.round((now - date.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
