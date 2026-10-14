/**
 * StreakCard — Dashboard panel: current study streak, best streak, this
 * week's study days, and badges. All calculated from the daily logs.
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';
import { STORE_KEYS } from '../lib/storeKeys';
import { useStoredData } from '../lib/useStoredData';
import { todayStr, parseDateStr } from '../lib/dates';
import { computeStreak, computeBadges, weekStart, weekDays, LogLike, RevisionLike } from '../lib/studyStats';

export default function StreakCard() {
  const logs = useStoredData<LogLike[]>(STORE_KEYS.dailyLogs, []);
  const revisions = useStoredData<RevisionLike[]>(STORE_KEYS.revisions, []);
  const today = todayStr();

  const { streak, badges, week } = useMemo(() => {
    const streak = computeStreak(logs, today);
    return {
      streak,
      badges: computeBadges(logs, revisions, streak),
      week: weekDays(weekStart(today)),
    };
  }, [logs, revisions, today]);

  const earned = badges.filter((b) => b.earned).length;
  const message = streak.studiedToday
    ? 'Great work today — keep it going tomorrow!'
    : streak.current > 0
      ? `Study today to keep your ${streak.current}-day streak alive!`
      : 'Log a study session today to start a streak.';

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Streak numbers */}
        <div className="flex items-center gap-4 md:pr-6 md:border-r border-slate-100">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${streak.current > 0 ? 'bg-orange-50' : 'bg-slate-50'}`}>
            <Flame className={`h-8 w-8 ${streak.current > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 leading-none">
              {streak.current} <span className="text-base font-bold text-slate-500">day{streak.current === 1 ? '' : 's'}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Study streak · best {streak.best}</div>
          </div>
        </div>

        {/* This week */}
        <div className="flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">This week</div>
          <div className="flex gap-1.5">
            {week.map((d) => {
              const active = streak.activeDays.has(d);
              const isToday = d === today;
              const future = d > today;
              const label = parseDateStr(d).toLocaleDateString('en-GB', { weekday: 'narrow' });
              return (
                <div key={d} className="flex flex-col items-center gap-1" title={`${parseDateStr(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}: ${active ? 'studied' : future ? '—' : 'no study logged'}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 ${
                    active ? 'bg-orange-500 border-orange-500 text-white'
                      : future ? 'bg-white border-slate-100 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-400'
                  } ${isToday ? 'ring-2 ring-offset-1 ring-indigo-300' : ''}`}>
                    {active ? '✓' : ''}
                  </div>
                  <span className={`text-[10px] font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-slate-600 mt-2">{message}</p>
        </div>

        <Link to="/report" className="self-start md:self-center inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg px-3 py-2">
          <TrendingUp className="h-4 w-4" /> Weekly report
        </Link>
      </div>

      {/* Badges */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Badges · {earned} of {badges.length}
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b.id}
              title={`${b.label}: ${b.description}${b.earned ? ' ✓' : ' (locked)'}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                b.earned ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-400 grayscale'
              }`}
            >
              <span aria-hidden="true" className={b.earned ? '' : 'opacity-40'}>{b.emoji}</span>
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
