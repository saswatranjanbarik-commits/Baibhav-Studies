/**
 * Online classes (v1.4) — scheduling and status.
 *
 * Stored in the synced store under the NEW key `dugu_classes` (an array of
 * records with ids, so it merges safely between devices like everything else).
 *
 * TIME ZONES: a class's start is saved as an exact moment in UTC
 * (`startUtc`, ISO string). Every device shows it in its own local time, so a
 * tutor in India and a student in the UK each see the correct time for them.
 * The tutor's zone is saved too (`creatorTimeZone`) to show "tutor's time".
 */
import { STORE_KEYS, readStore } from './storeKeys';
import { getDeviceTimeZone } from './timezone';
import { toDateStr } from './dates';

export type ClassStatus = 'Scheduled' | 'Held' | 'Cancelled' | 'Missed';

export interface ClassTopic { subjectId: string; chapterId: string; topicId: string; name: string; chapterName?: string }

export interface OnlineClass {
  id: string;
  seriesId?: string;            // set for weekly repeats
  title: string;
  subjectId?: string;
  subjectName?: string;
  chapterId?: string;
  chapterName?: string;
  plannedTopics?: ClassTopic[];
  startUtc: string;             // ISO, UTC
  durationMin: number;
  creatorTimeZone: string;      // e.g. "Asia/Kolkata"
  tutorEmail?: string;
  tutorName?: string;
  /** 'in-app' = video inside EduTrack; 'link' = open an external meeting link. */
  meetingType: 'in-app' | 'link';
  meetingLink?: string;
  notes?: string;
  status: ClassStatus;
  createdBy?: string;
  createdAt: string;
  // Filled in when the class is completed
  outcome?: {
    completedAt: string;
    completedBy?: string;
    topicsCovered: ClassTopic[];
    homework?: string;
    notes?: string;
    logId?: string;
  };
  cancelReason?: string;
}

export const JOIN_EARLY_MIN = 10;   // Join opens this many minutes before the start
export const JOIN_LATE_MIN = 30;    // …and stays open this long after the planned end

export const startMs = (c: OnlineClass) => new Date(c.startUtc).getTime();
export const endMs = (c: OnlineClass) => startMs(c) + c.durationMin * 60_000;

export function loadClasses(): OnlineClass[] {
  return readStore<OnlineClass[]>(STORE_KEYS.classes, []);
}

function saveAll(list: OnlineClass[]) {
  localStorage.setItem(STORE_KEYS.classes, JSON.stringify(list));
}

/** Replace/insert records by id, leaving all others untouched. */
export function upsertClasses(changed: OnlineClass[]) {
  const byId = new Map(loadClasses().map((c) => [c.id, c]));
  changed.forEach((c) => byId.set(c.id, c));
  saveAll(Array.from(byId.values()));
}

export function removeClasses(ids: string[]) {
  const drop = new Set(ids);
  saveAll(loadClasses().filter((c) => !drop.has(c.id)));
}

const newId = (n = 0) => `${Date.now() + n}${Math.random().toString(36).slice(2, 7)}`;

/**
 * Create a class (or a weekly series). `localDateTime` is "YYYY-MM-DDTHH:MM"
 * in the creator's own time zone (from a datetime-local input).
 */
export function createClasses(input: Omit<OnlineClass, 'id' | 'startUtc' | 'status' | 'createdAt' | 'creatorTimeZone' | 'seriesId'> & {
  localDateTime: string;
  repeatWeeks: number; // 1 = single class
}): OnlineClass[] {
  const { localDateTime, repeatWeeks, ...rest } = input;
  const first = new Date(localDateTime); // interpreted in the device's local zone
  if (isNaN(first.getTime())) throw new Error('Please choose a valid date and time.');
  const count = Math.max(1, Math.min(52, repeatWeeks || 1));
  const seriesId = count > 1 ? `series-${newId()}` : undefined;
  const now = new Date().toISOString();
  const created: OnlineClass[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(first);
    d.setDate(d.getDate() + i * 7); // same local wall-clock time each week (handles summer time)
    created.push({
      ...rest,
      id: newId(i),
      seriesId,
      startUtc: d.toISOString(),
      creatorTimeZone: getDeviceTimeZone(),
      status: 'Scheduled',
      createdAt: now,
    });
  }
  upsertClasses(created);
  return created;
}

/** Status shown to users (a past "Scheduled" class that never got completed shows as "Not completed"). */
export function displayStatus(c: OnlineClass, now = Date.now()): 'Upcoming' | 'Live' | 'Held' | 'Cancelled' | 'Not completed' {
  if (c.status === 'Held') return 'Held';
  if (c.status === 'Cancelled') return 'Cancelled';
  if (now > endMs(c) + JOIN_LATE_MIN * 60_000) return 'Not completed';
  if (now >= startMs(c) - JOIN_EARLY_MIN * 60_000) return 'Live';
  return 'Upcoming';
}

/** Can people join right now? */
export function canJoin(c: OnlineClass, now = Date.now()): boolean {
  return c.status === 'Scheduled'
    && now >= startMs(c) - JOIN_EARLY_MIN * 60_000
    && now <= endMs(c) + JOIN_LATE_MIN * 60_000;
}

export function upcomingClasses(list: OnlineClass[], now = Date.now()): OnlineClass[] {
  return list
    .filter((c) => c.status === 'Scheduled' && endMs(c) + JOIN_LATE_MIN * 60_000 >= now)
    .sort((a, b) => startMs(a) - startMs(b));
}

export function pastClasses(list: OnlineClass[], now = Date.now()): OnlineClass[] {
  return list
    .filter((c) => c.status !== 'Scheduled' || endMs(c) + JOIN_LATE_MIN * 60_000 < now)
    .sort((a, b) => startMs(b) - startMs(a));
}

// ---- Formatting in the viewer's own zone ------------------------------------

export function formatClassTime(c: OnlineClass, tz?: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false };
  try {
    return new Date(c.startUtc).toLocaleString('en-GB', tz ? { ...opts, timeZone: tz } : opts);
  } catch {
    return new Date(c.startUtc).toLocaleString('en-GB', opts);
  }
}

/** "in 2 h 5 min", "in 3 days", "started 4 min ago". */
export function relativeStart(c: OnlineClass, now = Date.now()): string {
  const diff = Math.round((startMs(c) - now) / 60_000);
  const abs = Math.abs(diff);
  const text = abs < 60 ? `${abs} min`
    : abs < 24 * 60 ? `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ''}`
    : `${Math.round(abs / (24 * 60))} day${Math.round(abs / (24 * 60)) === 1 ? '' : 's'}`;
  return diff >= 0 ? `in ${text}` : `started ${text} ago`;
}

/** Local "YYYY-MM-DD" and "HH:MM" of the class start/end on THIS device (for the Daily Log). */
export function localDateAndTimes(c: OnlineClass): { date: string; timeFrom: string; timeTo: string } {
  const s = new Date(startMs(c));
  const e = new Date(endMs(c));
  const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date: toDateStr(s), timeFrom: hm(s), timeTo: hm(e) };
}
