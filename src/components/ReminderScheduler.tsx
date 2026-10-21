/**
 * ReminderScheduler — runs in the background while the app is open.
 *
 * Every 30 seconds it checks the signed-in user's reminder settings
 * (set on the Study Plan page) and:
 *  - at the daily reminder time → shows a browser notification + banner
 *  - N minutes before a planned session that has a start time → notification + banner
 *  - if the app is opened AFTER today's reminder time → shows the banner only
 *
 * Each reminder fires at most once per day per device. That record is kept in
 * this browser only (key "edutrack_reminders_fired", not synced).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { readStore, STORE_KEYS } from '../lib/storeKeys';
import { OnlineClass, upcomingClasses, startMs } from '../lib/classes';
import { todayStr } from '../lib/dates';
import {
  loadReminderSettings, getTodaysPendingPlan, describeEntry, showStudyNotification, PlanEntryLike,
  loadFired, saveFired,
} from '../lib/reminders';

const CHECK_EVERY_MS = 30_000;
/** A daily reminder counts as "on time" (→ notification) within this many minutes. */
const ON_TIME_WINDOW_MIN = 10;

interface Banner { id: string; title: string; lines: string[]; link?: string; linkLabel?: string }

function nowHHMM(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export default function ReminderScheduler() {
  const { currentUser } = useAuth();
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (!currentUser?.email) return;

    const check = () => {
      const settings = loadReminderSettings(currentUser.email);
      const plan = getTodaysPendingPlan(readStore<PlanEntryLike[]>(STORE_KEYS.studyPlan, []));
      const now = new Date();
      const nowMin = minutesOf(nowHHMM(now));
      const fired = loadFired();
      let changed = false;

      // ---- Daily reminder --------------------------------------------------
      if (settings.enabled && settings.days.includes(now.getDay())) {
        const key = 'daily';
        const due = minutesOf(settings.time);
        if (!fired.has(key) && nowMin >= due) {
          const lines = plan.length
            ? [`Today's plan (${plan.length}):`, ...plan.slice(0, 4).map(describeEntry), ...(plan.length > 4 ? [`…and ${plan.length - 4} more`] : [])]
            : ['No sessions planned for today — pick a topic to revise!'];
          if (nowMin - due <= ON_TIME_WINDOW_MIN) {
            showStudyNotification('📚 Study time', [settings.message, ...lines].join('\n'), 'daily-study');
          }
          setBanner({ id: key, title: settings.message, lines });
          fired.add(key);
          changed = true;
        }
      }

      // ---- Before each planned session -----------------------------------
      if (settings.sessionLeadMinutes > 0) {
        for (const e of plan) {
          if (!e.timeFrom) continue;
          const key = `session:${e.id}`;
          const start = minutesOf(e.timeFrom);
          if (!fired.has(key) && nowMin >= start - settings.sessionLeadMinutes && nowMin <= start) {
            const mins = start - nowMin;
            const title = mins > 0 ? `Starting in ${mins} min` : 'Starting now';
            showStudyNotification(`⏰ ${title}`, describeEntry(e), key);
            setBanner({ id: key, title: `${title}: ${describeEntry(e).replace(/^\d\d:\d\d /, '')}`, lines: [] });
            fired.add(key);
            changed = true;
          }
        }
      }

      // ---- Online classes: 10 minutes before (v1.4) -------------------------
      for (const c of upcomingClasses(readStore<OnlineClass[]>(STORE_KEYS.classes, []), now.getTime())) {
        const key = `class:${c.id}`;
        const minsToStart = Math.round((startMs(c) - now.getTime()) / 60_000);
        if (!fired.has(key) && minsToStart <= 10 && minsToStart >= -5) {
          const title = minsToStart > 0 ? `Online class in ${minsToStart} min` : 'Online class starting now';
          showStudyNotification(`🎥 ${title}`, c.title, key, '/classes');
          setBanner({ id: key, title: `${title}: ${c.title}`, lines: [], link: '/classes', linkLabel: 'Go to class' });
          fired.add(key);
          changed = true;
        }
      }

      if (changed) saveFired(fired);
    };

    check();
    const interval = setInterval(check, CHECK_EVERY_MS);
    // Re-check as soon as settings or the plan change (e.g. from another device).
    window.addEventListener('cloud_sync_update', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('cloud_sync_update', check);
    };
  }, [currentUser?.email]);

  if (!banner) return null;

  return (
    <div className="bg-indigo-50 border-b border-indigo-200 text-indigo-900 text-sm px-4 py-2 flex items-start gap-3">
      <AlarmClock className="h-4 w-4 mt-0.5 shrink-0 text-indigo-600" />
      <div className="flex-1">
        <div className="font-semibold">{banner.title}</div>
        {banner.lines.length > 0 && (
          <div className="text-xs text-indigo-800 mt-0.5">{banner.lines.join(' · ')}</div>
        )}
      </div>
      <Link
        to={banner.link || '/plan'}
        onClick={() => setBanner(null)}
        className="text-xs font-semibold bg-white border border-indigo-300 rounded px-2 py-1 hover:bg-indigo-100 shrink-0"
      >
        {banner.linkLabel || 'Open plan'}
      </Link>
      <button onClick={() => setBanner(null)} className="p-1 hover:bg-indigo-100 rounded shrink-0" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
