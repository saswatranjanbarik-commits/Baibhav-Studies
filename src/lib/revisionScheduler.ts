/**
 * Creates the 7-, 15- and 30-day revisions for a study log.
 * Shared by the Daily Log page and by "Complete class" (v1.4), so both
 * produce exactly the same revision records as before.
 */
import { STORE_KEYS, readStore } from './storeKeys';
import { parseDateStr, toDateStr } from './dates';
import { shouldScheduleRevisions } from './revisionReset';

export interface LogForRevision {
  id: string;
  date: string;
  category?: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string | string[];
  subTopicName?: string | string[];
}

/** Returns the updated revisions list (or null if none were created). */
export function scheduleRevisionsForLog(log: LogForRevision): any[] | null {
  if (log.category !== 'Rock') return null;            // only Rock logs need revisions
  if (!shouldScheduleRevisions(log.date)) return null; // before the "fresh start" date

  const saved = readStore<any[]>(STORE_KEYS.revisions, []);
  const logDate = parseDateStr(log.date);
  const make = (days: number, type: '7 Day' | '15 Day' | '30 Day') => {
    const d = new Date(logDate);
    d.setDate(d.getDate() + days);
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      logId: log.id,
      dateScheduled: toDateStr(d),
      type,
      subjectName: log.subjectName || '',
      chapterName: log.chapterName || '',
      topicName: Array.isArray(log.topicName) ? log.topicName.join(', ') : log.topicName || '',
      subTopicName: Array.isArray(log.subTopicName) ? log.subTopicName.join(', ') : log.subTopicName,
      status: 'Pending',
    };
  };
  const updated = [...saved, make(7, '7 Day'), make(15, '15 Day'), make(30, '30 Day')];
  localStorage.setItem(STORE_KEYS.revisions, JSON.stringify(updated));
  return updated;
}
