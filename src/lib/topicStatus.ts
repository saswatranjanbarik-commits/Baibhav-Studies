/**
 * Topic status — one place that decides whether a syllabus topic is
 * Completed / In Progress / Pending.
 *
 * Sources, in order of priority:
 *  1. A tutor/admin MARK (new in v1.3, `dugu_topic_status`) — e.g. "covered in
 *     class before the mid-term". One record per topic: id = "ts-<topicId>".
 *  2. Daily Log entries for the topic (any "Completed" log → Completed,
 *     otherwise any log → In Progress). Logs that cover several topics at once
 *     are counted for each of them.
 *  3. Study Plan entries for the topic (Completed / In Progress).
 *
 * Marks are stored separately on purpose: they don't create fake Daily Log
 * entries, so streaks, study time, the weekly report and revisions stay
 * truthful. Removing a mark simply returns the topic to its log-based status.
 */
import { STORE_KEYS, readStore } from './storeKeys';
import { todayStr } from './dates';

export type TopicStatus = 'Completed' | 'In Progress' | 'Pending';

export interface TopicMark {
  id: string;            // "ts-<topicId>"
  topicId: string;
  chapterId: string;
  subjectId: string;
  topicName?: string;
  status: 'Completed';
  completedOn: string;   // YYYY-MM-DD
  markedBy?: string;     // name of tutor/admin
  markedAt: string;      // ISO timestamp
  note?: string;         // e.g. "Covered before mid-term"
}

interface LogLike { topicId?: string | string[]; status?: string }
interface PlanLike { topicId?: string; status?: string }

export const markId = (topicId: string) => `ts-${topicId}`;

const includesTopic = (value: string | string[] | undefined, topicId: string) =>
  Array.isArray(value) ? value.map(String).includes(String(topicId)) : String(value ?? '') === String(topicId);

/** Pre-index logs/plan/marks once, then ask for any topic quickly. */
export function makeTopicStatusLookup(logs: LogLike[], plan: PlanLike[], marks: TopicMark[]) {
  const markByTopic = new Map(marks.map((m) => [String(m.topicId), m]));
  return {
    mark(topicId: string): TopicMark | undefined {
      return markByTopic.get(String(topicId));
    },
    status(topicId: string): TopicStatus {
      if (markByTopic.get(String(topicId))?.status === 'Completed') return 'Completed';
      const topicLogs = logs.filter((l) => includesTopic(l.topicId, topicId));
      if (topicLogs.some((l) => l.status === 'Completed')) return 'Completed';
      const topicPlan = plan.filter((p) => includesTopic(p.topicId, topicId));
      if (topicPlan.some((p) => p.status === 'Completed')) return 'Completed';
      if (topicLogs.length > 0 || topicPlan.some((p) => p.status === 'In Progress')) return 'In Progress';
      return 'Pending';
    },
  };
}

export function loadTopicMarks(): TopicMark[] {
  return readStore<TopicMark[]>(STORE_KEYS.topicStatus, []);
}

export interface TopicRef { subjectId: string; chapterId: string; topicId: string; topicName?: string }

/**
 * Mark topics completed (adds or updates their marks) and/or clear marks.
 * Returns { marked, cleared }.
 */
export function saveTopicMarks(
  toMark: TopicRef[],
  toClear: string[],
  opts: { by?: string; completedOn?: string; note?: string } = {},
): { marked: number; cleared: number } {
  const byId = new Map(loadTopicMarks().map((m) => [m.id, m]));
  const now = new Date().toISOString();
  let marked = 0;
  let cleared = 0;
  for (const t of toMark) {
    const id = markId(t.topicId);
    const existing = byId.get(id);
    byId.set(id, {
      ...(existing || {}),
      id,
      topicId: String(t.topicId),
      chapterId: String(t.chapterId),
      subjectId: String(t.subjectId),
      topicName: t.topicName,
      status: 'Completed',
      completedOn: opts.completedOn || existing?.completedOn || todayStr(),
      markedBy: opts.by ?? existing?.markedBy,
      markedAt: now,
      note: opts.note ?? existing?.note,
    });
    if (!existing) marked++;
  }
  for (const topicId of toClear) {
    if (byId.delete(markId(topicId))) cleared++;
  }
  localStorage.setItem(STORE_KEYS.topicStatus, JSON.stringify(Array.from(byId.values())));
  return { marked, cleared };
}
