/**
 * POST /api/video-room  — Vercel serverless function (free tier).
 *
 * Gives a signed-in, REGISTERED EduTrack user a pass into the private video
 * room for one class. The Daily.co API key stays here on the server and is
 * never sent to browsers.
 *
 * Steps:
 *  1. Check the Firebase login token sent by the app (Authorization: Bearer …).
 *  2. Check the user is registered (has a profile in Firestore `users`), using
 *     their own token — so the normal Firestore security rules decide.
 *  3. Create (or extend) a PRIVATE Daily room for the class.
 *  4. Return a short-lived meeting token. Tutors/Admins are room owners.
 *
 * Setup (once): Vercel → Project → Settings → Environment Variables →
 *   DAILY_API_KEY = <your Daily.co API key>   (Production + Preview)
 * No other packages or paid plans are needed.
 */

const DAILY_API = 'https://api.daily.co/v1';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyD4hjE7UhFfzpBh63XzPwRY9gOhCQfUn8w';
const FIREBASE_PROJECT = process.env.VITE_FIREBASE_PROJECT_ID || 'dugu-edutrack';
// Keep in sync with src/config/app.ts and firestore.rules
const PRIMARY_ADMIN_EMAIL = 'saswatranjanbarik@gmail.com';

type Json = Record<string, any>;

function send(res: any, status: number, body: Json) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

async function readBody(req: any): Promise<Json> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

async function daily(path: string, key: string, init: RequestInit = {}) {
  const r = await fetch(`${DAILY_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method-not-allowed' });

  const dailyKey = process.env.DAILY_API_KEY;
  if (!dailyKey) {
    return send(res, 503, {
      error: 'not-configured',
      message: 'In-app video is not set up yet. Add DAILY_API_KEY in Vercel → Settings → Environment Variables, then redeploy.',
    });
  }

  try {
    // ---- 1. Who is asking? ---------------------------------------------------
    const authHeader: string = req.headers?.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return send(res, 401, { error: 'not-signed-in' });

    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!lookup.ok) return send(res, 401, { error: 'invalid-login' });
    const email: string = ((await lookup.json()).users?.[0]?.email || '').toLowerCase();
    if (!email) return send(res, 401, { error: 'invalid-login' });

    // ---- 2. Registered? Role? (read with the user's own token → rules apply) --
    let role = '';
    let name = email;
    const profile = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/users/${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (profile.ok) {
      const fields = (await profile.json()).fields || {};
      role = fields.role?.stringValue || 'Student';
      name = fields.username?.stringValue || email;
    } else if (email === PRIMARY_ADMIN_EMAIL) {
      role = 'Admin';
    } else {
      return send(res, 403, { error: 'not-registered', message: 'This account is not registered in EduTrack.' });
    }
    if (email === PRIMARY_ADMIN_EMAIL) role = 'Admin';
    const isHost = role === 'Admin' || role === 'Teacher';

    // ---- 3. Which class? ----------------------------------------------------
    const body = await readBody(req);
    const classId = String(body.classId || '');
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(classId)) return send(res, 400, { error: 'bad-class-id' });
    const start = Date.parse(String(body.startUtc || ''));
    const durationMin = Math.min(Math.max(Number(body.durationMin) || 60, 10), 240);
    if (!Number.isFinite(start)) return send(res, 400, { error: 'bad-start-time' });

    const nowSec = Math.floor(Date.now() / 1000);
    // Room/pass valid until 30 min after the planned end; at least 15 min, at most 6 h from now.
    const plannedEndSec = Math.floor(start / 1000) + durationMin * 60 + 30 * 60;
    const exp = Math.min(Math.max(plannedEndSec, nowSec + 15 * 60), nowSec + 6 * 3600);

    const roomName = `edutrack-${classId}`.slice(0, 64);

    // Create the private room, or extend its expiry if it already exists.
    const roomProps = {
      exp,
      eject_at_room_exp: true,
      enable_prejoin_ui: true,
      enable_chat: true,
      enable_screenshare: true,
      max_participants: 6,
    };
    let room = await daily(`/rooms/${roomName}`, dailyKey);
    if (room.status === 404) {
      room = await daily('/rooms', dailyKey, {
        method: 'POST',
        body: JSON.stringify({ name: roomName, privacy: 'private', properties: roomProps }),
      });
    } else if (room.ok) {
      const currentExp = room.data?.config?.exp || 0;
      if (currentExp < exp) {
        room = await daily(`/rooms/${roomName}`, dailyKey, { method: 'POST', body: JSON.stringify({ properties: { exp } }) });
      }
    }
    if (!room.ok || !room.data?.url) {
      console.error('Daily room error', room.status, room.data);
      return send(res, 502, { error: 'room-failed', message: 'Could not create the video room. Please try again.' });
    }

    // ---- 4. Personal, short-lived pass --------------------------------------
    const token = await daily('/meeting-tokens', dailyKey, {
      method: 'POST',
      body: JSON.stringify({
        properties: { room_name: roomName, user_name: name, is_owner: isHost, exp },
      }),
    });
    if (!token.ok || !token.data?.token) {
      console.error('Daily token error', token.status, token.data);
      return send(res, 502, { error: 'token-failed', message: 'Could not create a pass for the video room.' });
    }

    return send(res, 200, { url: room.data.url, token: token.data.token, isHost, expiresAt: exp * 1000 });
  } catch (e: any) {
    console.error('video-room failed', e);
    return send(res, 500, { error: 'server-error', message: 'Something went wrong. Please try again.' });
  }
}
