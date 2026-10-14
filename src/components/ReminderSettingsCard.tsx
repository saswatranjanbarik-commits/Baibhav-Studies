/**
 * ReminderSettingsCard — "Daily study reminder" panel on the Study Plan page.
 *
 * Lets each user choose a reminder time and days, optional reminders before
 * planned sessions, turn on browser notifications, and add the reminders to
 * their phone/computer calendar (.ics) so they work even when the app is closed.
 */
import React, { useEffect, useState } from 'react';
import { BellRing, CalendarPlus, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  ReminderSettings, DAY_LABELS, loadReminderSettings, saveReminderSettings, skipTodayIfPast,
  notificationStatus, requestNotificationPermission, showStudyNotification,
  buildDailyReminderIcs, buildPlanSessionsIcs, downloadIcs, PlanEntryLike, NotificationStatus,
} from '../lib/reminders';

interface Props {
  /** The study plan entries (used for the "add sessions to calendar" export). */
  planEntries: PlanEntryLike[];
}

export default function ReminderSettingsCard({ planEntries }: Props) {
  const { currentUser } = useAuth();
  const email = currentUser?.email || '';
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminderSettings(email));
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationStatus>(notificationStatus());
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);

  // Pick up changes made on another device.
  useEffect(() => {
    const reload = () => setSettings(loadReminderSettings(email));
    window.addEventListener('cloud_sync_update', reload);
    return () => window.removeEventListener('cloud_sync_update', reload);
  }, [email]);

  const update = (patch: Partial<ReminderSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const toggleDay = (d: number) =>
    update({ days: settings.days.includes(d) ? settings.days.filter((x) => x !== d) : [...settings.days, d] });

  const handleSave = () => {
    if (settings.enabled && settings.days.length === 0) {
      setMessage({ kind: 'warn', text: 'Pick at least one day.' });
      return;
    }
    saveReminderSettings(email, settings);
    skipTodayIfPast(settings.time);
    setMessage({ kind: 'ok', text: 'Reminder settings saved.' });
  };

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPerm(result);
    if (result === 'denied') {
      setMessage({ kind: 'warn', text: 'Notifications are blocked. Allow them in your browser\'s site settings, or use "Add to calendar".' });
    }
  };

  const handleTest = async () => {
    const ok = await showStudyNotification('📚 Study time (test)', settings.message, 'test');
    setMessage(ok
      ? { kind: 'ok', text: 'Test notification sent.' }
      : { kind: 'warn', text: 'Could not show a notification on this device. Use "Add to calendar" instead.' });
  };

  const handleDailyIcs = () => {
    saveReminderSettings(email, settings);
    downloadIcs('study-reminder.ics', buildDailyReminderIcs(settings, email, window.location.origin));
    setMessage({ kind: 'ok', text: 'Calendar file downloaded — open it to add the repeating reminder to your calendar.' });
  };

  const handleSessionsIcs = () => {
    const { ics, count } = buildPlanSessionsIcs(planEntries, settings.sessionLeadMinutes || 10, window.location.origin);
    if (count === 0) {
      setMessage({ kind: 'warn', text: 'No upcoming (not completed) plan sessions to add.' });
      return;
    }
    downloadIcs('study-plan-sessions.ics', ics);
    setMessage({ kind: 'ok', text: `Calendar file with ${count} upcoming session${count === 1 ? '' : 's'} downloaded.` });
  };

  const summary = settings.enabled
    ? `On · ${settings.time} · ${settings.days.length === 7 ? 'every day' : [...settings.days].sort().map((d) => DAY_LABELS[d]).join(', ')}`
    : 'Off';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-bold text-slate-900">
          <BellRing className="h-5 w-5 text-indigo-600" /> Daily study reminder
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-500">
          <span className={settings.enabled ? 'text-green-700 font-semibold' : ''}>{summary}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-5">
          {message && (
            <div className={`text-sm rounded-lg border p-2.5 flex gap-2 ${message.kind === 'ok' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              {message.kind === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
              {message.text}
            </div>
          )}

          {/* 1. When */}
          <section className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="font-semibold text-slate-800">Remind me to study every day</span>
            </label>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Time</label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => update({ time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Also remind me before planned sessions</label>
              <select
                value={settings.sessionLeadMinutes}
                onChange={(e) => update({ sessionLeadMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value={0}>Off</option>
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Days</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${settings.days.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}
                  >
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Message</label>
              <input
                type="text"
                value={settings.message}
                maxLength={120}
                onChange={(e) => update({ message: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg">
                Save reminder
              </button>
            </div>
          </section>

          {/* 2. How */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                <CalendarPlus className="h-4 w-4 text-emerald-600" /> Add to calendar <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5">Recommended for phones</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Works even when the app is closed. Open the downloaded file and choose "Add" in Apple, Google or Outlook calendar.
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleDailyIcs} className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5">
                  Daily reminder
                </button>
                <button onClick={handleSessionsIcs} className="text-sm font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg px-3 py-1.5">
                  Upcoming plan sessions
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3">
              <div className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                <BellRing className="h-4 w-4 text-indigo-600" /> Browser notifications
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Pop-ups while the app is open in a browser tab (it can be in the background).
              </p>
              {perm === 'granted' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-green-700">✓ Enabled on this device</span>
                  <button onClick={handleTest} className="text-sm font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg px-3 py-1.5 inline-flex items-center gap-1">
                    <Send className="h-3.5 w-3.5" /> Test
                  </button>
                </div>
              ) : perm === 'unsupported' ? (
                <span className="text-xs text-slate-500">Not supported in this browser — use "Add to calendar".</span>
              ) : perm === 'denied' ? (
                <span className="text-xs text-amber-700">Blocked — allow notifications for this site in browser settings.</span>
              ) : (
                <button onClick={handleEnableNotifications} className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5">
                  Enable on this device
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
