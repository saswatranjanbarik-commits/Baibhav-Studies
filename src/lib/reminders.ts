/**
 * Study reminders — settings, notifications and calendar (.ics) export.
 *
 * Three ways a reminder can reach the user (all free, no server needed):
 *  1. CALENDAR FILE (.ics) — most reliable. Imports a repeating event with an
 *     alarm into Apple/Google/Outlook calendar, so the phone reminds the user
 *     even when the app is closed.
 *  2. BROWSER NOTIFICATION — pops up while the app is open in any tab
 *     (see ReminderScheduler).
 *  3. IN-APP BANNER — shown when the app is opened after a reminder was due.
 *
 * Settings are stored per user inside the existing synced store under the
 * NEW key `dugu_reminders` (an object keyed by user), so they follow the user
 * across devices. No existing data is changed.
 */
import { STORE_KEYS, readStore } from './storeKeys';
import { todayStr } from './dates';

export interface ReminderSettings {
  /** Daily reminder on/off. */
  enabled: boolean;
  /** Local time "HH:MM" (24h). */
  time: string;
  /** Days of week the daily reminder runs: 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Text shown in the reminder. */
  message: string;
  /** Minutes before each planned session (with a start time) to remind. 0 = off. */
  sessionLeadMinutes: number;
  updatedAt?: string;
}

export const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '18:00',
  days: [1, 2, 3, 4, 5, 6, 0],
  message: "Time to study! Open your study plan for today's topics.",
  sessionLeadMinutes: 0,
};

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Safe map key for a user (Firestore-friendly: no dots). */
export function reminderUserKey(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function loadReminderSettings(email: string): ReminderSettings {
  const all = readStore<Record<string, ReminderSettings>>(STORE_KEYS.reminders, {});
  return { ...DEFAULT_REMINDER, ...(all[reminderUserKey(email)] || {}) };
}

export function saveReminderSettings(email: string, settings: ReminderSettings) {
  const all = readStore<Record<string, ReminderSettings>>(STORE_KEYS.reminders, {});
  all[reminderUserKey(email)] = { ...settings, updatedAt: new Date().toISOString() };
  // Goes through StoreSync → saved to the cloud like everything else.
  window.localStorage.setItem(STORE_KEYS.reminders, JSON.stringify(all));
}

// ---------------------------------------------------------------------------
// Today's plan
// ---------------------------------------------------------------------------

export interface PlanEntryLike {
  id: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string;
  status?: string;
  startDate?: string;
  timeFrom?: string;
  timeTo?: string;
  planType?: string;
  activityDetail?: string; // v1.5: Play / Activity plan items (no subject)
}

/** Plan entries scheduled for today that are not completed, earliest first. */
export function getTodaysPendingPlan(entries: PlanEntryLike[], today = todayStr()): PlanEntryLike[] {
  return entries
    .filter((e) => e.startDate === today && e.status !== 'Completed')
    .sort((a, b) => (a.timeFrom || '99:99').localeCompare(b.timeFrom || '99:99'));
}

export function describeEntry(e: PlanEntryLike): string {
  const what = [e.subjectName, e.topicName].filter(Boolean).join(' – ') || e.activityDetail || '';
  return e.timeFrom ? `${e.timeFrom} ${what}` : what;
}

// ---------------------------------------------------------------------------
// Browser notifications
// ---------------------------------------------------------------------------

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationStatus;
}

/**
 * Register the tiny service worker (public/sw.js). It's needed for
 * notifications on Android/Chrome and does nothing else (no caching).
 */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    return existing || (await navigator.serviceWorker.register('/sw.js'));
  } catch (e) {
    console.warn('Service worker registration failed:', e);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (notificationStatus() === 'unsupported') return 'unsupported';
  await ensureServiceWorker();
  const result = await Notification.requestPermission();
  return result as NotificationStatus;
}

/** Show a notification. Returns false if it couldn't be shown. */
export async function showStudyNotification(title: string, body: string, tag: string, url = '/plan'): Promise<boolean> {
  if (notificationStatus() !== 'granted') return false;
  const options: NotificationOptions = { body, tag, data: { url } };
  try {
    const reg = await ensureServiceWorker();
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch (e) {
    console.warn('Notification failed:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Calendar (.ics) export
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** Escape text for an .ics field. */
function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold long lines at 75 characters as the calendar standard requires. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push((i ? ' ' : '') + line.slice(i, i + 74));
  return parts.join('\r\n');
}

function utcStamp(d = new Date()): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** "2026-10-15" + "18:30" → "20261015T183000" (floating local time). */
function localStamp(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function wrapCalendar(events: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dugu EduTrack//Study Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
}

/** A repeating "study time" event with an alarm, on the chosen days. */
export function buildDailyReminderIcs(settings: ReminderSettings, userEmail: string, appUrl: string): string {
  const days = settings.days.length ? settings.days : [0, 1, 2, 3, 4, 5, 6];
  const rrule = days.length === 7
    ? 'RRULE:FREQ=DAILY'
    : `RRULE:FREQ=WEEKLY;BYDAY=${[...days].sort().map((d) => ICS_DAYS[d]).join(',')}`;
  const start = todayStr();
  const event = [
    'BEGIN:VEVENT',
    `UID:daily-study-${reminderUserKey(userEmail)}@dugu-edutrack`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART:${localStamp(start, settings.time)}`,
    `DTEND:${localStamp(start, addMinutesToTime(settings.time, 30))}`,
    rrule,
    `SUMMARY:${icsText('📚 Study time')}`,
    `DESCRIPTION:${icsText(`${settings.message}\n${appUrl}/plan`)}`,
    `URL:${appUrl}/plan`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(settings.message)}`,
    'TRIGGER:-PT0M',
    'END:VALARM',
    'END:VEVENT',
  ];
  return wrapCalendar(event);
}

/** One event (with alarm) per upcoming, not-completed plan entry. */
export function buildPlanSessionsIcs(entries: PlanEntryLike[], leadMinutes: number, appUrl: string): { ics: string; count: number } {
  const today = todayStr();
  const upcoming = entries.filter((e) => e.startDate && e.startDate >= today && e.status !== 'Completed');
  const events: string[] = [];
  for (const e of upcoming) {
    const title = `${e.planType ? e.planType + ': ' : ''}${[e.subjectName, e.topicName].filter(Boolean).join(' – ') || e.activityDetail || ''}`;
    const lines = ['BEGIN:VEVENT', `UID:plan-${e.id}@dugu-edutrack`, `DTSTAMP:${utcStamp()}`];
    if (e.timeFrom) {
      lines.push(`DTSTART:${localStamp(e.startDate!, e.timeFrom)}`);
      lines.push(`DTEND:${localStamp(e.startDate!, e.timeTo && e.timeTo > e.timeFrom ? e.timeTo : addMinutesToTime(e.timeFrom, 45))}`);
    } else {
      // No start time → all-day event, reminder at 08:00 isn't possible without a time,
      // so the alarm fires at the start of the day.
      const d = e.startDate!.replace(/-/g, '');
      lines.push(`DTSTART;VALUE=DATE:${d}`);
    }
    lines.push(
      `SUMMARY:${icsText(title || 'Study session')}`,
      `DESCRIPTION:${icsText(`${e.chapterName ? 'Chapter: ' + e.chapterName + '\n' : ''}${appUrl}/plan`)}`,
      `URL:${appUrl}/plan`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(title || 'Study session')}`,
      `TRIGGER:-PT${Math.max(0, leadMinutes || 0)}M`,
      'END:VALARM',
      'END:VEVENT',
    );
    events.push(...lines);
  }
  return { ics: wrapCalendar(events), count: upcoming.length };
}

/** Trigger a download of an .ics file. On phones this opens "Add to Calendar". */
export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------------------------------------------------------------------------
// "Already reminded today" record — kept on this device only
// ---------------------------------------------------------------------------

/** No "dugu_" prefix, so StoreSync never uploads it. */
const FIRED_KEY = 'edutrack_reminders_fired';

/** Reminder keys already fired today on this device. Old days are dropped. */
export function loadFired(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}');
    return new Set(raw.date === todayStr() ? raw.keys : []);
  } catch {
    return new Set();
  }
}

export function saveFired(keys: Set<string>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ date: todayStr(), keys: Array.from(keys) }));
  } catch { /* ignore */ }
}

/**
 * After changing settings, don't immediately nag about a time that has
 * already passed today — start from tomorrow.
 */
export function skipTodayIfPast(time: string) {
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (time <= nowHHMM) {
    const fired = loadFired();
    fired.add('daily');
    saveFired(fired);
  }
}
