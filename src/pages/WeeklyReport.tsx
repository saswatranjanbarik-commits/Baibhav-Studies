/**
 * Weekly Report — a printable summary of one week (Monday–Sunday):
 * study time per day and per subject, topics completed, doubts raised,
 * revisions, tasks and appreciation points.
 *
 * Everything is calculated from existing data; nothing is saved.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer, TrendingUp, Clock, CalendarCheck, CheckCircle2, Star, AlertCircle, RefreshCw, CheckSquare } from 'lucide-react';
import { STORE_KEYS } from '../lib/storeKeys';
import { useStoredData } from '../lib/useStoredData';
import { addDays, parseDateStr, todayStr } from '../lib/dates';
import {
  buildWeeklyReport, weekStart, formatMinutes, LogLike, RevisionLike, TaskLike, PointsLike,
} from '../lib/studyStats';
import DayBarChart from '../components/DayBarChart';
import { loadRevisionSettings, isCurrentRevision } from '../lib/revisionReset';

const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions) => parseDateStr(d).toLocaleDateString('en-GB', opts);

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">{icon}{label}</div>
      <div className="text-2xl font-black text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function WeeklyReport() {
  const logs = useStoredData<LogLike[]>(STORE_KEYS.dailyLogs, []);
  const allRevisions = useStoredData<RevisionLike[]>(STORE_KEYS.revisions, []);
  const revSettings = useStoredData(STORE_KEYS.revisionSettings, null); // re-render when it changes
  const revisions = useMemo(() => {
    const s = loadRevisionSettings();
    return allRevisions.filter((r) => isCurrentRevision(r, s));
  }, [allRevisions, revSettings]);
  const tasks = useStoredData<TaskLike[]>(STORE_KEYS.tasks, []);
  const points = useStoredData<PointsLike[]>(STORE_KEYS.appreciation, []);

  const thisWeek = weekStart(todayStr());
  const [start, setStart] = useState(thisWeek);

  const report = useMemo(
    () => buildWeeklyReport(start, { logs, revisions, tasks, points }),
    [start, logs, revisions, tasks, points],
  );
  const previous = useMemo(
    () => buildWeeklyReport(addDays(start, -7), { logs, revisions, tasks, points }),
    [start, logs, revisions, tasks, points],
  );

  const diff = report.totalMinutes - previous.totalMinutes;
  const trend = previous.totalMinutes === 0 && report.totalMinutes === 0
    ? undefined
    : diff === 0 ? 'same as last week'
    : `${diff > 0 ? '▲' : '▼'} ${formatMinutes(Math.abs(diff))} vs last week`;
  const maxSubject = Math.max(...report.subjects.map((s) => s.minutes), 1);
  const rangeLabel = `${fmtDay(report.start, { day: 'numeric', month: 'short' })} – ${fmtDay(report.end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const anyTimes = report.totalMinutes > 0;

  return (
    <div className="max-w-5xl mx-auto pb-12 print:pb-0">
      {/* Header + week navigation */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" /> Weekly Report
          </h2>
          <p className="text-sm text-slate-500 mt-1">{rangeLabel}{start === thisWeek ? ' · this week' : ''}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button onClick={() => setStart(addDays(start, -7))} className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setStart(thisWeek)} disabled={start === thisWeek} className="px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40">
            This week
          </button>
          <button onClick={() => setStart(addDays(start, 7))} disabled={start >= thisWeek} className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40" aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => window.print()} className="ml-2 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Tile icon={<Clock className="h-3.5 w-3.5" />} label="Study time" value={formatMinutes(report.totalMinutes)} sub={trend} />
        <Tile icon={<CalendarCheck className="h-3.5 w-3.5" />} label="Days studied" value={`${report.activeDays} / 7`} sub={`${report.sessions} session${report.sessions === 1 ? '' : 's'}`} />
        <Tile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Topics completed" value={String(report.topicsCompleted.length)} />
        <Tile icon={<Star className="h-3.5 w-3.5" />} label="Points earned" value={String(report.points)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Study time per day */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 break-inside-avoid">
          <h3 className="font-bold text-slate-900 mb-4">Study time per day</h3>
          {anyTimes ? (
            <DayBarChart
              formatValue={(v) => (v >= 60 ? `${Math.round((v / 60) * 10) / 10} h` : `${Math.round(v)}m`)}
              data={report.days.map((d) => ({
                key: d.date,
                label: fmtDay(d.date, { weekday: 'short' }),
                value: d.minutes,
                tooltip: `${fmtDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${formatMinutes(d.minutes)} · ${d.sessions} session${d.sessions === 1 ? '' : 's'}`,
              }))}
            />
          ) : (
            <p className="text-sm text-slate-500">
              {report.sessions > 0
                ? `${report.sessions} session${report.sessions === 1 ? '' : 's'} logged, but without start/end times — add "Time from/to" in the Daily Log to see study time here.`
                : 'No study logged this week.'}
            </p>
          )}
        </section>

        {/* Per subject (bars double as a table: name, bar, value) */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 break-inside-avoid">
          <h3 className="font-bold text-slate-900 mb-4">By subject</h3>
          {report.subjects.length === 0 ? (
            <p className="text-sm text-slate-500">No study logged this week.</p>
          ) : (
            <ul className="space-y-2.5">
              {report.subjects.map((s) => (
                <li key={s.name} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate text-slate-700" title={s.name}>{s.name}</span>
                  <span className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <span className="block h-full bg-indigo-500 rounded-full" style={{ width: `${anyTimes ? (s.minutes / maxSubject) * 100 : 0}%` }} />
                  </span>
                  <span className="text-slate-600 tabular-nums text-right whitespace-nowrap">
                    {anyTimes ? formatMinutes(s.minutes) + ' · ' : ''}{s.sessions}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revisions & tasks */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 break-inside-avoid">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><RefreshCw className="h-4 w-4 text-blue-500" /> Revisions this week</h3>
          <dl className="grid grid-cols-3 gap-2 text-center mb-5">
            <div className="rounded-lg bg-green-50 border border-green-100 p-2"><dt className="text-[11px] font-semibold text-green-800">Done</dt><dd className="text-xl font-black text-slate-900">{report.revisions.done}</dd></div>
            <div className="rounded-lg bg-red-50 border border-red-100 p-2"><dt className="text-[11px] font-semibold text-red-800">Missed</dt><dd className="text-xl font-black text-slate-900">{report.revisions.missed}</dd></div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2"><dt className="text-[11px] font-semibold text-slate-600">Coming up</dt><dd className="text-xl font-black text-slate-900">{report.revisions.upcoming}</dd></div>
          </dl>
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><CheckSquare className="h-4 w-4 text-green-500" /> Tasks due this week</h3>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-green-50 border border-green-100 p-2"><dt className="text-[11px] font-semibold text-green-800">Completed</dt><dd className="text-xl font-black text-slate-900">{report.tasks.completed}</dd></div>
            <div className="rounded-lg bg-red-50 border border-red-100 p-2"><dt className="text-[11px] font-semibold text-red-800">Overdue</dt><dd className="text-xl font-black text-slate-900">{report.tasks.overdue}</dd></div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2"><dt className="text-[11px] font-semibold text-slate-600">Open</dt><dd className="text-xl font-black text-slate-900">{report.tasks.open}</dd></div>
          </dl>
        </section>

        {/* Doubts */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 break-inside-avoid">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Doubts to discuss</h3>
          {report.doubts.length === 0 ? (
            <p className="text-sm text-slate-500">No doubts flagged this week.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.doubts.map((d, i) => (
                <li key={i} className="border-l-2 border-amber-300 pl-3">
                  <div className="font-semibold text-slate-800">{[d.subject, d.topic].filter(Boolean).join(' – ')}</div>
                  <div className="text-xs text-slate-500">{fmtDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}{d.notes ? ` · ${d.notes}` : ''}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Topics completed */}
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Topics completed ({report.topicsCompleted.length})</h3>
        {report.topicsCompleted.length === 0 ? (
          <p className="text-sm text-slate-500">No topics marked completed this week.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-1.5 pr-3 font-bold">Day</th>
                <th className="py-1.5 pr-3 font-bold">Subject</th>
                <th className="py-1.5 font-bold">Topic</th>
              </tr>
            </thead>
            <tbody>
              {report.topicsCompleted.map((t, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-3 text-slate-500 whitespace-nowrap">{fmtDay(t.date, { weekday: 'short', day: 'numeric' })}</td>
                  <td className="py-1.5 pr-3 text-slate-700">{t.subject}</td>
                  <td className="py-1.5 text-slate-900">{t.topic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
