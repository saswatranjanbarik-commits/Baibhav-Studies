/**
 * Study statistics — streaks, badges and the weekly report.
 *
 * Everything here is CALCULATED from data the app already stores (daily logs,
 * revisions, tasks, appreciation points). Nothing new is saved, so it can
 * never damage existing data.
 */
import { addDays, parseDateStr, toDateStr, todayStr } from './dates';

// ---- Shapes (only the fields we read) -------------------------------------

export interface LogLike {
  id: string;
  date: string;
  logType?: string;
  category?: string;
  classStatus?: string;
  timeFrom?: string;
  timeTo?: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string | string[];
  status?: string;
  notes?: string;
}
export interface RevisionLike { id: string; dateScheduled?: string; status?: string; subjectName?: string; topicName?: string }
export interface TaskLike { id: string; dueDate?: string; status?: string; title?: string }
export interface PointsLike { id: string; date?: string; points?: number | string; reason?: string }

// ---- Basics -----------------------------------------------------------------

const NON_STUDY_TYPES = new Set(['Play', 'Activity']);
const ABSENT_STATUSES = new Set(['Teacher Absent', 'Rescheduled', 'Canceled']);

/** A log counts as study if it isn't play/activity and the class actually happened. */
export function isStudyLog(log: LogLike): boolean {
  if (!log || !log.date) return false;
  if (log.logType && NON_STUDY_TYPES.has(log.logType)) return false;
  if (log.classStatus && ABSENT_STATUSES.has(log.classStatus)) return false;
  return true;
}

/** Minutes between "HH:MM" times (0 if missing or invalid). */
export function logMinutes(log: LogLike): number {
  if (!log.timeFrom || !log.timeTo) return 0;
  const [h1, m1] = log.timeFrom.split(':').map(Number);
  const [h2, m2] = log.timeTo.split(':').map(Number);
  const mins = h2 * 60 + m2 - (h1 * 60 + m1);
  return Number.isFinite(mins) && mins > 0 && mins < 16 * 60 ? mins : 0;
}

export function topicText(log: LogLike): string {
  return Array.isArray(log.topicName) ? log.topicName.join(', ') : log.topicName || '';
}

/** "1 h 25 min", "40 min", "0 min". */
export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

// ---- Streaks ----------------------------------------------------------------

export interface StreakInfo {
  /** Consecutive study days up to today (or yesterday, if today isn't done yet). */
  current: number;
  best: number;
  studiedToday: boolean;
  activeDays: Set<string>;
}

export function computeStreak(logs: LogLike[], today = todayStr()): StreakInfo {
  const activeDays = new Set(logs.filter(isStudyLog).map((l) => l.date));
  const studiedToday = activeDays.has(today);

  // Current streak: count back from today, or from yesterday if today is still open.
  let current = 0;
  let day = studiedToday ? today : addDays(today, -1);
  while (activeDays.has(day)) { current++; day = addDays(day, -1); }

  // Best streak ever.
  let best = 0;
  const sorted = Array.from(activeDays).filter((d) => d <= today).sort();
  let run = 0;
  let prev = '';
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), studiedToday, activeDays };
}

// ---- Weeks --------------------------------------------------------------------

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const d = parseDateStr(date);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return toDateStr(d);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ---- Badges -------------------------------------------------------------------

export interface Badge { id: string; label: string; description: string; earned: boolean; emoji: string }

export function computeBadges(logs: LogLike[], revisions: RevisionLike[], streak: StreakInfo): Badge[] {
  const study = logs.filter(isStudyLog);
  const completed = study.filter((l) => l.status === 'Completed').length;
  const practice = logs.filter((l) => /Practice - Flashcards|Assessment - Quiz/.test(l.notes || '')).length;
  const revDone = revisions.filter((r) => r.status === 'Completed').length;

  const b = (id: string, emoji: string, label: string, description: string, earned: boolean): Badge =>
    ({ id, emoji, label, description, earned });

  return [
    b('first', '🌱', 'First step', 'Log your first study session', study.length >= 1),
    b('streak3', '🔥', '3-day streak', 'Study 3 days in a row', streak.best >= 3),
    b('streak7', '⚡', 'Week warrior', 'Study 7 days in a row', streak.best >= 7),
    b('streak14', '🏅', 'Fortnight focus', 'Study 14 days in a row', streak.best >= 14),
    b('streak30', '🏆', 'Monthly master', 'Study 30 days in a row', streak.best >= 30),
    b('topics10', '📘', '10 topics', 'Complete 10 topics', completed >= 10),
    b('topics50', '📚', '50 topics', 'Complete 50 topics', completed >= 50),
    b('topics100', '🎓', '100 topics', 'Complete 100 topics', completed >= 100),
    b('revise10', '🔁', 'Revision pro', 'Finish 10 revisions', revDone >= 10),
    b('practice10', '🎯', 'Quiz whiz', 'Do 10 flashcard or quiz sessions', practice >= 10),
  ];
}

// ---- Weekly report ------------------------------------------------------------

export interface WeeklyReport {
  start: string;
  end: string;
  days: { date: string; minutes: number; sessions: number }[];
  totalMinutes: number;
  sessions: number;
  activeDays: number;
  subjects: { name: string; minutes: number; sessions: number }[];
  topicsCompleted: { date: string; subject: string; topic: string }[];
  doubts: { date: string; subject: string; topic: string; notes: string }[];
  revisions: { done: number; missed: number; upcoming: number };
  tasks: { completed: number; open: number; overdue: number };
  points: number;
}

export function buildWeeklyReport(
  start: string,
  data: { logs: LogLike[]; revisions: RevisionLike[]; tasks: TaskLike[]; points: PointsLike[] },
  today = todayStr(),
): WeeklyReport {
  const dates = weekDays(start);
  const end = dates[6];
  const inWeek = (d?: string) => !!d && d >= start && d <= end;
  const weekLogs = data.logs.filter((l) => inWeek(l.date) && isStudyLog(l));

  const days = dates.map((date) => {
    const ls = weekLogs.filter((l) => l.date === date);
    return { date, sessions: ls.length, minutes: ls.reduce((n, l) => n + logMinutes(l), 0) };
  });

  const bySubject = new Map<string, { name: string; minutes: number; sessions: number }>();
  for (const l of weekLogs) {
    const name = l.subjectName || (l.logType ? `${l.logType} (no subject)` : 'Other');
    const s = bySubject.get(name) || { name, minutes: 0, sessions: 0 };
    s.minutes += logMinutes(l);
    s.sessions += 1;
    bySubject.set(name, s);
  }
  const subjects = Array.from(bySubject.values()).sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions);

  const byDateThenSubject = (a: { date: string; subject: string }, b: { date: string; subject: string }) =>
    a.date.localeCompare(b.date) || a.subject.localeCompare(b.subject);

  const topicsCompleted = weekLogs
    .filter((l) => l.status === 'Completed' && (l.subjectName || topicText(l)))
    .map((l) => ({ date: l.date, subject: l.subjectName || '', topic: topicText(l) || l.chapterName || '' }))
    .sort(byDateThenSubject);

  const doubts = weekLogs
    .filter((l) => l.status === 'Have Doubt')
    .map((l) => ({ date: l.date, subject: l.subjectName || '', topic: topicText(l) || l.chapterName || '', notes: l.notes || '' }))
    .sort(byDateThenSubject);

  const weekRevs = data.revisions.filter((r) => inWeek(r.dateScheduled));
  const revisions = {
    done: weekRevs.filter((r) => r.status === 'Completed').length,
    missed: weekRevs.filter((r) => r.status !== 'Completed' && (r.dateScheduled as string) < today).length,
    upcoming: weekRevs.filter((r) => r.status !== 'Completed' && (r.dateScheduled as string) >= today).length,
  };

  const weekTasks = data.tasks.filter((t) => inWeek(t.dueDate));
  const tasks = {
    completed: weekTasks.filter((t) => t.status === 'Completed').length,
    open: weekTasks.filter((t) => t.status !== 'Completed' && (t.dueDate as string) >= today).length,
    overdue: weekTasks.filter((t) => t.status !== 'Completed' && (t.dueDate as string) < today).length,
  };

  const points = data.points.filter((p) => inWeek(p.date)).reduce((n, p) => n + (Number(p.points) || 0), 0);

  return {
    start, end, days,
    totalMinutes: days.reduce((n, d) => n + d.minutes, 0),
    sessions: weekLogs.length,
    activeDays: days.filter((d) => d.sessions > 0).length,
    subjects, topicsCompleted, doubts, revisions, tasks, points,
  };
}
