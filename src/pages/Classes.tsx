/**
 * Online Classes (v1.4) — schedule, join and complete tutoring classes.
 *
 * - Tutors (Teacher role) and Admins schedule classes and complete/cancel them.
 * - Everyone sees upcoming classes in their own time zone and can Join from
 *   10 minutes before the start. Video runs inside EduTrack (private room).
 */
import React, { useEffect, useState } from 'react';
import { MonitorPlay, Plus, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { STORE_KEYS } from '../lib/storeKeys';
import { useStoredData } from '../lib/useStoredData';
import { OnlineClass, upcomingClasses, pastClasses, upsertClasses } from '../lib/classes';
import ClassCard from '../components/ClassCard';
import ScheduleClassModal from '../components/ScheduleClassModal';
import CompleteClassModal from '../components/CompleteClassModal';

export default function Classes() {
  const { currentUser } = useAuth();
  const isHost = currentUser?.role === 'Teacher' || currentUser?.role === 'Admin';
  const classes = useStoredData<OnlineClass[]>(STORE_KEYS.classes, []);
  const syllabus = useStoredData<any[]>(STORE_KEYS.syllabus, []);
  const [now, setNow] = useState(Date.now());
  const [showSchedule, setShowSchedule] = useState(false);
  const [completing, setCompleting] = useState<OnlineClass | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);

  // Keep countdowns and the Join button up to date.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);

  const upcoming = upcomingClasses(classes, now);
  const past = pastClasses(classes, now);
  const pastShown = showAllPast ? past : past.slice(0, 10);

  const handleCancel = (c: OnlineClass) => {
    const reason = window.prompt(
      c.seriesId
        ? 'Reason for cancelling (optional).\n\nTip: to cancel ALL future classes in this weekly series, type "all" at the start, e.g. "all - holidays".'
        : 'Reason for cancelling (optional):',
      '',
    );
    if (reason === null) return; // pressed Cancel on the prompt
    const allFuture = !!c.seriesId && /^all\b/i.test(reason.trim());
    const targets = allFuture
      ? classes.filter((x) => x.seriesId === c.seriesId && x.status === 'Scheduled' && new Date(x.startUtc) >= new Date(c.startUtc))
      : [c];
    const cleanReason = reason.replace(/^all\b\s*-?\s*/i, '').trim() || undefined;
    upsertClasses(targets.map((x) => ({ ...x, status: 'Cancelled', cancelReason: cleanReason })));
    setNotice(`${targets.length} class${targets.length === 1 ? '' : 'es'} cancelled.`);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <MonitorPlay className="h-6 w-6 text-indigo-600" /> Online Classes
          </h2>
          <p className="text-sm text-slate-500 mt-1">Times are shown in your own time zone. Join opens 10 minutes before each class.</p>
        </div>
        {isHost && (
          <button onClick={() => setShowSchedule(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Schedule class
          </button>
        )}
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /><span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="mb-8">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Upcoming ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
            No classes scheduled.{isHost ? ' Use "Schedule class" to add one.' : ''}
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((c) => (
              <ClassCard key={c.id} cls={c} now={now} isHost={isHost} onComplete={setCompleting} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Past classes ({past.length})</h3>
        {past.length === 0 ? (
          <p className="text-sm text-slate-500">No past classes yet.</p>
        ) : (
          <div className="space-y-3">
            {pastShown.map((c) => (
              <ClassCard key={c.id} cls={c} now={now} isHost={isHost} onComplete={setCompleting} />
            ))}
            {past.length > pastShown.length && (
              <button onClick={() => setShowAllPast(true)} className="text-sm font-semibold text-indigo-600 hover:underline">Show all {past.length}</button>
            )}
          </div>
        )}
      </section>

      {showSchedule && (
        <ScheduleClassModal
          syllabus={syllabus}
          onClose={() => setShowSchedule(false)}
          onCreated={(msg) => { setShowSchedule(false); setNotice(msg); }}
        />
      )}
      {completing && (
        <CompleteClassModal
          cls={completing}
          syllabus={syllabus}
          onClose={() => setCompleting(null)}
          onDone={(msg) => { setCompleting(null); setNotice(msg); }}
        />
      )}
    </div>
  );
}
