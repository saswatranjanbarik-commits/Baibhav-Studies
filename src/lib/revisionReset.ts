/**
 * Revision Planner "fresh start".
 *
 * A fresh start does NOT delete anything. It:
 *  1. downloads a backup file of all current revisions,
 *  2. moves them into an archive (`dugu_revisions_archive`),
 *  3. empties the active list (`dugu_revisions`), and
 *  4. records the start date (`dugu_revision_settings`). From then on, new
 *     revisions are only created for study logged on/after that date.
 *
 * "Restore" puts archived revisions back and turns the fresh start off.
 *
 * Safety net: a device that was offline might later re-upload an old copy of
 * a revision. Every revision id starts with its creation time, so anything
 * created before the fresh start is ignored and tidied back into the archive.
 */
import { STORE_KEYS, readStore } from './storeKeys';
import { todayStr } from './dates';

export interface RevisionEntry {
  id: string;
  logId?: string;
  dateScheduled: string;
  type?: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string;
  subTopicName?: string;
  status: 'Pending' | 'Completed' | string;
}

export interface RevisionSettings {
  /** Is a fresh start in effect? (false after "Restore") */
  active: boolean;
  /** Only study logged on/after this date creates revisions. */
  freshStartFrom: string;
  /** When the fresh start was made (ms). Revisions created before are archived. */
  resetAt: number;
  resetBy?: string;
}

export interface ArchiveBatch {
  id: string;
  archivedAt: string;
  freshStartFrom: string;
  by?: string;
  items: RevisionEntry[];
}

/** Creation time from the id ("1728912345678ab1c2" → 1728912345678), or 0. */
export function revisionCreatedAt(r: { id: string }): number {
  const m = /^(\d{13})/.exec(String(r.id || ''));
  return m ? Number(m[1]) : 0;
}

export function loadRevisionSettings(): RevisionSettings | null {
  const s = readStore<Partial<RevisionSettings> | null>(STORE_KEYS.revisionSettings, null);
  return s && s.active && s.freshStartFrom && s.resetAt ? (s as RevisionSettings) : null;
}

/** Is this revision part of the current plan (i.e. not from before a fresh start)? */
export function isCurrentRevision(r: { id: string }, settings: RevisionSettings | null): boolean {
  return !settings || revisionCreatedAt(r) > settings.resetAt;
}

/** Should a study log dated `logDate` create revisions? */
export function shouldScheduleRevisions(logDate: string, settings = loadRevisionSettings()): boolean {
  return !settings || logDate >= settings.freshStartFrom;
}

export function loadArchive(): ArchiveBatch[] {
  return readStore<ArchiveBatch[]>(STORE_KEYS.revisionsArchive, []);
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Archive every current revision and start fresh from `fromDate`. Returns how many were archived. */
export function performFreshStart(fromDate: string, by?: string): number {
  const current = readStore<RevisionEntry[]>(STORE_KEYS.revisions, []);
  const now = Date.now();

  // 1. Safety copy on this computer.
  downloadJson(`revisions-backup-${todayStr()}.json`, { createdAt: new Date(now).toISOString(), revisions: current });

  // 2. Archive (append a batch; earlier batches are kept).
  if (current.length > 0) {
    const batch: ArchiveBatch = {
      id: `archive-${now}`,
      archivedAt: new Date(now).toISOString(),
      freshStartFrom: fromDate,
      by,
      items: current,
    };
    localStorage.setItem(STORE_KEYS.revisionsArchive, JSON.stringify([...loadArchive(), batch]));
  }

  // 3. Empty the active list, 4. remember the fresh start.
  localStorage.setItem(STORE_KEYS.revisions, JSON.stringify([]));
  const settings: RevisionSettings = { active: true, freshStartFrom: fromDate, resetAt: now, resetBy: by };
  localStorage.setItem(STORE_KEYS.revisionSettings, JSON.stringify(settings));
  return current.length;
}

/**
 * Tidy-up: if old (pre-fresh-start) revisions reappeared — e.g. re-uploaded
 * by a device that was offline — move them back into the archive.
 * Returns how many were moved (0 = nothing to do, nothing written).
 */
export function tidyStaleRevisions(): number {
  const settings = loadRevisionSettings();
  if (!settings) return 0;
  const all = readStore<RevisionEntry[]>(STORE_KEYS.revisions, []);
  const stale = all.filter((r) => !isCurrentRevision(r, settings));
  if (stale.length === 0) return 0;
  const archive = loadArchive();
  const archivedIds = new Set(archive.flatMap((b) => b.items.map((i) => i.id)));
  const toAdd = stale.filter((r) => !archivedIds.has(r.id));
  if (toAdd.length > 0) {
    archive.push({ id: `archive-tidy-${Date.now()}`, archivedAt: new Date().toISOString(), freshStartFrom: settings.freshStartFrom, items: toAdd });
    localStorage.setItem(STORE_KEYS.revisionsArchive, JSON.stringify(archive));
  }
  localStorage.setItem(STORE_KEYS.revisions, JSON.stringify(all.filter((r) => isCurrentRevision(r, settings))));
  return stale.length;
}

/** Undo: put all archived revisions back and turn the fresh start off. */
export function restoreArchivedRevisions(): number {
  const archive = loadArchive();
  const current = readStore<RevisionEntry[]>(STORE_KEYS.revisions, []);
  const ids = new Set(current.map((r) => r.id));
  const restored = archive.flatMap((b) => b.items).filter((r) => !ids.has(r.id) && (ids.add(r.id), true));
  localStorage.setItem(STORE_KEYS.revisions, JSON.stringify([...current, ...restored]));
  const prev = readStore<Partial<RevisionSettings>>(STORE_KEYS.revisionSettings, {});
  localStorage.setItem(STORE_KEYS.revisionSettings, JSON.stringify({ ...prev, active: false }));
  // The archive itself is kept (harmless) so nothing can be lost by a restore.
  return restored.length;
}

/** All revisions ever completed (current + archived) — so earned badges aren't taken away. */
export function allCompletedRevisions(current: RevisionEntry[]): RevisionEntry[] {
  const archived = loadArchive().flatMap((b) => b.items);
  const seen = new Set<string>();
  return [...current, ...archived].filter((r) => r.status === 'Completed' && !seen.has(r.id) && (seen.add(r.id), true));
}
