/**
 * Doubts (v1.5) — questions the student writes down for a subject, so the
 * tutor sees them (Dashboard alert + Daily Plan & Log page) and answers them.
 *
 * Stored in the synced study data under the NEW key `dugu_doubts` (an array
 * of records with an id — saved and merged like every other list).
 */
import { STORE_KEYS, readStore } from './storeKeys';
import { todayStr } from './dates';

export interface Doubt {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  text: string;
  date: string;              // study day it belongs to (YYYY-MM-DD)
  askedBy: string;           // name
  askedByEmail: string;
  askedAt: string;           // ISO
  status: 'Open' | 'Resolved';
  answer?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  logId?: string;            // Daily Log entry it came from (if any)
}

export function loadDoubts(): Doubt[] {
  const list = readStore<Doubt[]>(STORE_KEYS.doubts, []);
  return Array.isArray(list) ? list : [];
}

function save(list: Doubt[]) {
  // Goes through StoreSync → saved to the cloud like everything else.
  localStorage.setItem(STORE_KEYS.doubts, JSON.stringify(list));
}

export function newDoubt(fields: Omit<Doubt, 'id' | 'askedAt' | 'status' | 'date'> & { date?: string }): Doubt {
  const d: Doubt = {
    ...fields,
    id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    date: fields.date || todayStr(),
    askedAt: new Date().toISOString(),
    status: 'Open',
  };
  (Object.keys(d) as (keyof Doubt)[]).forEach((k) => (d[k] === undefined || d[k] === '') && k !== 'text' && delete d[k]);
  return d;
}

export function addDoubt(d: Doubt) {
  save([d, ...loadDoubts()]);
}

export function updateDoubt(id: string, change: Partial<Doubt>) {
  save(loadDoubts().map((d) => (d.id === id ? { ...d, ...change } : d)));
}

export function deleteDoubt(id: string) {
  save(loadDoubts().filter((d) => d.id !== id));
}

/** Open doubts, oldest first (so the longest-waiting is answered first). */
export function openDoubts(list: Doubt[]): Doubt[] {
  return list.filter((d) => d.status === 'Open').sort((a, b) => a.askedAt.localeCompare(b.askedAt));
}

/** Where the doubt is, e.g. "Science · Chapter 2 · Digestion". */
export function doubtPlace(d: Doubt): string {
  return [d.subjectName, d.chapterName, d.topicName].filter(Boolean).join(' · ');
}
